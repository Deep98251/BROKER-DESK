import { useEffect, useMemo, useState } from "react";
import { api, fmtCurrency, fmtDate } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, FileText, Route as RouteIcon, Search, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const emptyForm = () => ({
  lr_number: "", date: new Date().toISOString().slice(0, 10),
  from_location: "", to_location: "",
  transporter_id: "", transporter_name: "",
  party_id: "", party_name: "",
  truck_number: "", driver_name: "",
  material: "", weight: "",
  party_freight: 0, transporter_freight: 0,
  freight_amount: 0, commission_percent: 0, commission_amount: 0,
  advance_paid: 0, balance: 0,
  status: "pending", commission_received: false, notes: "", payments: [],
});

export function computeTripDerived(t) {
  const pf = Number(t.party_freight || t.freight_amount || 0);
  const tf = Number(t.transporter_freight || 0);
  const pays = t.payments || [];
  const partyReceived = pays.filter(p => p.direction === "from_party").reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const transporterPaid = pays.filter(p => p.direction === "to_transporter").reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const partyBalance = pf - partyReceived;
  const transporterBalance = tf - transporterPaid;
  const commissionAgreed = Number(t.commission_amount || 0) || (pf && tf ? pf - tf : 0);
  const commissionRealized = partyReceived - transporterPaid;
  return { pf, tf, partyReceived, transporterPaid, partyBalance, transporterBalance, commissionAgreed, commissionRealized };
}

export default function Trips() {
  const [items, setItems] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [consignors, setConsignors] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [delId, setDelId] = useState(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [payTrip, setPayTrip] = useState(null); // trip in payment dialog

  const load = () => api.listTrips().then(setItems);
  useEffect(() => {
    load();
    api.listParties("transporter").then(setTransporters);
    api.listParties("consignor").then(setConsignors);
    api.listTrucks().then(setTrucks);
    api.listDrivers().then(setDrivers);
  }, []);

  // Auto compute commission_amount from party_freight - transporter_freight
  useEffect(() => {
    const pf = Number(form.party_freight) || 0;
    const tf = Number(form.transporter_freight) || 0;
    if (pf && tf) {
      const c = +(pf - tf).toFixed(2);
      setForm(prev => ({ ...prev, commission_amount: c, freight_amount: pf }));
    } else if (pf) {
      setForm(prev => ({ ...prev, freight_amount: pf }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.party_freight, form.transporter_freight]);

  const filtered = useMemo(() => {
    let res = items;
    if (statusFilter !== "all") res = res.filter(t => t.status === statusFilter);
    if (q.trim()) {
      const s = q.toLowerCase();
      res = res.filter(t =>
        (t.lr_number || "").toLowerCase().includes(s) ||
        (t.from_location || "").toLowerCase().includes(s) ||
        (t.to_location || "").toLowerCase().includes(s) ||
        (t.party_name || "").toLowerCase().includes(s) ||
        (t.transporter_name || "").toLowerCase().includes(s) ||
        (t.truck_number || "").toLowerCase().includes(s)
      );
    }
    return res;
  }, [items, q, statusFilter]);

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };
  const openEdit = (t) => { setEditing(t); setForm({ ...emptyForm(), ...t, payments: t.payments || [] }); setOpen(true); };

  const save = async () => {
    if (!form.from_location.trim() || !form.to_location.trim()) { toast.error("From and To are required"); return; }
    const payload = {
      ...form,
      party_freight: Number(form.party_freight) || 0,
      transporter_freight: Number(form.transporter_freight) || 0,
      freight_amount: Number(form.freight_amount || form.party_freight) || 0,
      commission_percent: Number(form.commission_percent) || 0,
      commission_amount: Number(form.commission_amount) || 0,
      advance_paid: Number(form.advance_paid) || 0,
      balance: Number(form.balance) || 0,
    };
    // Do not overwrite payments from form when editing (server preserves if empty)
    if (!editing) payload.payments = [];
    else delete payload.payments;
    try {
      if (editing) { await api.updateTrip(editing.id, payload); toast.success("Trip updated"); }
      else { await api.createTrip(payload); toast.success("Trip added"); }
      setOpen(false); load();
    } catch { toast.error("Failed to save"); }
  };

  const remove = async () => { try { await api.deleteTrip(delId); toast.success("Deleted"); setDelId(null); load(); } catch { toast.error("Failed"); } };

  const refreshPayTrip = async (id) => {
    const t = await api.getTrip(id);
    setPayTrip(t);
    load();
  };

  return (
    <div className="p-8 lg:p-12">
      <PageHeader title="Trips / Loads" subtitle="Every consignment moved through your brokerage — with automatic commission and payment tracking." testid="trips-header"
        action={<Button onClick={openAdd} data-testid="add-trip-button" className="accent-bg text-white"><Plus size={16} className="mr-1.5"/>New Trip</Button>} />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <Input data-testid="trips-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search LR, party, route, truck..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger data-testid="trips-status-filter" className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No trips found" description="Add your first trip to start earning commission." icon={RouteIcon}
          action={<Button onClick={openAdd} className="accent-bg text-white"><Plus size={16} className="mr-1.5"/>New Trip</Button>} />
      ) : (
        <div className="card-flat p-2 overflow-x-auto">
          <table className="tms-table w-full min-w-[1300px]">
            <thead>
              <tr>
                <th>Date</th><th>LR</th><th>Route</th><th>Truck</th><th>Party</th><th>Transporter</th>
                <th className="num">Party Freight</th><th className="num">Trans. Freight</th><th className="num">Commission</th>
                <th className="num">Party Bal</th><th className="num">Trans. Bal</th>
                <th>Status</th><th className="text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const d = computeTripDerived(t);
                return (
                  <tr key={t.id} data-testid={`trip-row-${t.id}`}>
                    <td>{fmtDate(t.date)}</td>
                    <td className="font-mono-num text-xs font-semibold">{t.lr_number || "-"}</td>
                    <td>{t.from_location} → {t.to_location}</td>
                    <td className="font-mono-num text-xs">{t.truck_number || "-"}</td>
                    <td>{t.party_name || "-"}</td>
                    <td>{t.transporter_name || "-"}</td>
                    <td className="num">{fmtCurrency(d.pf)}</td>
                    <td className="num">{fmtCurrency(d.tf)}</td>
                    <td className="num accent-text font-semibold">{fmtCurrency(d.commissionAgreed)}</td>
                    <td className="num" style={{ color: d.partyBalance > 0 ? "#C04848" : "#4D7A58" }}>{fmtCurrency(d.partyBalance)}</td>
                    <td className="num" style={{ color: d.transporterBalance > 0 ? "#C04848" : "#4D7A58" }}>{fmtCurrency(d.transporterBalance)}</td>
                    <td><span className={`status-badge status-${t.status}`}>{t.status.replace("_"," ")}</span></td>
                    <td className="text-right pr-4 whitespace-nowrap">
                      <button onClick={() => setPayTrip(t)} data-testid={`payments-trip-${t.id}`} title="Payments" className="p-1.5 text-stone-600 hover:accent-text"><Wallet size={15}/></button>
                      <Link to={`/invoice/${t.id}`} target="_blank" data-testid={`invoice-trip-${t.id}`} className="inline-block p-1.5 text-stone-600 hover:accent-text"><FileText size={15}/></Link>
                      <button onClick={() => openEdit(t)} data-testid={`edit-trip-${t.id}`} className="p-1.5 text-stone-600 hover:accent-text"><Pencil size={15}/></button>
                      <button onClick={() => setDelId(t.id)} data-testid={`delete-trip-${t.id}`} className="p-1.5 text-stone-600 hover:text-red-600"><Trash2 size={15}/></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle className="font-display">{editing ? "Edit Trip" : "New Trip"}</SheetTitle><SheetDescription>Commission auto-calculates from Party Freight − Transporter Freight.</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <F label="Date"><Input type="date" data-testid="input-trip-date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></F>
              <F label="LR / Bilty No"><Input data-testid="input-trip-lr" value={form.lr_number} onChange={e => setForm({ ...form, lr_number: e.target.value })} /></F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="From *"><Input data-testid="input-trip-from" value={form.from_location} onChange={e => setForm({ ...form, from_location: e.target.value })} placeholder="Mumbai" /></F>
              <F label="To *"><Input data-testid="input-trip-to" value={form.to_location} onChange={e => setForm({ ...form, to_location: e.target.value })} placeholder="Delhi" /></F>
            </div>

            <F label="Transporter">
              <Select value={form.transporter_id || "none"} onValueChange={v => {
                if (v === "none") setForm({ ...form, transporter_id: "", transporter_name: "" });
                else { const p = transporters.find(x => x.id === v); setForm({ ...form, transporter_id: v, transporter_name: p?.name || "" }); }
              }}>
                <SelectTrigger data-testid="input-trip-transporter"><SelectValue placeholder="Select transporter" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {transporters.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Party (Consignor)">
              <Select value={form.party_id || "none"} onValueChange={v => {
                if (v === "none") setForm({ ...form, party_id: "", party_name: "" });
                else { const p = consignors.find(x => x.id === v); setForm({ ...form, party_id: v, party_name: p?.name || "" }); }
              }}>
                <SelectTrigger data-testid="input-trip-party"><SelectValue placeholder="Select party" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {consignors.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>

            <div className="grid grid-cols-2 gap-3">
              <F label="Truck">
                <Select value={form.truck_number || "none"} onValueChange={v => setForm({ ...form, truck_number: v === "none" ? "" : v })}>
                  <SelectTrigger data-testid="input-trip-truck"><SelectValue placeholder="Select truck" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {trucks.map(t => <SelectItem key={t.id} value={t.number}>{t.number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
              <F label="Driver">
                <Select value={form.driver_name || "none"} onValueChange={v => setForm({ ...form, driver_name: v === "none" ? "" : v })}>
                  <SelectTrigger data-testid="input-trip-driver"><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {drivers.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <F label="Material"><Input data-testid="input-trip-material" value={form.material} onChange={e => setForm({ ...form, material: e.target.value })} /></F>
              <F label="Weight"><Input data-testid="input-trip-weight" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 15 Ton" /></F>
            </div>

            <div className="p-4 accent-soft-bg rounded-md border border-orange-200/60">
              <div className="text-[10px] uppercase tracking-[0.2em] accent-text font-bold mb-3">Freight Agreement (this shipment)</div>
              <div className="grid grid-cols-2 gap-3">
                <F label="Party Freight (₹) — money in"><Input type="number" data-testid="input-trip-party-freight" value={form.party_freight} onChange={e => setForm({ ...form, party_freight: e.target.value })} placeholder="Agreed with party" /></F>
                <F label="Transporter Freight (₹) — money out"><Input type="number" data-testid="input-trip-transporter-freight" value={form.transporter_freight} onChange={e => setForm({ ...form, transporter_freight: e.target.value })} placeholder="Agreed with transporter" /></F>
                <F label="Commission (₹) — auto"><Input type="number" data-testid="input-trip-commamt" value={form.commission_amount} onChange={e => setForm({ ...form, commission_amount: e.target.value })} /></F>
                <F label="Commission %"><Input type="number" step="0.01" data-testid="input-trip-commpct" value={form.commission_percent} onChange={e => setForm({ ...form, commission_percent: e.target.value })} placeholder="Optional" /></F>
              </div>
              {editing && (
                <div className="text-xs text-stone-600 mt-3 flex items-center gap-2">
                  <Wallet size={13} className="accent-text" />
                  Add advance & balance payments after saving from the <span className="font-semibold">Payments</span> button on the trip row.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <F label="Status">
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger data-testid="input-trip-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </F>
              <F label="Commission Received">
                <Select value={form.commission_received ? "yes" : "no"} onValueChange={v => setForm({ ...form, commission_received: v === "yes" })}>
                  <SelectTrigger data-testid="input-trip-comm-received"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">Not yet</SelectItem>
                    <SelectItem value="yes">Received</SelectItem>
                  </SelectContent>
                </Select>
              </F>
            </div>

            <F label="Notes"><Textarea data-testid="input-trip-notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></F>

            <div className="flex justify-end gap-2 pt-4 pb-8">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} data-testid="save-trip" className="accent-bg text-white">{editing ? "Update Trip" : "Add Trip"}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Payment ledger dialog */}
      <PaymentDialog trip={payTrip} onClose={() => { setPayTrip(null); load(); }} onChanged={refreshPayTrip} />

      <AlertDialog open={!!delId} onOpenChange={() => setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete trip?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-red-600 text-white">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function F({ label, children }) { return (<div><Label className="text-[11px] uppercase tracking-[0.15em] text-stone-600 font-semibold mb-1.5 block">{label}</Label>{children}</div>); }

// -----------------------------------------
// Payment Ledger Dialog
// -----------------------------------------
function PaymentDialog({ trip, onClose, onChanged }) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), direction: "from_party", amount: 0, mode: "Cash", reference: "", notes: "" });

  if (!trip) return null;
  const d = computeTripDerived(trip);

  const addPayment = async () => {
    const amt = Number(form.amount) || 0;
    if (amt <= 0) { toast.error("Amount must be > 0"); return; }
    try {
      await api.addPayment(trip.id, { ...form, amount: amt });
      toast.success("Payment added");
      setForm({ ...form, amount: 0, reference: "", notes: "" });
      onChanged(trip.id);
    } catch { toast.error("Failed to add"); }
  };

  const removePayment = async (pid) => {
    try {
      await api.deletePayment(trip.id, pid);
      toast.success("Payment removed");
      onChanged(trip.id);
    } catch { toast.error("Failed"); }
  };

  const partyPayments = (trip.payments || []).filter(p => p.direction === "from_party");
  const transporterPayments = (trip.payments || []).filter(p => p.direction === "to_transporter");

  return (
    <Dialog open={!!trip} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="payment-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Payment Ledger — {trip.from_location} → {trip.to_location}</DialogTitle>
          <DialogDescription>Track advance and balance payments received from party & paid to transporter.</DialogDescription>
        </DialogHeader>

        {/* Balance summary */}
        <div className="grid grid-cols-2 gap-4 my-4">
          <div className="p-4 rounded-md border border-line bg-white" data-testid="party-balance-card">
            <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold">From Party</div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <div className="text-xs text-stone-500">Agreed</div>
                <div className="font-display font-semibold text-lg">{fmtCurrency(d.pf)}</div>
              </div>
              <div>
                <div className="text-xs text-stone-500">Received</div>
                <div className="font-display font-semibold text-lg text-green-700">{fmtCurrency(d.partyReceived)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-stone-500">Balance</div>
                <div className="font-display font-bold text-lg" style={{ color: d.partyBalance > 0 ? "#C04848" : "#4D7A58" }} data-testid="party-balance">{fmtCurrency(d.partyBalance)}</div>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-md border border-line bg-white" data-testid="transporter-balance-card">
            <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold">To Transporter</div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <div className="text-xs text-stone-500">Agreed</div>
                <div className="font-display font-semibold text-lg">{fmtCurrency(d.tf)}</div>
              </div>
              <div>
                <div className="text-xs text-stone-500">Paid</div>
                <div className="font-display font-semibold text-lg text-green-700">{fmtCurrency(d.transporterPaid)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-stone-500">Balance</div>
                <div className="font-display font-bold text-lg" style={{ color: d.transporterBalance > 0 ? "#C04848" : "#4D7A58" }} data-testid="transporter-balance">{fmtCurrency(d.transporterBalance)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 accent-soft-bg rounded-md border border-orange-200/60 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] accent-text font-bold">Commission Position</div>
              <div className="text-xs text-stone-600 mt-1">Agreed {fmtCurrency(d.commissionAgreed)} · Realized so far {fmtCurrency(d.commissionRealized)}</div>
            </div>
            <div className="font-display text-2xl font-bold accent-text" data-testid="commission-realized">{fmtCurrency(d.commissionRealized)}</div>
          </div>
        </div>

        {/* Add payment */}
        <div className="border border-line rounded-md p-4 mb-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold mb-3">Add Payment Entry</div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="col-span-2 sm:col-span-2">
              <Label className="text-[10px] uppercase tracking-[0.15em] text-stone-600 font-semibold mb-1 block">Direction</Label>
              <Select value={form.direction} onValueChange={v => setForm({ ...form, direction: v })}>
                <SelectTrigger data-testid="payment-direction"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="from_party">← From Party (received)</SelectItem>
                  <SelectItem value="to_transporter">→ To Transporter (paid)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-[0.15em] text-stone-600 font-semibold mb-1 block">Date</Label>
              <Input type="date" data-testid="payment-date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-[0.15em] text-stone-600 font-semibold mb-1 block">Amount (₹)</Label>
              <Input type="number" data-testid="payment-amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-[0.15em] text-stone-600 font-semibold mb-1 block">Mode</Label>
              <Select value={form.mode} onValueChange={v => setForm({ ...form, mode: v })}>
                <SelectTrigger data-testid="payment-mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank">Bank Transfer</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-[0.15em] text-stone-600 font-semibold mb-1 block">Ref / Note</Label>
              <Input data-testid="payment-reference" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="UTR / Chq #" />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={addPayment} data-testid="add-payment-button" className="accent-bg text-white"><Plus size={14} className="mr-1.5"/>Add Payment</Button>
          </div>
        </div>

        {/* Ledger lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LedgerList title="Received from Party" items={partyPayments} onDelete={removePayment} testid="party-ledger" />
          <LedgerList title="Paid to Transporter" items={transporterPayments} onDelete={removePayment} testid="transporter-ledger" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LedgerList({ title, items, onDelete, testid }) {
  return (
    <div className="border border-line rounded-md" data-testid={testid}>
      <div className="px-4 py-3 border-b border-line">
        <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold">{title}</div>
        <div className="font-display font-semibold text-sm mt-0.5">{items.length} entries · {fmtCurrency(items.reduce((s, p) => s + (Number(p.amount) || 0), 0))}</div>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-6 text-xs text-stone-500">No entries yet.</div>
      ) : (
        <div className="divide-y divide-line max-h-64 overflow-y-auto">
          {items.map(p => (
            <div key={p.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-mono-num font-semibold text-sm">{fmtCurrency(p.amount)}</div>
                <div className="text-[11px] text-stone-500 mt-0.5">{fmtDate(p.date)} · {p.mode} {p.reference ? `· ${p.reference}` : ""}</div>
              </div>
              <button onClick={() => onDelete(p.id)} data-testid={`delete-payment-${p.id}`} className="p-1 text-stone-500 hover:text-red-600"><Trash2 size={13}/></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
