"""
Financial Modeling Prep API endpoints
"""

import httpx
from app.core.config import Settings
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter()
settings = Settings()


class CompanyProfile(BaseModel):
    """Company profile data"""

    symbol: str
    companyName: str
    price: float | None = None
    beta: float | None = None
    volAvg: int | None = None
    mktCap: float | None = None
    lastDiv: float | None = None
    range: str | None = None
    changes: float | None = None
    currency: str | None = None
    cik: str | None = None
    isin: str | None = None
    cusip: str | None = None
    exchange: str | None = None
    exchangeShortName: str | None = None
    industry: str | None = None
    website: str | None = None
    description: str | None = None
    ceo: str | None = None
    sector: str | None = None
    country: str | None = None
    fullTimeEmployees: str | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    zip: str | None = None
    dcfDiff: float | None = None
    dcf: float | None = None
    image: str | None = None
    ipoDate: str | None = None
    defaultImage: bool | None = None
    isEtf: bool | None = None
    isActivelyTrading: bool | None = None
    isAdr: bool | None = None
    isFund: bool | None = None


@router.get("/fmp/profile/{symbol}")
async def get_company_profile(symbol: str):
    """
    Get detailed company profile from Financial Modeling Prep

    - **symbol**: Stock symbol (e.g., AAPL, MSFT, GOOGL)
    """
    if not settings.FMP_KEY:
        raise HTTPException(status_code=503, detail="FMP API key not configured")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://financialmodelingprep.com/api/v3/profile/{symbol.upper()}",
                params={"apikey": settings.FMP_KEY},
                timeout=10.0,
            )
            response.raise_for_status()
            data = response.json()

            if not data:
                raise HTTPException(
                    status_code=404, detail=f"Company profile not found for {symbol}"
                )

            return data[0] if isinstance(data, list) else data

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(
                status_code=404, detail=f"Company profile not found for {symbol}"
            )
        raise HTTPException(
            status_code=e.response.status_code, detail=f"FMP API error: {e}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch company profile: {str(e)}"
        )


@router.get("/fmp/quote/{symbol}")
async def get_stock_quote(symbol: str):
    """
    Get real-time stock quote from FMP
    """
    if not settings.FMP_KEY:
        raise HTTPException(status_code=503, detail="FMP API key not configured")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://financialmodelingprep.com/api/v3/quote/{symbol.upper()}",
                params={"apikey": settings.FMP_KEY},
                timeout=10.0,
            )
            response.raise_for_status()
            data = response.json()

            if not data:
                raise HTTPException(
                    status_code=404, detail=f"Quote not found for {symbol}"
                )

            return data[0] if isinstance(data, list) else data

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code, detail=f"FMP API error: {e}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch quote: {str(e)}")


@router.get("/fmp/income-statement/{symbol}")
async def get_income_statement(
    symbol: str,
    period: str = Query(
        "annual", regex="^(annual|quarter)$", description="Reporting period"
    ),
    limit: int = Query(10, ge=1, le=100, description="Number of periods to return"),
):
    """
    Get income statement data from FMP
    """
    if not settings.FMP_KEY:
        raise HTTPException(status_code=503, detail="FMP API key not configured")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://financialmodelingprep.com/api/v3/income-statement/{symbol.upper()}",
                params={"period": period, "limit": limit, "apikey": settings.FMP_KEY},
                timeout=10.0,
            )
            response.raise_for_status()
            return response.json()

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code, detail=f"FMP API error: {e}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch income statement: {str(e)}"
        )


@router.get("/fmp/balance-sheet/{symbol}")
async def get_balance_sheet(
    symbol: str,
    period: str = Query(
        "annual", regex="^(annual|quarter)$", description="Reporting period"
    ),
    limit: int = Query(10, ge=1, le=100, description="Number of periods to return"),
):
    """
    Get balance sheet data from FMP
    """
    if not settings.FMP_KEY:
        raise HTTPException(status_code=503, detail="FMP API key not configured")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://financialmodelingprep.com/api/v3/balance-sheet-statement/{symbol.upper()}",
                params={"period": period, "limit": limit, "apikey": settings.FMP_KEY},
                timeout=10.0,
            )
            response.raise_for_status()
            return response.json()

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code, detail=f"FMP API error: {e}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch balance sheet: {str(e)}"
        )


@router.get("/fmp/cash-flow/{symbol}")
async def get_cash_flow(
    symbol: str,
    period: str = Query(
        "annual", regex="^(annual|quarter)$", description="Reporting period"
    ),
    limit: int = Query(10, ge=1, le=100, description="Number of periods to return"),
):
    """
    Get cash flow statement data from FMP
    """
    if not settings.FMP_KEY:
        raise HTTPException(status_code=503, detail="FMP API key not configured")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://financialmodelingprep.com/api/v3/cash-flow-statement/{symbol.upper()}",
                params={"period": period, "limit": limit, "apikey": settings.FMP_KEY},
                timeout=10.0,
            )
            response.raise_for_status()
            return response.json()

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code, detail=f"FMP API error: {e}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch cash flow: {str(e)}"
        )


@router.get("/fmp/key-metrics/{symbol}")
async def get_key_metrics(
    symbol: str,
    period: str = Query(
        "annual", regex="^(annual|quarter)$", description="Reporting period"
    ),
    limit: int = Query(10, ge=1, le=100, description="Number of periods to return"),
):
    """
    Get key financial metrics from FMP
    """
    if not settings.FMP_KEY:
        raise HTTPException(status_code=503, detail="FMP API key not configured")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://financialmodelingprep.com/api/v3/key-metrics/{symbol.upper()}",
                params={"period": period, "limit": limit, "apikey": settings.FMP_KEY},
                timeout=10.0,
            )
            response.raise_for_status()
            return response.json()

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code, detail=f"FMP API error: {e}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch key metrics: {str(e)}"
        )
