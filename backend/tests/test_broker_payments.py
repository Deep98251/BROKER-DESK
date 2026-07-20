"""Iteration 2 backend tests: two-sided freight + trip payments + stats."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://free-transport-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def trip_id(s):
    payload = {
        "date": "2026-01-15",
        "from_location": "TEST_Mumbai",
        "to_location": "TEST_Delhi",
        "party_name": "TEST_Party",
        "transporter_name": "TEST_Transporter",
        "party_freight": 50000,
        "transporter_freight": 45000,
        "status": "pending",
    }
    r = s.post(f"{API}/trips", json=payload)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["commission_amount"] == 5000, f"expected commission 5000, got {d['commission_amount']}"
    assert d["party_freight"] == 50000
    assert d["transporter_freight"] == 45000
    assert d["payments"] == []
    tid = d["id"]
    yield tid
    s.delete(f"{API}/trips/{tid}")


def test_add_payment_from_party(s, trip_id):
    r = s.post(f"{API}/trips/{trip_id}/payments", json={
        "date": "2026-01-16", "direction": "from_party", "amount": 25000, "mode": "UPI"
    })
    assert r.status_code == 200, r.text
    d = r.json()
    assert len(d["payments"]) == 1
    p = d["payments"][0]
    assert p["direction"] == "from_party"
    assert p["amount"] == 25000
    assert p["mode"] == "UPI"
    assert "id" in p and len(p["id"]) > 10  # UUID


def test_add_payment_to_transporter(s, trip_id):
    r = s.post(f"{API}/trips/{trip_id}/payments", json={
        "date": "2026-01-17", "direction": "to_transporter", "amount": 20000, "mode": "Bank"
    })
    assert r.status_code == 200
    d = r.json()
    assert len(d["payments"]) == 2


def test_put_preserves_payments(s, trip_id):
    # Update trip WITHOUT payments; existing payments should not be wiped
    payload = {
        "date": "2026-01-15",
        "from_location": "TEST_Mumbai",
        "to_location": "TEST_Delhi_Updated",
        "party_freight": 50000,
        "transporter_freight": 45000,
    }
    r = s.put(f"{API}/trips/{trip_id}", json=payload)
    assert r.status_code == 200, r.text
    d = r.json()
    assert len(d["payments"]) == 2, f"payments wiped! got {d['payments']}"
    assert d["to_location"] == "TEST_Delhi_Updated"


def test_stats_summary_fields(s, trip_id):
    r = s.get(f"{API}/stats/summary")
    assert r.status_code == 200
    d = r.json()
    for k in ["party_received_total", "transporter_paid_total", "party_receivable_total", "transporter_payable_total"]:
        assert k in d, f"missing field {k}"
    # Our test trip contributes: received=25000, paid=20000, receivable=25000, payable=25000
    assert d["party_received_total"] >= 25000
    assert d["transporter_paid_total"] >= 20000
    assert d["party_receivable_total"] >= 25000
    assert d["transporter_payable_total"] >= 25000


def test_delete_payment(s, trip_id):
    # get current payments
    r = s.get(f"{API}/trips/{trip_id}")
    payments = r.json()["payments"]
    assert len(payments) == 2
    pid = payments[0]["id"]
    r = s.delete(f"{API}/trips/{trip_id}/payments/{pid}")
    assert r.status_code == 200
    d = r.json()
    assert len(d["payments"]) == 1
    assert all(p["id"] != pid for p in d["payments"])


def test_invalid_direction_rejected(s, trip_id):
    r = s.post(f"{API}/trips/{trip_id}/payments", json={
        "date": "2026-01-18", "direction": "wrong_way", "amount": 100
    })
    assert r.status_code == 422


def test_payment_on_missing_trip(s):
    r = s.post(f"{API}/trips/nonexistent-id/payments", json={
        "date": "2026-01-18", "direction": "from_party", "amount": 100
    })
    assert r.status_code == 404


def test_regression_crud_others(s):
    # Truck
    r = s.post(f"{API}/trucks", json={"number": "TEST_MH01AA1111"})
    assert r.status_code == 200
    tid = r.json()["id"]
    assert s.delete(f"{API}/trucks/{tid}").status_code == 200
    # Driver
    r = s.post(f"{API}/drivers", json={"name": "TEST_Driver"})
    assert r.status_code == 200
    did = r.json()["id"]
    assert s.delete(f"{API}/drivers/{did}").status_code == 200
    # Party
    r = s.post(f"{API}/parties", json={"name": "TEST_P", "type": "transporter"})
    assert r.status_code == 200
    pid = r.json()["id"]
    assert s.delete(f"{API}/parties/{pid}").status_code == 200
    # Expense
    r = s.post(f"{API}/expenses", json={"date": "2026-01-15", "category": "Fuel", "amount": 500})
    assert r.status_code == 200
    eid = r.json()["id"]
    assert s.delete(f"{API}/expenses/{eid}").status_code == 200
