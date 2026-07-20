"""Backend tests for multi-firm support (iteration 3)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback: read frontend/.env
    from pathlib import Path
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
            break

API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def firms(s):
    r = s.get(f"{API}/firms", timeout=15)
    assert r.status_code == 200
    return r.json()


# ---------------------- Firms ----------------------
class TestFirms:
    def test_seeded_firms(self, firms):
        names = {f["name"] for f in firms}
        assert "DEEP LOGISTICS" in names
        assert "SHEETAL TRANSPORT CO" in names
        for f in firms:
            assert "id" in f and isinstance(f["id"], str)

    def test_firm_crud(self, s):
        # Create
        r = s.post(f"{API}/firms", json={"name": "TEST FIRM", "gst": "TESTGST1"}, timeout=15)
        assert r.status_code == 200, r.text
        firm = r.json()
        fid = firm["id"]
        assert firm["name"] == "TEST FIRM"
        assert firm["gst"] == "TESTGST1"

        # Verify persisted
        r = s.get(f"{API}/firms", timeout=15)
        assert any(f["id"] == fid for f in r.json())

        # Update
        r = s.put(f"{API}/firms/{fid}", json={"name": "TEST FIRM UPDATED", "gst": "TESTGST2"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST FIRM UPDATED"

        # Delete
        r = s.delete(f"{API}/firms/{fid}", timeout=15)
        assert r.status_code == 200
        r = s.get(f"{API}/firms", timeout=15)
        assert not any(f["id"] == fid for f in r.json())

    def test_delete_missing_firm_404(self, s):
        r = s.delete(f"{API}/firms/nonexistent-id", timeout=15)
        assert r.status_code == 404


# ---------------------- Trips with firm ----------------------
class TestTripsFirm:
    def test_trip_firm_persistence_and_filter(self, s, firms):
        deep = next(f for f in firms if f["name"] == "DEEP LOGISTICS")
        sheetal = next(f for f in firms if f["name"] == "SHEETAL TRANSPORT CO")

        created_ids = []
        try:
            # Create trip under DEEP
            payload = {
                "firm_id": deep["id"], "firm_name": deep["name"],
                "date": "2026-01-15", "from_location": "TEST_A", "to_location": "TEST_B",
                "party_freight": 10000, "transporter_freight": 8000,
                "lr_number": "TEST_LR_DEEP",
            }
            r = s.post(f"{API}/trips", json=payload, timeout=15)
            assert r.status_code == 200, r.text
            t = r.json()
            created_ids.append(t["id"])
            assert t["firm_id"] == deep["id"]
            assert t["firm_name"] == "DEEP LOGISTICS"
            # Auto commission calc
            assert t["commission_amount"] == 2000

            # Trip under SHEETAL
            payload2 = {**payload, "firm_id": sheetal["id"], "firm_name": sheetal["name"], "lr_number": "TEST_LR_SHEETAL"}
            r = s.post(f"{API}/trips", json=payload2, timeout=15)
            assert r.status_code == 200
            t2 = r.json()
            created_ids.append(t2["id"])

            # Verify persisted with firm via GET
            r = s.get(f"{API}/trips/{t['id']}", timeout=15)
            assert r.json()["firm_id"] == deep["id"]

            # Filter by firm_id
            r = s.get(f"{API}/trips", params={"firm_id": deep["id"]}, timeout=15)
            trips_deep = r.json()
            ids_deep = {x["id"] for x in trips_deep}
            assert t["id"] in ids_deep
            assert t2["id"] not in ids_deep
            for x in trips_deep:
                assert x["firm_id"] == deep["id"]

            # All firms
            r = s.get(f"{API}/trips", timeout=15)
            ids_all = {x["id"] for x in r.json()}
            assert {t["id"], t2["id"]}.issubset(ids_all)
        finally:
            for tid in created_ids:
                s.delete(f"{API}/trips/{tid}", timeout=15)


# ---------------------- Expenses with firm ----------------------
class TestExpensesFirm:
    def test_expense_firm_filter(self, s, firms):
        deep = next(f for f in firms if f["name"] == "DEEP LOGISTICS")
        sheetal = next(f for f in firms if f["name"] == "SHEETAL TRANSPORT CO")
        ids = []
        try:
            r = s.post(f"{API}/expenses", json={"firm_id": deep["id"], "firm_name": deep["name"],
                                                "date": "2026-01-15", "category": "TEST_FUEL", "amount": 500}, timeout=15)
            assert r.status_code == 200
            e1 = r.json(); ids.append(e1["id"])
            assert e1["firm_id"] == deep["id"]

            r = s.post(f"{API}/expenses", json={"firm_id": sheetal["id"], "firm_name": sheetal["name"],
                                                "date": "2026-01-15", "category": "TEST_TOLL", "amount": 200}, timeout=15)
            e2 = r.json(); ids.append(e2["id"])

            r = s.get(f"{API}/expenses", params={"firm_id": deep["id"]}, timeout=15)
            ids_deep = {e["id"] for e in r.json()}
            assert e1["id"] in ids_deep and e2["id"] not in ids_deep
        finally:
            for eid in ids:
                s.delete(f"{API}/expenses/{eid}", timeout=15)


# ---------------------- Stats summary firm filter ----------------------
class TestStatsFirm:
    def test_stats_summary_scoped_by_firm(self, s, firms):
        deep = next(f for f in firms if f["name"] == "DEEP LOGISTICS")
        sheetal = next(f for f in firms if f["name"] == "SHEETAL TRANSPORT CO")
        tid = eid = tid2 = None
        try:
            r = s.post(f"{API}/trips", json={"firm_id": deep["id"], "firm_name": deep["name"],
                                             "date": "2026-01-15", "from_location": "X", "to_location": "Y",
                                             "party_freight": 5000, "transporter_freight": 3000}, timeout=15)
            tid = r.json()["id"]
            r = s.post(f"{API}/trips", json={"firm_id": sheetal["id"], "firm_name": sheetal["name"],
                                             "date": "2026-01-15", "from_location": "A", "to_location": "B",
                                             "party_freight": 9000, "transporter_freight": 6000}, timeout=15)
            tid2 = r.json()["id"]
            r = s.post(f"{API}/expenses", json={"firm_id": deep["id"], "firm_name": deep["name"],
                                                "date": "2026-01-15", "category": "TEST", "amount": 100}, timeout=15)
            eid = r.json()["id"]

            r = s.get(f"{API}/stats/summary", params={"firm_id": deep["id"]}, timeout=15)
            assert r.status_code == 200
            s_deep = r.json()
            r = s.get(f"{API}/stats/summary", params={"firm_id": sheetal["id"]}, timeout=15)
            s_sheetal = r.json()
            r = s.get(f"{API}/stats/summary", timeout=15)
            s_all = r.json()

            # deep should have >=1 trip, sheetal should have >=1 trip
            assert s_deep["trips_count"] >= 1
            assert s_sheetal["trips_count"] >= 1
            assert s_all["trips_count"] >= s_deep["trips_count"] + s_sheetal["trips_count"] - 100  # sanity
            # deep total_expenses should include 100
            assert s_deep["total_expenses"] >= 100
        finally:
            if tid: s.delete(f"{API}/trips/{tid}", timeout=15)
            if tid2: s.delete(f"{API}/trips/{tid2}", timeout=15)
            if eid: s.delete(f"{API}/expenses/{eid}", timeout=15)


# ---------------------- Regression: payments + CRUD ----------------------
class TestRegression:
    def test_payment_ledger_and_commission_autocalc(self, s, firms):
        deep = next(f for f in firms if f["name"] == "DEEP LOGISTICS")
        r = s.post(f"{API}/trips", json={"firm_id": deep["id"], "firm_name": deep["name"],
                                         "date": "2026-01-15", "from_location": "P", "to_location": "Q",
                                         "party_freight": 20000, "transporter_freight": 15000}, timeout=15)
        assert r.status_code == 200
        trip = r.json()
        tid = trip["id"]
        try:
            assert trip["commission_amount"] == 5000
            # Add a party payment
            r = s.post(f"{API}/trips/{tid}/payments", json={"date": "2026-01-16",
                       "direction": "from_party", "amount": 10000, "mode": "Bank"}, timeout=15)
            assert r.status_code == 200
            trip2 = r.json()
            assert len(trip2["payments"]) == 1
            pay_id = trip2["payments"][0]["id"]
            # Delete payment
            r = s.delete(f"{API}/trips/{tid}/payments/{pay_id}", timeout=15)
            assert r.status_code == 200
            assert len(r.json()["payments"]) == 0
        finally:
            s.delete(f"{API}/trips/{tid}", timeout=15)

    def test_trucks_drivers_parties_crud(self, s):
        # truck
        r = s.post(f"{API}/trucks", json={"number": "TEST-TN01"}, timeout=15)
        assert r.status_code == 200
        tk = r.json()["id"]
        s.put(f"{API}/trucks/{tk}", json={"number": "TEST-TN01", "capacity": "10T"}, timeout=15)
        assert s.delete(f"{API}/trucks/{tk}", timeout=15).status_code == 200
        # driver
        r = s.post(f"{API}/drivers", json={"name": "TEST DRIVER"}, timeout=15)
        did = r.json()["id"]
        assert s.delete(f"{API}/drivers/{did}", timeout=15).status_code == 200
        # party
        r = s.post(f"{API}/parties", json={"name": "TEST PARTY", "type": "consignor"}, timeout=15)
        pid = r.json()["id"]
        assert s.delete(f"{API}/parties/{pid}", timeout=15).status_code == 200
