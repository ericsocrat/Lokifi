from collections import defaultdict
from datetime import date
from decimal import Decimal, localcontext

from .models import Holding, Instrument
from .schemas import HoldingView, InstrumentView, PortfolioDetail


def amount(value: Decimal | None) -> str | None:
    return format(value, "f") if value is not None else None


def value_holding(h: Holding, i: Instrument, is_demo: bool = False) -> HoldingView:
    with localcontext() as ctx:
        ctx.prec = 128
        original = h.quantity * h.price if h.price is not None else None
        rate = Decimal(1) if i.currency == "EUR" else h.fx_rate
        eur = original * rate if original is not None and rate is not None else None
        status = "missing_price" if original is None else "missing_fx" if rate is None else "valued"
        stale = any(d and (date.today() - d).days > 7 for d in (h.valued_at, h.fx_at))
        return HoldingView(
            id=h.id,
            is_demo=is_demo,
            instrument=InstrumentView.model_validate(i),
            quantity=amount(h.quantity),
            price=amount(h.price),
            valued_at=h.valued_at,
            source=h.source,
            fx_rate=amount(rate),
            fx_at=h.fx_at,
            fx_source=h.fx_source,
            original_value=amount(original),
            eur_value=amount(eur),
            status=status,
            stale=bool(stale),
            version=h.version,
        )


def summarize(portfolio, holdings: list[HoldingView]) -> PortfolioDetail:
    with localcontext() as ctx:
        ctx.prec = 128
        categories = defaultdict(Decimal)
        total = Decimal(0)
        for h in holdings:
            if h.eur_value is not None:
                v = Decimal(h.eur_value)
                total += v
                categories[h.instrument.category] += v
        missing = sum(h.eur_value is None for h in holdings)
        return PortfolioDetail(
            id=portfolio.id,
            name=portfolio.name,
            is_demo=portfolio.is_demo,
            holdings=holdings,
            valued_subtotal=f"{total:.2f}",
            total=f"{total:.2f}" if not missing else None,
            complete=not missing,
            missing_count=missing,
            stale_count=sum(h.stale for h in holdings),
            allocation=[
                {
                    "category": c,
                    "eur_value": f"{v:.2f}",
                    "percentage": f"{v / total * 100:.2f}" if total else "0.00",
                }
                for c, v in sorted(categories.items(), key=lambda item: item[1], reverse=True)
            ],
        )
