import csv
import hashlib
import io
import json
from datetime import timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db, owned
from .identity import current_user
from .models import ImportBatch, Portfolio, User, now
from .portfolios import CSV_FIELDS, add_holding, detail
from .schemas import CSVInput, HoldingInput, ImportPreview, PortfolioDetail

router = APIRouter(tags=["imports"])


def parse_csv(content: str) -> list[HoldingInput]:
    reader = csv.DictReader(io.StringIO(content.lstrip("\ufeff")), strict=True)
    if reader.fieldnames != CSV_FIELDS:
        raise HTTPException(
            422,
            "Use the template headers in their original order; duplicate or unknown columns are rejected.",
        )
    rows = []
    identities = set()
    try:
        for line, row in enumerate(reader, start=2):
            if line > 501:
                raise HTTPException(422, "Import at most 500 holdings at a time")
            if None in row or any(v is None for v in row.values()):
                raise HTTPException(422, f"Row {line}: wrong number of columns")
            data = {key: value.strip() for key, value in row.items()}
            instrument = {key: data.pop(key) for key in CSV_FIELDS[:5]}
            for key in (
                "acquired_at",
                "acquisition_price",
                "acquisition_source",
                "price",
                "valued_at",
                "valuation_observed_at",
                "fx_rate",
                "fx_at",
                "fx_source",
            ):
                data[key] = data[key] or None
            try:
                parsed = HoldingInput.model_validate({"instrument": instrument, **data})
            except ValidationError as e:
                err = e.errors()[0]
                raise HTTPException(
                    422, f"Row {line}, {'.'.join(map(str, err['loc']))}: {err['msg']}"
                ) from None
            identity = tuple(parsed.instrument.model_dump(exclude={"name"}).values())
            if identity in identities:
                raise HTTPException(
                    422, f"Row {line}: duplicate instrument. Combine its quantity before importing."
                )
            identities.add(identity)
            rows.append(parsed)
    except csv.Error:
        raise HTTPException(422, "Malformed CSV quoting") from None
    if not rows:
        raise HTTPException(422, "Add at least one holding below the template header")
    return rows


@router.get("/imports/template")
def template():
    return Response(
        ",".join(CSV_FIELDS) + "\r\n",
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="lokifi-template.csv"'},
    )


@router.post("/portfolios/{portfolio_id}/imports/preview", response_model=ImportPreview)
def preview(
    portfolio_id: str, data: CSVInput, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    p = owned(db, Portfolio, portfolio_id, user.id)
    if p.is_demo:
        raise HTTPException(409, "Example portfolios are read-only")
    rows = parse_csv(data.csv_text)
    values = [r.model_dump(mode="json") for r in rows]
    for row in values:
        for key in ("quantity", "acquisition_price", "price", "fx_rate"):
            if row[key] is not None:
                row[key] = format(Decimal(row[key]).normalize(), "f")
    canonical = sorted(values, key=lambda r: json.dumps(r["instrument"], sort_keys=True))
    fingerprint = hashlib.sha256(json.dumps(canonical, sort_keys=True).encode()).hexdigest()
    batch = db.scalar(
        select(ImportBatch).where(ImportBatch.portfolio_id == p.id, ImportBatch.fingerprint == fingerprint)
    )
    if batch and batch.committed:
        raise HTTPException(409, "This file has already been imported")
    # Validate conflicts using a savepoint. No preview writes become holdings.
    with db.begin_nested() as trial:
        for row in rows:
            add_holding(db, p, row)
        trial.rollback()
    if not batch:
        batch = ImportBatch(user_id=user.id, portfolio_id=p.id, fingerprint=fingerprint, rows=values)
        db.add(batch)
    batch.created_at = now()
    db.commit()
    return ImportPreview(id=batch.id, row_count=len(rows), rows=rows)


@router.post("/imports/{batch_id}/commit", response_model=PortfolioDetail)
def commit(batch_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    batch = db.scalar(
        select(ImportBatch)
        .where(ImportBatch.id == batch_id, ImportBatch.user_id == user.id)
        .with_for_update()
    )
    if batch is None:
        raise HTTPException(404, "Import not found")
    if batch.committed:
        raise HTTPException(409, "This import has already been committed")
    if batch.created_at < now() - timedelta(minutes=30):
        raise HTTPException(409, "Preview expired. Upload the file again.")
    p = owned(db, Portfolio, batch.portfolio_id, user.id)
    for row in batch.rows:
        add_holding(db, p, HoldingInput.model_validate(row))
    batch.committed = True
    db.commit()
    return detail(db, p)
