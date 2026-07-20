import { useEffect, useMemo, useState } from "react";
import { api, fmtCurrency, fmtDate } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, FileText, Route as RouteIcon, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const emptyForm = () => ({
  lr_number: "", date: new Date().toISOString().slice(0, 10),
  from_location: "", to_location: "",
  transporter_id: "", transporter_name: "",
  party_id: "", party_name: "",
  truck_number: "", driver_name: "",
  material: "", weight: "",
  freight_amount: 0, commission_percent: 0, commission_amount: 0,
  advance_paid: 0, balance: 0,
  status: "pending", commission_received: false, notes: "",
});

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

  const load = () => api.listTrips().then(setItems);
  useEffect(() => {
    load();
    api.listParties("transporter").then(setTransporters);
    api.listParties("consignor").then(setConsignors);
    api.listTrucks().then(setTrucks);
    api.listDrivers().then(setDrivers);
  }, []);

  // Auto compute commission_amount whenever freight or % changes
  useEffect(() => {
    const f = Number(form.freight_amount) || 0;
    const p = Number(form.commission_percent) || 0;
    if (p > 0) {
      const c = +(f * p / 100).toFixed(2);
      setForm(prev => ({ ...prev, commission_amount: c, balance: +(f - (Number(prev.advance_paid) || 0)).toFixed(2) }));
    } else {
      setForm(prev => ({ ...prev, balance: +(f - (Number(prev.advance_paid) || 0)).toFixed(2) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.freight_amount, form.commission_percent, form.advance_paid]);

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
  const openEdit = (t) => { setEditing(t); setForm({ ...emptyForm(), ...t }); setOpen(true); };

  const save = async () => {
    if (!form.from_location.trim() || !form.to_location.trim()) { toast.error("From and To are required"); return; }
    const payload = {
      ...form,
      freight_amount: Number(form.freight_amount) || 0,
      commission_percent: Number(form.commission_percent) || 0,
      commission_amount: Number(form.commission_amount) || 0,
      advance_paid: Number(form.advance_paid) || 0,
      balance: Number(form.balance) || 0,
    };
    try {
      if (editing) { await api.updateTrip(editing.id, payload); toast.success("Trip updated"); }
      else { await api.createTrip(payload); toast.success("Trip added"); }
      setOpen(false); load();
    } catch { toast.error("Failed to save"); }
  };

  const remove = async () => { try { await api.deleteTrip(delId); toast.success("Deleted"); setDelId(null); load(); } catch { toast.error("Failed"); } };

  return (
    <div className="p-8 lg:p-12">
      <PageHeader title="Trips / Loads" subtitle="Every consignment moved through your brokerage — with automatic commission calculation." testid="trips-header"
        action={<Button onClick={openAdd} data-testid="add-trip-button" className="accent-bg text-white"><Plus size={16} className="mr-1.5"/>New Trip</Button>} />

      {/* Filters */}
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
          <table className="tms-table w-full min-w-[1100px]">
            <thead>
              <tr>
                <th>Date</th><th>LR</th><th>Route</th><th>Truck</th><th>Transporter</th><th>Party</th>
                <th className="num">Freight</th><th className="num">Comm %</th><th className="num">Commission</th>
                <th>Status</th><th className="text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} data-testid={`trip-row-${t.id}`}>
                  <td>{fmtDate(t.date)}</td>
                  <td className="font-mono-num text-xs font-semibold">{t.lr_number || "-"}</td>
                  <td>{t.from_location} → {t.to_location}</td>
                  <td className="font-mono-num text-xs">{t.truck_number || "-"}</td>
                  <td>{t.transporter_name || "-"}</td>
                  <td>{t.party_name || "-"}</td>
                  <td className="num">{fmtCurrency(t.freight_amount)}</td>
                  <td className="num">{t.commission_percent ? `${t.commission_percent}%` : "-"}</td>
                  <td className="num accent-text font-semibold">{fmtCurrency(t.commission_amount)}</td>
                  <td><span className={`status-badge status-${t.status}`}>{t.status.replace("_"," ")}</span></td>
                  <td className="text-right pr-4 whitespace-nowrap">
                    <Link to={`/invoice/${t.id}`} target="_blank" data-testid={`invoice-trip-${t.id}`} className="inline-block p-1.5 text-stone-600 hover:accent-text"><FileText size={15}/></Link>
                    <button onClick={() => openEdit(t)} data-testid={`edit-trip-${t.id}`} className="p-1.5 text-stone-600 hover:accent-text"><Pencil size={15}/></button>
                    <button onClick={() => setDelId(t.id)} data-testid={`delete-trip-${t.id}`} className="p-1.5 text-stone-600 hover:text-red-600"><Trash2 size={15}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle className="font-display">{editing ? "Edit Trip" : "New Trip"}</SheetTitle><SheetDescription>Commission is auto-calculated from Freight × %.</SheetDescription></SheetHeader>
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
              <div className="text-[10px] uppercase tracking-[0.2em] accent-text font-bold mb-3">Financials</div>
              <div className="grid grid-cols-2 gap-3">
                <F label="Freight Amount (₹)"><Input type="number" data-testid="input-trip-freight" value={form.freight_amount} onChange={e => setForm({ ...form, freight_amount: e.target.value })} /></F>
                <F label="Commission %"><Input type="number" step="0.01" data-testid="input-trip-commpct" value={form.commission_percent} onChange={e => setForm({ ...form, commission_percent: e.target.value })} /></F>
                <F label="Commission Amount (₹)"><Input type="number" data-testid="input-trip-commamt" value={form.commission_amount} onChange={e => setForm({ ...form, commission_amount: e.target.value })} /></F>
                <F label="Advance Paid (₹)"><Input type="number" data-testid="input-trip-advance" value={form.advance_paid} onChange={e => setForm({ ...form, advance_paid: e.target.value })} /></F>
              </div>
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
