import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db, owned
from .identity import current_user
from .models import Holding, Instrument, Portfolio, User, WatchItem
from .schemas import (
    HoldingInput,
    HoldingUpdate,
    HoldingView,
    InstrumentInput,
    InstrumentView,
    Message,
    PortfolioDetail,
    PortfolioInput,
    PortfolioView,
    WatchInput,
    WatchView,
)
from .valuations import summarize, value_holding

router = APIRouter(tags=["portfolios"])


def resolve_instrument(db: Session, data: InstrumentInput, user_id: str) -> Instrument:
    identity = data.model_dump(exclude={"name"})
    instrument = db.scalar(select(Instrument).filter_by(user_id=user_id, **identity))
    if instrument:
        if instrument.name.casefold() != data.name.casefold():
            raise HTTPException(
                409, "This identifier already has a different name. Use the existing instrument details."
            )
        return instrument
    instrument = Instrument(user_id=user_id, **data.model_dump())
    db.add(instrument)
    db.flush()
    return instrument


def add_holding(db: Session, portfolio: Portfolio, data: HoldingInput) -> Holding:
    instrument = resolve_instrument(db, data.instrument, portfolio.user_id)
    if db.scalar(
        select(Holding).where(Holding.portfolio_id == portfolio.id, Holding.instrument_id == instrument.id)
    ):
        raise HTTPException(409, "This holding already exists. Edit its quantity instead.")
    holding = Holding(
        user_id=portfolio.user_id,
        portfolio_id=portfolio.id,
        instrument_id=instrument.id,
        **data.model_dump(exclude={"instrument"}),
    )
    db.add(holding)
    db.flush()
    return holding


def detail(db: Session, p: Portfolio):
    records = db.execute(
        select(Holding, Instrument)
        .join(Instrument, Holding.instrument_id == Instrument.id)
        .where(Holding.portfolio_id == p.id, Holding.user_id == p.user_id)
        .order_by(Instrument.name)
    ).all()
    return summarize(p, [value_holding(h, i, p.is_demo) for h, i in records])


@router.get("/portfolios", response_model=list[PortfolioView])
def list_portfolios(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Portfolio).where(Portfolio.user_id == user.id).order_by(Portfolio.name)).all()


@router.post("/portfolios", response_model=PortfolioView, status_code=201)
def create_portfolio(data: PortfolioInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = Portfolio(user_id=user.id, name=data.name)
    db.add(p)
    db.commit()
    return p


@router.get("/portfolios/{portfolio_id}", response_model=PortfolioDetail)
def get_portfolio(portfolio_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return detail(db, owned(db, Portfolio, portfolio_id, user.id))


@router.patch("/portfolios/{portfolio_id}", response_model=PortfolioView)
def rename_portfolio(
    portfolio_id: str, data: PortfolioInput, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    p = owned(db, Portfolio, portfolio_id, user.id)
    p.name = data.name
    if p.is_demo:
        raise HTTPException(409, "Example portfolios are read-only")
    db.commit()
    return p


@router.post("/portfolios/{portfolio_id}/holdings", response_model=HoldingView, status_code=201)
def create_holding(
    portfolio_id: str, data: HoldingInput, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    p = owned(db, Portfolio, portfolio_id, user.id)
    if p.is_demo:
        raise HTTPException(409, "Example portfolios are read-only. Create your own portfolio.")
    h = add_holding(db, p, data)
    db.commit()
    return value_holding(h, db.get(Instrument, h.instrument_id))


@router.get("/holdings/{holding_id}", response_model=HoldingView)
def get_holding(holding_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    h = owned(db, Holding, holding_id, user.id)
    return value_holding(h, db.get(Instrument, h.instrument_id), db.get(Portfolio, h.portfolio_id).is_demo)


@router.put("/holdings/{holding_id}", response_model=HoldingView)
def edit_holding(
    holding_id: str, data: HoldingUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    h = db.scalar(
        select(Holding).where(Holding.id == holding_id, Holding.user_id == user.id).with_for_update()
    )
    if not h:
        raise HTTPException(404, "Record not found")
    if db.get(Portfolio, h.portfolio_id).is_demo:
        raise HTTPException(409, "Example portfolios are read-only")
    if h.version != data.version:
        raise HTTPException(409, "This holding changed elsewhere. Reload before editing.")
    instrument = resolve_instrument(db, data.instrument, user.id)
    h.instrument_id = instrument.id
    for key, value in data.model_dump(exclude={"instrument", "version"}).items():
        setattr(h, key, value)
    h.version += 1
    db.commit()
    return value_holding(h, instrument)


@router.delete("/holdings/{holding_id}", response_model=Message)
def remove_holding(holding_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    h = owned(db, Holding, holding_id, user.id)
    if db.get(Portfolio, h.portfolio_id).is_demo:
        raise HTTPException(409, "Example portfolios are read-only")
    db.delete(h)
    db.commit()
    return {"detail": "Holding removed"}


@router.get("/instruments", response_model=list[InstrumentView])
def instruments(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Instrument).where(Instrument.user_id == user.id).order_by(Instrument.name)).all()


@router.get("/watchlist", response_model=list[WatchView])
def watchlist(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.execute(
        select(WatchItem, Instrument)
        .join(Instrument, WatchItem.instrument_id == Instrument.id)
        .where(WatchItem.user_id == user.id)
        .order_by(Instrument.name)
    ).all()
    return [WatchView(id=w.id, instrument=InstrumentView.model_validate(i)) for w, i in rows]


@router.post("/watchlist", response_model=WatchView, status_code=201)
def add_watch(data: WatchInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    i = resolve_instrument(db, data.instrument, user.id)
    w = WatchItem(user_id=user.id, instrument_id=i.id)
    db.add(w)
    db.commit()
    return WatchView(id=w.id, instrument=InstrumentView.model_validate(i))


@router.delete("/watchlist/{item_id}", response_model=Message)
def delete_watch(item_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(owned(db, WatchItem, item_id, user.id))
    db.commit()
    return {"detail": "Removed from watchlist"}


CSV_FIELDS = [
    "name",
    "category",
    "identifier",
    "venue",
    "currency",
    "quantity",
    "acquired_at",
    "acquisition_price",
    "acquisition_source",
    "price",
    "valued_at",
    "valuation_observed_at",
    "source",
    "fx_rate",
    "fx_at",
    "fx_source",
]


def safe_cell(value):
    s = "" if value is None else str(value)
    return "'" + s if s.lstrip().startswith(("=", "+", "-", "@", "\t", "\r")) else s


@router.get("/portfolios/{portfolio_id}/export")
def export(portfolio_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = owned(db, Portfolio, portfolio_id, user.id)
    result = detail(db, p)
    output = io.StringIO()
    writer = csv.DictWriter(output, CSV_FIELDS)
    writer.writeheader()
    for h in result.holdings:
        values = {
            **h.instrument.model_dump(exclude={"id"}),
            **h.model_dump(
                include={
                    "quantity",
                    "acquired_at",
                    "acquisition_price",
                    "acquisition_source",
                    "price",
                    "valued_at",
                    "valuation_observed_at",
                    "source",
                    "fx_rate",
                    "fx_at",
                    "fx_source",
                }
            ),
        }
        if h.instrument.currency == "EUR":
            values.update(fx_rate=None, fx_at=None, fx_source=None)
        writer.writerow({k: safe_cell(v) for k, v in values.items()})
    return Response(
        output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="lokifi-holdings.csv"'},
    )


@router.get("/account/export")
def account_export(user: User = Depends(current_user), db: Session = Depends(get_db)):
    ps = db.scalars(select(Portfolio).where(Portfolio.user_id == user.id)).all()
    from fastapi.responses import JSONResponse

    from .chat import get_conversation
    from .models import Conversation

    conversations = db.scalars(select(Conversation).where(Conversation.user_id == user.id)).all()

    return JSONResponse(
        {
            "version": 2,
            "name": user.name,
            "email": user.email,
            "portfolios": [detail(db, p).model_dump(mode="json") for p in ps],
            "watchlist": [w.model_dump(mode="json") for w in watchlist(user, db)],
            "conversations": [get_conversation(c.id, user).model_dump(mode="json") for c in conversations],
        },
        headers={"Content-Disposition": 'attachment; filename="lokifi-records.json"'},
    )


@router.post("/demo", response_model=PortfolioView, status_code=201)
def demo(user: User = Depends(current_user), db: Session = Depends(get_db)):
    existing = db.scalar(select(Portfolio).where(Portfolio.user_id == user.id, Portfolio.is_demo.is_(True)))
    if existing:
        return existing
    p = Portfolio(user_id=user.id, name="Example portfolio", is_demo=True)
    db.add(p)
    db.flush()
    today = date.today().isoformat()
    for name, kind, code, qty, price, currency, rate in [
        ("Example global equity fund", "etf", "DEMO-GLOBAL", "100", "112.50", "EUR", None),
        ("Example technology company", "stock", "DEMO-TECH", "25", "180", "USD", "0.90"),
        ("Example digital asset", "crypto", "DEMO-COIN", "0.05", "60000", "EUR", None),
        ("Example cash reserve", "cash", "DEMO-CASH", "2000", "1", "EUR", None),
    ]:
        add_holding(
            db,
            p,
            HoldingInput.model_validate(
                {
                    "instrument": {
                        "name": name,
                        "category": kind,
                        "identifier": code,
                        "venue": "EXAMPLE",
                        "currency": currency,
                    },
                    "quantity": qty,
                    "acquired_at": None,
                    "acquisition_price": None,
                    "acquisition_source": None,
                    "price": price,
                    "valued_at": today,
                    "valuation_observed_at": None,
                    "source": "Synthetic example — not market data",
                    "fx_rate": rate,
                    "fx_at": today if rate else None,
                    "fx_source": "Synthetic example" if rate else None,
                }
            ),
        )
    db.commit()
    return p
