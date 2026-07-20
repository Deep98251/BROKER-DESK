"""Backend tests for iteration 4 — party ledger + party payments."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "http://localhost:8001"
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def firm(s):
    r = s.post(f"{API}/firms", json={"name": f"TEST_FIRM_{uuid.uuid4().hex[:6]}"})
    assert r.status_code == 200, r.text
    f = r.json()
    yield f
    s.delete(f"{API}/firms/{f['id']}")


@pytest.fixture(scope="module")
def consignor(s):
    r = s.post(f"{API}/parties", json={"name": f"TEST_CONSIGNOR_{uuid.uuid4().hex[:6]}", "type": "consignor"})
    assert r.status_code == 200, r.text
    p = r.json()
    yield p
    s.delete(f"{API}/parties/{p['id']}")


@pytest.fixture(scope="module")
def transporter(s):
    r = s.post(f"{API}/parties", json={"name": f"TEST_TRANSPORTER_{uuid.uuid4().hex[:6]}", "type": "transporter"})
    assert r.status_code == 200, r.text
    p = r.json()
    yield p
    s.delete(f"{API}/parties/{p['id']}")


# ---------- Party Payments CRUD ----------
class TestPartyPaymentsCRUD:
    def test_list_supports_filter(self, s, consignor, firm):
        r = s.get(f"{API}/party-payments", params={"party_id": consignor["id"]})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_and_get(self, s, consignor, firm):
        payload = {
            "firm_id": firm["id"],
            "party_id": consignor["id"],
            "party_name": consignor["name"],
            "party_type": "consignor",
            "date": "2026-01-05",
            "amount": 1500,
            "side": "credit",
            "kind": "payment",
            "mode": "UPI",
            "reference": "UTR_TEST",
            "notes": "test note",
        }
        r = s.post(f"{API}/party-payments", json=payload)
        assert r.status_code == 200, r.text
        obj = r.json()
        assert obj["amount"] == 1500
        assert obj["side"] == "credit"
        assert obj["party_id"] == consignor["id"]
        assert "id" in obj

        # Verify listing with filter
        r2 = s.get(f"{API}/party-payments", params={"party_id": consignor["id"], "firm_id": firm["id"]})
        assert r2.status_code == 200
        ids = [x["id"] for x in r2.json()]
        assert obj["id"] in ids

        # Update
        u = s.put(f"{API}/party-payments/{obj['id']}", json={**payload, "amount": 2000})
        assert u.status_code == 200
        assert u.json()["amount"] == 2000

        # Delete
        d = s.delete(f"{API}/party-payments/{obj['id']}")
        assert d.status_code == 200

    def test_delete_nonexistent(self, s):
        r = s.delete(f"{API}/party-payments/nonexistent_id")
        assert r.status_code == 404


# ---------- Consignor Ledger scenario ----------
class TestConsignorLedger:
    def test_full_scenario(self, s, consignor, firm):
        # Create trip: party_freight=80000, trip payment from_party=30000
        trip_payload = {
            "firm_id": firm["id"],
            "firm_name": firm["name"],
            "date": "2026-01-01",
            "from_location": "Delhi",
            "to_location": "Mumbai",
            "party_id": consignor["id"],
            "party_name": consignor["name"],
            "party_freight": 80000,
            "transporter_freight": 0,
            "lr_number": "LR-TEST-1",
        }
        r = s.post(f"{API}/trips", json=trip_payload)
        assert r.status_code == 200, r.text
        trip = r.json()

        # Add trip payment from_party 30000
        p = s.post(f"{API}/trips/{trip['id']}/payments", json={
            "date": "2026-01-10", "direction": "from_party", "amount": 30000, "mode": "Bank"
        })
        assert p.status_code == 200

        # Standalone credit 10000
        pp = s.post(f"{API}/party-payments", json={
            "firm_id": firm["id"], "party_id": consignor["id"],
            "party_name": consignor["name"], "party_type": "consignor",
            "date": "2026-01-15", "amount": 10000, "side": "credit", "kind": "payment", "mode": "Cash",
        })
        assert pp.status_code == 200

        # Fetch ledger
        r = s.get(f"{API}/parties/{consignor['id']}/ledger")
        assert r.status_code == 200
        led = r.json()
        assert led["totals"]["debit"] == 80000
        assert led["totals"]["credit"] == 40000
        assert led["totals"]["balance"] == 40000
        # entries in date order
        dates = [e["date"] for e in led["entries"]]
        assert dates == sorted(dates)
        # last entry balance should be 40000
        assert led["entries"][-1]["balance"] == 40000

        # firm_id filter should include them
        r2 = s.get(f"{API}/parties/{consignor['id']}/ledger", params={"firm_id": firm["id"]})
        assert r2.status_code == 200
        assert r2.json()["totals"]["debit"] == 80000

        # firm_id filter with wrong firm should exclude
        r3 = s.get(f"{API}/parties/{consignor['id']}/ledger", params={"firm_id": "bogus"})
        assert r3.status_code == 200
        assert r3.json()["totals"]["debit"] == 0
        assert r3.json()["totals"]["credit"] == 0

        # cleanup
        s.delete(f"{API}/party-payments/{pp.json()['id']}")
        s.delete(f"{API}/trips/{trip['id']}")


# ---------- Transporter Ledger scenario ----------
class TestTransporterLedger:
    def test_full_scenario(self, s, transporter, firm):
        trip_payload = {
            "firm_id": firm["id"],
            "firm_name": firm["name"],
            "date": "2026-01-02",
            "from_location": "Pune",
            "to_location": "Nagpur",
            "transporter_id": transporter["id"],
            "transporter_name": transporter["name"],
            "party_freight": 0,
            "transporter_freight": 50000,
            "lr_number": "LR-TEST-2",
        }
        r = s.post(f"{API}/trips", json=trip_payload)
        assert r.status_code == 200
        trip = r.json()

        p = s.post(f"{API}/trips/{trip['id']}/payments", json={
            "date": "2026-01-12", "direction": "to_transporter", "amount": 20000, "mode": "Bank"
        })
        assert p.status_code == 200

        r = s.get(f"{API}/parties/{transporter['id']}/ledger")
        assert r.status_code == 200
        led = r.json()
        assert led["totals"]["credit"] == 50000
        assert led["totals"]["debit"] == 20000
        assert led["totals"]["balance"] == -30000

        s.delete(f"{API}/trips/{trip['id']}")


# ---------- Ledger 404 ----------
def test_ledger_party_not_found(s):
    r = s.get(f"{API}/parties/does-not-exist/ledger")
    assert r.status_code == 404


# ---------- Regression: firms/trips/parties basics ----------
class TestRegression:
    def test_firms_list(self, s):
        r = s.get(f"{API}/firms")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_trips_list(self, s):
        r = s.get(f"{API}/trips")
        assert r.status_code == 200

    def test_parties_list(self, s):
        r = s.get(f"{API}/parties")
        assert r.status_code == 200

    def test_stats(self, s):
        r = s.get(f"{API}/stats/summary")
        assert r.status_code == 200
        assert "total_commission" in r.json()
