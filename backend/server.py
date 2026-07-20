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


class Trip(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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
    freight_amount: float = 0.0
    commission_percent: float = 0.0
    commission_amount: float = 0.0
    advance_paid: float = 0.0
    balance: float = 0.0
    status: Literal["pending", "in_transit", "delivered", "paid"] = "pending"
    commission_received: bool = False
    notes: str = ""
    created_at: str = Field(default_factory=now_iso)


class TripCreate(BaseModel):
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
    freight_amount: float = 0.0
    commission_percent: float = 0.0
    commission_amount: float = 0.0
    advance_paid: float = 0.0
    balance: float = 0.0
    status: Literal["pending", "in_transit", "delivered", "paid"] = "pending"
    commission_received: bool = False
    notes: str = ""


class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    category: str
    amount: float
    description: str = ""
    trip_id: str = ""
    created_at: str = Field(default_factory=now_iso)


class ExpenseCreate(BaseModel):
    date: str
    category: str
    amount: float
    description: str = ""
    trip_id: str = ""


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
async def get_trips():
    return await list_collection("trips")


@api_router.get("/trips/{trip_id}", response_model=Trip)
async def get_trip(trip_id: str):
    doc = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Trip not found")
    return doc


@api_router.post("/trips", response_model=Trip)
async def create_trip(payload: TripCreate):
    data = payload.model_dump()
    # Auto-calc commission_amount if percent given and amount not
    if data.get("freight_amount") and data.get("commission_percent") and not data.get("commission_amount"):
        data["commission_amount"] = round(data["freight_amount"] * data["commission_percent"] / 100.0, 2)
    obj = Trip(**data)
    await db.trips.insert_one(obj.model_dump())
    return obj


@api_router.put("/trips/{trip_id}", response_model=Trip)
async def update_trip(trip_id: str, payload: TripCreate):
    existing = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Trip not found")
    updates = payload.model_dump()
    if updates.get("freight_amount") and updates.get("commission_percent") and not updates.get("commission_amount"):
        updates["commission_amount"] = round(updates["freight_amount"] * updates["commission_percent"] / 100.0, 2)
    await db.trips.update_one({"id": trip_id}, {"$set": updates})
    existing.update(updates)
    return Trip(**existing)


@api_router.delete("/trips/{trip_id}")
async def delete_trip(trip_id: str):
    r = await db.trips.delete_one({"id": trip_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Trip not found")
    return {"ok": True}


# ---------------------- Expenses ----------------------
@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses():
    return await list_collection("expenses")


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


# ---------------------- Dashboard / Stats ----------------------
@api_router.get("/stats/summary")
async def stats_summary():
    trips = await db.trips.find({}, {"_id": 0}).to_list(5000)
    expenses = await db.expenses.find({}, {"_id": 0}).to_list(5000)
    trucks_count = await db.trucks.count_documents({})
    drivers_count = await db.drivers.count_documents({})
    parties_count = await db.parties.count_documents({})

    total_commission = sum(t.get("commission_amount", 0) or 0 for t in trips)
    received_commission = sum(t.get("commission_amount", 0) or 0 for t in trips if t.get("commission_received"))
    pending_commission = total_commission - received_commission
    total_freight = sum(t.get("freight_amount", 0) or 0 for t in trips)
    total_expenses = sum(e.get("amount", 0) or 0 for e in expenses)

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


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
