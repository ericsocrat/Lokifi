from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

Money = Annotated[Decimal, Field(ge=0, max_digits=28, decimal_places=10, allow_inf_nan=False)]
Quantity = Annotated[Decimal, Field(gt=0, max_digits=28, decimal_places=10, allow_inf_nan=False)]
Rate = Annotated[Decimal, Field(gt=0, max_digits=28, decimal_places=12, allow_inf_nan=False)]
CURRENCIES = {
    "EUR",
    "USD",
    "GBP",
    "PLN",
    "CHF",
    "JPY",
    "CAD",
    "SEK",
    "AUD",
    "DKK",
    "NOK",
    "CZK",
    "HUF",
    "HKD",
    "SGD",
}


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Credentials(Input):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value):
        return str(value).lower()


class Registration(Credentials):
    name: str = Field(min_length=1, max_length=80)

    @field_validator("name")
    @classmethod
    def nonempty_name(cls, value):
        if not value.strip():
            raise ValueError("Enter a name")
        return value.strip()


class UserView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    name: str
    is_admin: bool


class AccountInput(Input):
    name: str = Field(min_length=1, max_length=80)


class PasswordInput(Input):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)


class PortfolioInput(Input):
    name: str = Field(min_length=1, max_length=80)


class PortfolioView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    is_demo: bool


class InstrumentInput(Input):
    name: str = Field(min_length=1, max_length=100)
    category: Literal["stock", "etf", "crypto", "cash"]
    identifier: str = Field(min_length=1, max_length=60, pattern=r"^[A-Za-z0-9.:/_-]+$")
    venue: str = Field(min_length=1, max_length=60, pattern=r"^[A-Za-z0-9 .:/_-]+$")
    currency: str

    @field_validator("identifier", "venue", "currency")
    @classmethod
    def upper(cls, value):
        return value.upper()

    @field_validator("currency")
    @classmethod
    def currency_known(cls, value):
        if value not in CURRENCIES:
            raise ValueError("Unsupported currency")
        return value


class InstrumentView(InstrumentInput):
    model_config = ConfigDict(from_attributes=True)
    id: str


class ValuationInput(Input):
    quantity: Quantity
    price: Money | None = None
    valued_at: date | None = None
    source: str = Field(min_length=1, max_length=120)
    fx_rate: Rate | None = None
    fx_at: date | None = None
    fx_source: str | None = Field(default=None, min_length=1, max_length=120)

    @model_validator(mode="after")
    def dates(self):
        if (self.price is None) != (self.valued_at is None):
            raise ValueError("A price and its valuation date must be supplied together")
        if self.fx_rate is not None and (self.fx_at is None or not self.fx_source):
            raise ValueError("An FX rate requires its date and source")
        if self.fx_rate is None and (self.fx_at is not None or self.fx_source is not None):
            raise ValueError("An FX date/source requires an FX rate")
        if any(d and d > date.today() for d in (self.valued_at, self.fx_at)):
            raise ValueError("Future valuation dates are not accepted")
        return self


class HoldingInput(ValuationInput):
    instrument: InstrumentInput

    @model_validator(mode="after")
    def euro_rate(self):
        if self.instrument.currency == "EUR" and self.fx_rate not in (None, Decimal(1)):
            raise ValueError("EUR does not require currency conversion")
        if self.instrument.category == "cash" and self.price not in (None, Decimal(1)):
            raise ValueError("Cash unit price must be 1 in its original currency")
        return self


class HoldingUpdate(HoldingInput):
    version: int = Field(ge=1)


class HoldingView(BaseModel):
    id: str
    is_demo: bool
    instrument: InstrumentView
    quantity: str
    price: str | None
    valued_at: date | None
    source: str
    fx_rate: str | None
    fx_at: date | None
    fx_source: str | None
    original_value: str | None
    eur_value: str | None
    status: Literal["valued", "missing_price", "missing_fx"]
    stale: bool
    version: int


class Allocation(BaseModel):
    category: str
    eur_value: str
    percentage: str


class PortfolioDetail(PortfolioView):
    holdings: list[HoldingView]
    valued_subtotal: str
    total: str | None
    complete: bool
    missing_count: int
    stale_count: int
    allocation: list[Allocation]


class CSVInput(Input):
    csv_text: str = Field(min_length=1, max_length=500_000)


class ImportPreview(BaseModel):
    id: str
    row_count: int
    rows: list[HoldingInput]


class WatchInput(Input):
    instrument: InstrumentInput


class WatchView(BaseModel):
    id: str
    instrument: InstrumentView


class Message(BaseModel):
    detail: str
