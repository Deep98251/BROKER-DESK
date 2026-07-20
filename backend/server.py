from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Transport Broker API")
api_router = APIRouter(prefix="/api")


# ---------------------- Models ----------------------
def now_iso():
    return datetime.now(timezone.utc).isoformat()


class Firm(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    address: str = ""
    phone: str = ""
    email: str = ""
    gst: str = ""
    pan: str = ""
    bank_details: str = ""
    tagline: str = ""
    created_at: str = Field(default_factory=now_iso)


class FirmCreate(BaseModel):
    name: str
    address: str = ""
    phone: str = ""
    email: str = ""
    gst: str = ""
    pan: str = ""
    bank_details: str = ""
    tagline: str = ""


class Truck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    number: str
    type: str = "Open Body"
    capacity: str = ""
    owner_name: str = ""
    contact: str = ""
    notes: str = ""
    created_at: str = Field(default_factory=now_iso)


class TruckCreate(BaseModel):
    number: str
    type: str = "Open Body"
    capacity: str = ""
    owner_name: str = ""
    contact: str = ""
    notes: str = ""


class Driver(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str = ""
    license_number: str = ""
    address: str = ""
    created_at: str = Field(default_factory=now_iso)


class DriverCreate(BaseModel):
    name: str
    phone: str = ""
    license_number: str = ""
    address: str = ""


class Party(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: Literal["transporter", "consignor"] = "consignor"
    phone: str = ""
    email: str = ""
    address: str = ""
    gst: str = ""
    notes: str = ""
    created_at: str = Field(default_factory=now_iso)


class PartyCreate(BaseModel):
    name: str
    type: Literal["transporter", "consignor"] = "consignor"
    phone: str = ""
    email: str = ""
    address: str = ""
    gst: str = ""
    notes: str = ""


class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    direction: Literal["from_party", "to_transporter"]
    amount: float
    mode: str = "Cash"  # Cash / Bank / UPI / Cheque
    reference: str = ""
    notes: str = ""


class PaymentCreate(BaseModel):
    date: str
    direction: Literal["from_party", "to_transporter"]
    amount: float
    mode: str = "Cash"
    reference: str = ""
    notes: str = ""


class Trip(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    firm_id: str = ""
    firm_name: str = ""
    lr_number: str = ""
    date: str  # ISO date string
    from_location: str
    to_location: str
    transporter_id: str = ""
    transporter_name: str = ""
    party_id: str = ""
    party_name: str = ""
    truck_number: str = ""
    driver_name: str = ""
    material: str = ""
    weight: str = ""
    # Two-sided pricing (broker model)
    party_freight: float = 0.0        # agreed with party (money coming in)
    transporter_freight: float = 0.0  # agreed with transporter (money going out)
    # Legacy / display
    freight_amount: float = 0.0
    commission_percent: float = 0.0
    commission_amount: float = 0.0    # party_freight - transporter_freight (or manual)
    advance_paid: float = 0.0         # legacy
    balance: float = 0.0              # legacy
    status: Literal["pending", "in_transit", "delivered", "paid"] = "pending"
    commission_received: bool = False
    payments: List[Payment] = Field(default_factory=list)
    notes: str = ""
    created_at: str = Field(default_factory=now_iso)


class TripCreate(BaseModel):
    firm_id: str = ""
    firm_name: str = ""
    lr_number: str = ""
    date: str
    from_location: str
    to_location: str
    transporter_id: str = ""
    transporter_name: str = ""
    party_id: str = ""
    party_name: str = ""
    truck_number: str = ""
    driver_name: str = ""
    material: str = ""
    weight: str = ""
    party_freight: float = 0.0
    transporter_freight: float = 0.0
    freight_amount: float = 0.0
    commission_percent: float = 0.0
    commission_amount: float = 0.0
    advance_paid: float = 0.0
    balance: float = 0.0
    status: Literal["pending", "in_transit", "delivered", "paid"] = "pending"
    commission_received: bool = False
    payments: List[Payment] = Field(default_factory=list)
    notes: str = ""


class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    firm_id: str = ""
    firm_name: str = ""
    date: str
    category: str
    amount: float
    description: str = ""
    trip_id: str = ""
    created_at: str = Field(default_factory=now_iso)


class ExpenseCreate(BaseModel):
    firm_id: str = ""
    firm_name: str = ""
    date: str
    category: str
    amount: float
    description: str = ""
    trip_id: str = ""


class PartyPayment(BaseModel):
    """Standalone payment/adjustment for a party — not tied to a specific trip."""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    firm_id: str = ""
    firm_name: str = ""
    party_id: str
    party_name: str = ""
    party_type: Literal["transporter", "consignor"] = "consignor"
    date: str
    amount: float
    # side is from broker's ledger for THIS party:
    #   consignor: credit = money received | debit = extra charge on party
    #   transporter: debit = money paid | credit = additional amount owed
    side: Literal["debit", "credit"] = "credit"
    kind: str = "payment"  # payment | receipt | adjustment | opening
    mode: str = "Cash"
    reference: str = ""
    notes: str = ""
    created_at: str = Field(default_factory=now_iso)


class PartyPaymentCreate(BaseModel):
    firm_id: str = ""
    firm_name: str = ""
    party_id: str
    party_name: str = ""
    party_type: Literal["transporter", "consignor"] = "consignor"
    date: str
    amount: float
    side: Literal["debit", "credit"] = "credit"
    kind: str = "payment"
    mode: str = "Cash"
    reference: str = ""
    notes: str = ""


# ---------------------- Helper ----------------------
def clean(doc):
    if doc and "_id" in doc:
        doc.pop("_id")
    return doc


async def list_collection(coll_name):
    docs = await db[coll_name].find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


# ---------------------- Root ----------------------
@api_router.get("/")
async def root():
    return {"message": "Transport Broker API"}


# ---------------------- Firms ----------------------
@api_router.get("/firms", response_model=List[Firm])
async def get_firms():
    docs = await db.firms.find({}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return docs


@api_router.post("/firms", response_model=Firm)
async def create_firm(payload: FirmCreate):
    obj = Firm(**payload.model_dump())
    await db.firms.insert_one(obj.model_dump())
    return obj


@api_router.put("/firms/{firm_id}", response_model=Firm)
async def update_firm(firm_id: str, payload: FirmCreate):
    existing = await db.firms.find_one({"id": firm_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Firm not found")
    updates = payload.model_dump()
    await db.firms.update_one({"id": firm_id}, {"$set": updates})
    existing.update(updates)
    return Firm(**existing)


@api_router.delete("/firms/{firm_id}")
async def delete_firm(firm_id: str):
    r = await db.firms.delete_one({"id": firm_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Firm not found")
    return {"ok": True}


# ---------------------- Trucks ----------------------
@api_router.get("/trucks", response_model=List[Truck])
async def get_trucks():
    return await list_collection("trucks")


@api_router.post("/trucks", response_model=Truck)
async def create_truck(payload: TruckCreate):
    obj = Truck(**payload.model_dump())
    await db.trucks.insert_one(obj.model_dump())
    return obj


@api_router.put("/trucks/{truck_id}", response_model=Truck)
async def update_truck(truck_id: str, payload: TruckCreate):
    existing = await db.trucks.find_one({"id": truck_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Truck not found")
    updates = payload.model_dump()
    await db.trucks.update_one({"id": truck_id}, {"$set": updates})
    existing.update(updates)
    return Truck(**existing)


@api_router.delete("/trucks/{truck_id}")
async def delete_truck(truck_id: str):
    r = await db.trucks.delete_one({"id": truck_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Truck not found")
    return {"ok": True}


# ---------------------- Drivers ----------------------
@api_router.get("/drivers", response_model=List[Driver])
async def get_drivers():
    return await list_collection("drivers")


@api_router.post("/drivers", response_model=Driver)
async def create_driver(payload: DriverCreate):
    obj = Driver(**payload.model_dump())
    await db.drivers.insert_one(obj.model_dump())
    return obj


@api_router.put("/drivers/{driver_id}", response_model=Driver)
async def update_driver(driver_id: str, payload: DriverCreate):
    existing = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Driver not found")
    updates = payload.model_dump()
    await db.drivers.update_one({"id": driver_id}, {"$set": updates})
    existing.update(updates)
    return Driver(**existing)


@api_router.delete("/drivers/{driver_id}")
async def delete_driver(driver_id: str):
    r = await db.drivers.delete_one({"id": driver_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Driver not found")
    return {"ok": True}


# ---------------------- Parties ----------------------
@api_router.get("/parties", response_model=List[Party])
async def get_parties(type: Optional[str] = None):
    q = {}
    if type in ("transporter", "consignor"):
        q["type"] = type
    docs = await db.parties.find(q, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


@api_router.post("/parties", response_model=Party)
async def create_party(payload: PartyCreate):
    obj = Party(**payload.model_dump())
    await db.parties.insert_one(obj.model_dump())
    return obj


@api_router.put("/parties/{party_id}", response_model=Party)
async def update_party(party_id: str, payload: PartyCreate):
    existing = await db.parties.find_one({"id": party_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Party not found")
    updates = payload.model_dump()
    await db.parties.update_one({"id": party_id}, {"$set": updates})
    existing.update(updates)
    return Party(**existing)


@api_router.delete("/parties/{party_id}")
async def delete_party(party_id: str):
    r = await db.parties.delete_one({"id": party_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Party not found")
    return {"ok": True}


# ---------------------- Trips ----------------------
@api_router.get("/trips", response_model=List[Trip])
async def get_trips(firm_id: Optional[str] = None):
    q = {"firm_id": firm_id} if firm_id else {}
    docs = await db.trips.find(q, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


@api_router.get("/trips/{trip_id}", response_model=Trip)
async def get_trip(trip_id: str):
    doc = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Trip not found")
    return doc


def _apply_trip_calcs(data: dict, existing: dict | None = None):
    """Auto-calc: commission = party_freight - transporter_freight (if both set).
    Preserves existing payments if not sent by client."""
    pf = float(data.get("party_freight") or 0)
    tf = float(data.get("transporter_freight") or 0)
    # For UI backward compat: if freight_amount is 0 but party_freight set, mirror it
    if pf and not data.get("freight_amount"):
        data["freight_amount"] = pf
    fa = float(data.get("freight_amount") or 0)
    cp = float(data.get("commission_percent") or 0)
    ca = float(data.get("commission_amount") or 0)
    if pf and tf and not ca:
        data["commission_amount"] = round(pf - tf, 2)
    elif fa and cp and not ca:
        data["commission_amount"] = round(fa * cp / 100.0, 2)
    # Preserve existing payments if client didn't send any
    if existing is not None and not data.get("payments"):
        data["payments"] = existing.get("payments", [])
    return data


@api_router.post("/trips", response_model=Trip)
async def create_trip(payload: TripCreate):
    data = _apply_trip_calcs(payload.model_dump())
    obj = Trip(**data)
    await db.trips.insert_one(obj.model_dump())
    return obj


@api_router.put("/trips/{trip_id}", response_model=Trip)
async def update_trip(trip_id: str, payload: TripCreate):
    existing = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Trip not found")
    updates = _apply_trip_calcs(payload.model_dump(), existing)
    await db.trips.update_one({"id": trip_id}, {"$set": updates})
    existing.update(updates)
    return Trip(**existing)


@api_router.delete("/trips/{trip_id}")
async def delete_trip(trip_id: str):
    r = await db.trips.delete_one({"id": trip_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Trip not found")
    return {"ok": True}


# ---------------------- Trip Payments ----------------------
@api_router.post("/trips/{trip_id}/payments", response_model=Trip)
async def add_trip_payment(trip_id: str, payload: PaymentCreate):
    trip = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    if not trip:
        raise HTTPException(404, "Trip not found")
    pay = Payment(**payload.model_dump())
    payments = trip.get("payments", []) or []
    payments.append(pay.model_dump())
    await db.trips.update_one({"id": trip_id}, {"$set": {"payments": payments}})
    trip["payments"] = payments
    return Trip(**trip)


@api_router.delete("/trips/{trip_id}/payments/{payment_id}", response_model=Trip)
async def delete_trip_payment(trip_id: str, payment_id: str):
    trip = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    if not trip:
        raise HTTPException(404, "Trip not found")
    payments = [p for p in (trip.get("payments") or []) if p.get("id") != payment_id]
    await db.trips.update_one({"id": trip_id}, {"$set": {"payments": payments}})
    trip["payments"] = payments
    return Trip(**trip)


# ---------------------- Expenses ----------------------
@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses(firm_id: Optional[str] = None):
    q = {"firm_id": firm_id} if firm_id else {}
    docs = await db.expenses.find(q, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


@api_router.post("/expenses", response_model=Expense)
async def create_expense(payload: ExpenseCreate):
    obj = Expense(**payload.model_dump())
    await db.expenses.insert_one(obj.model_dump())
    return obj


@api_router.put("/expenses/{expense_id}", response_model=Expense)
async def update_expense(expense_id: str, payload: ExpenseCreate):
    existing = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Expense not found")
    updates = payload.model_dump()
    await db.expenses.update_one({"id": expense_id}, {"$set": updates})
    existing.update(updates)
    return Expense(**existing)


@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    r = await db.expenses.delete_one({"id": expense_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Expense not found")
    return {"ok": True}


# ---------------------- Party Payments (standalone) ----------------------
@api_router.get("/party-payments", response_model=List[PartyPayment])
async def get_party_payments(party_id: Optional[str] = None, firm_id: Optional[str] = None):
    q = {}
    if party_id: q["party_id"] = party_id
    if firm_id: q["firm_id"] = firm_id
    docs = await db.party_payments.find(q, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


@api_router.post("/party-payments", response_model=PartyPayment)
async def create_party_payment(payload: PartyPaymentCreate):
    obj = PartyPayment(**payload.model_dump())
    await db.party_payments.insert_one(obj.model_dump())
    return obj


@api_router.put("/party-payments/{payment_id}", response_model=PartyPayment)
async def update_party_payment(payment_id: str, payload: PartyPaymentCreate):
    existing = await db.party_payments.find_one({"id": payment_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Payment not found")
    updates = payload.model_dump()
    await db.party_payments.update_one({"id": payment_id}, {"$set": updates})
    existing.update(updates)
    return PartyPayment(**existing)


@api_router.delete("/party-payments/{payment_id}")
async def delete_party_payment(payment_id: str):
    r = await db.party_payments.delete_one({"id": payment_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Payment not found")
    return {"ok": True}


# ---------------------- Party Ledger ----------------------
@api_router.get("/parties/{party_id}/ledger")
async def party_ledger(party_id: str, firm_id: Optional[str] = None):
    party = await db.parties.find_one({"id": party_id}, {"_id": 0})
    if not party:
        raise HTTPException(404, "Party not found")

    party_type = party.get("type", "consignor")
    q_firm = {"firm_id": firm_id} if firm_id else {}

    # Trips involving this party
    if party_type == "transporter":
        q = {"transporter_id": party_id, **q_firm}
    else:
        q = {"party_id": party_id, **q_firm}
    trips = await db.trips.find(q, {"_id": 0}).to_list(5000)

    # Standalone party payments
    pp_q = {"party_id": party_id, **q_firm}
    party_payments = await db.party_payments.find(pp_q, {"_id": 0}).to_list(5000)

    entries = []

    for t in trips:
        pf = float(t.get("party_freight") or t.get("freight_amount") or 0)
        tf = float(t.get("transporter_freight") or 0)
        route = f"{t.get('from_location','?')} → {t.get('to_location','?')}"
        lr = t.get("lr_number") or t.get("id", "")[:8]

        if party_type == "consignor" and pf > 0:
            # Freight billed to party — party owes broker
            entries.append({
                "date": t.get("date", ""),
                "type": "trip",
                "description": f"Freight — {route} (LR {lr})",
                "debit": pf,
                "credit": 0.0,
                "trip_id": t.get("id"),
                "reference": lr,
            })
            # Trip payments received from party
            for p in (t.get("payments") or []):
                if p.get("direction") == "from_party":
                    entries.append({
                        "date": p.get("date", ""),
                        "type": "trip_payment",
                        "description": f"Receipt against LR {lr} · {p.get('mode','')}",
                        "debit": 0.0,
                        "credit": float(p.get("amount") or 0),
                        "trip_id": t.get("id"),
                        "reference": p.get("reference") or "",
                    })

        elif party_type == "transporter" and tf > 0:
            # Freight owed to transporter (credit — broker owes them)
            entries.append({
                "date": t.get("date", ""),
                "type": "trip",
                "description": f"Freight owed — {route} (LR {lr})",
                "debit": 0.0,
                "credit": tf,
                "trip_id": t.get("id"),
                "reference": lr,
            })
            for p in (t.get("payments") or []):
                if p.get("direction") == "to_transporter":
                    entries.append({
                        "date": p.get("date", ""),
                        "type": "trip_payment",
                        "description": f"Payment against LR {lr} · {p.get('mode','')}",
                        "debit": float(p.get("amount") or 0),
                        "credit": 0.0,
                        "trip_id": t.get("id"),
                        "reference": p.get("reference") or "",
                    })

    # Standalone party payments
    for pp in party_payments:
        amt = float(pp.get("amount") or 0)
        side = pp.get("side", "credit")
        kind = pp.get("kind", "payment")
        desc = pp.get("notes") or {"payment": "Payment", "receipt": "Receipt", "adjustment": "Adjustment", "opening": "Opening Balance"}.get(kind, "Entry")
        if pp.get("mode"): desc = f"{desc} · {pp['mode']}"
        entries.append({
            "date": pp.get("date", ""),
            "type": kind,
            "description": desc,
            "debit": amt if side == "debit" else 0.0,
            "credit": amt if side == "credit" else 0.0,
            "party_payment_id": pp.get("id"),
            "reference": pp.get("reference") or "",
        })

    # Sort by date ASC, then by type (trip before payment same day)
    def sort_key(e):
        d = e.get("date") or "0000-00-00"
        prio = 0 if e.get("type") in ("trip", "opening") else 1
        return (d, prio)

    entries.sort(key=sort_key)

    # Running balance
    running = 0.0
    for e in entries:
        running += float(e.get("debit") or 0) - float(e.get("credit") or 0)
        e["balance"] = round(running, 2)

    total_debit = round(sum(float(e.get("debit") or 0) for e in entries), 2)
    total_credit = round(sum(float(e.get("credit") or 0) for e in entries), 2)
    balance = round(total_debit - total_credit, 2)

    return {
        "party": party,
        "entries": entries,
        "totals": {"debit": total_debit, "credit": total_credit, "balance": balance},
    }


# ---------------------- Dashboard / Stats ----------------------
@api_router.get("/stats/summary")
async def stats_summary(firm_id: Optional[str] = None):
    q = {"firm_id": firm_id} if firm_id else {}
    trips = await db.trips.find(q, {"_id": 0}).to_list(5000)
    expenses = await db.expenses.find(q, {"_id": 0}).to_list(5000)
    trucks_count = await db.trucks.count_documents({})
    drivers_count = await db.drivers.count_documents({})
    parties_count = await db.parties.count_documents({})

    total_commission = sum(t.get("commission_amount", 0) or 0 for t in trips)
    received_commission = sum(t.get("commission_amount", 0) or 0 for t in trips if t.get("commission_received"))
    pending_commission = total_commission - received_commission
    total_freight = sum((t.get("party_freight") or t.get("freight_amount", 0) or 0) for t in trips)
    total_expenses = sum(e.get("amount", 0) or 0 for e in expenses)

    # Payment ledger totals
    party_received_total = 0.0
    transporter_paid_total = 0.0
    party_receivable_total = 0.0
    transporter_payable_total = 0.0
    for t in trips:
        pf = float(t.get("party_freight") or t.get("freight_amount") or 0)
        tf = float(t.get("transporter_freight") or 0)
        pays = t.get("payments") or []
        pr = sum(float(p.get("amount") or 0) for p in pays if p.get("direction") == "from_party")
        tp = sum(float(p.get("amount") or 0) for p in pays if p.get("direction") == "to_transporter")
        party_received_total += pr
        transporter_paid_total += tp
        if pf > 0:
            party_receivable_total += max(pf - pr, 0)
        if tf > 0:
            transporter_payable_total += max(tf - tp, 0)

    active_trips = sum(1 for t in trips if t.get("status") in ("pending", "in_transit"))
    delivered_trips = sum(1 for t in trips if t.get("status") in ("delivered", "paid"))

    # Monthly commission breakdown (last 6 months)
    now = datetime.now(timezone.utc)
    buckets = {}
    y, m = now.year, now.month
    for _ in range(6):
        key = f"{y:04d}-{m:02d}"
        month_name = datetime(y, m, 1).strftime("%b")
        buckets[key] = {"month": month_name, "key": key, "commission": 0.0, "freight": 0.0}
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    for t in trips:
        d = t.get("date", "")
        if len(d) >= 7:
            key = d[:7]
            if key in buckets:
                buckets[key]["commission"] += t.get("commission_amount", 0) or 0
                buckets[key]["freight"] += t.get("freight_amount", 0) or 0
    monthly = sorted(buckets.values(), key=lambda x: x["key"])

    return {
        "total_commission": round(total_commission, 2),
        "received_commission": round(received_commission, 2),
        "pending_commission": round(pending_commission, 2),
        "total_freight": round(total_freight, 2),
        "total_expenses": round(total_expenses, 2),
        "party_received_total": round(party_received_total, 2),
        "transporter_paid_total": round(transporter_paid_total, 2),
        "party_receivable_total": round(party_receivable_total, 2),
        "transporter_payable_total": round(transporter_payable_total, 2),
        "trips_count": len(trips),
        "active_trips": active_trips,
        "delivered_trips": delivered_trips,
        "trucks_count": trucks_count,
        "drivers_count": drivers_count,
        "parties_count": parties_count,
        "monthly": monthly,
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def seed_firms():
    """Seed the two default firms once, only if firms collection is empty."""
    count = await db.firms.count_documents({})
    if count == 0:
        defaults = [
            Firm(name="DEEP LOGISTICS", tagline="Transport & Brokerage").model_dump(),
            Firm(name="SHEETAL TRANSPORT CO", tagline="Transport & Brokerage").model_dump(),
        ]
        await db.firms.insert_many(defaults)
        logger.info("Seeded 2 default firms")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
