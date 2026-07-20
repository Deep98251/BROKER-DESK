import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({ baseURL: API });

export const api = {
  // trucks
  listTrucks: () => client.get("/trucks").then(r => r.data),
  createTruck: (data) => client.post("/trucks", data).then(r => r.data),
  updateTruck: (id, data) => client.put(`/trucks/${id}`, data).then(r => r.data),
  deleteTruck: (id) => client.delete(`/trucks/${id}`).then(r => r.data),
  // drivers
  listDrivers: () => client.get("/drivers").then(r => r.data),
  createDriver: (data) => client.post("/drivers", data).then(r => r.data),
  updateDriver: (id, data) => client.put(`/drivers/${id}`, data).then(r => r.data),
  deleteDriver: (id) => client.delete(`/drivers/${id}`).then(r => r.data),
  // parties
  listParties: (type) => client.get("/parties", { params: type ? { type } : {} }).then(r => r.data),
  createParty: (data) => client.post("/parties", data).then(r => r.data),
  updateParty: (id, data) => client.put(`/parties/${id}`, data).then(r => r.data),
  deleteParty: (id) => client.delete(`/parties/${id}`).then(r => r.data),
  // trips
  listTrips: () => client.get("/trips").then(r => r.data),
  getTrip: (id) => client.get(`/trips/${id}`).then(r => r.data),
  createTrip: (data) => client.post("/trips", data).then(r => r.data),
  updateTrip: (id, data) => client.put(`/trips/${id}`, data).then(r => r.data),
  deleteTrip: (id) => client.delete(`/trips/${id}`).then(r => r.data),
  // trip payments
  addPayment: (tripId, data) => client.post(`/trips/${tripId}/payments`, data).then(r => r.data),
  deletePayment: (tripId, paymentId) => client.delete(`/trips/${tripId}/payments/${paymentId}`).then(r => r.data),
  // expenses
  listExpenses: () => client.get("/expenses").then(r => r.data),
  createExpense: (data) => client.post("/expenses", data).then(r => r.data),
  updateExpense: (id, data) => client.put(`/expenses/${id}`, data).then(r => r.data),
  deleteExpense: (id) => client.delete(`/expenses/${id}`).then(r => r.data),
  // stats
  summary: () => client.get("/stats/summary").then(r => r.data),
};

export const fmtCurrency = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "₹0";
  return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

export const fmtDate = (d) => {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return d; }
};
