import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, fmtCurrency, fmtDate } from "@/lib/api";
import { useFirm } from "@/context/FirmContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Trash2, Printer, Building2 } from "lucide-react";
import { toast } from "sonner";

const KIND_OPTIONS = [
  { value: "payment", label: "Payment / Receipt" },
  { value: "adjustment", label: "Adjustment" },
  { value: "opening", label: "Opening Balance" },
];

export default function PartyLedger() {
  const { id } = useParams();
  const nav = useNavigate();
  const { selectedId } = useFirm();
  const [data, setData] = useState(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [delId, setDelId] = useState(null);
  const [entryForm, setEntryForm] = useState(null);

  const load = useCallback(async () => {
    const d = await api.getPartyLedger(id, selectedId);
    setData(d);
  }, [id, selectedId]);

  useEffect(() => { load(); }, [load]);

  const openAddEntry = (defaults = {}) => {
    if (!data) return;
    const isConsignor = data.party.type === "consignor";
    setEntryForm({
      date: new Date().toISOString().slice(0, 10),
      amount: 0,
      side: isConsignor ? "credit" : "debit", // default: consignor→receipt (credit), transporter→payment (debit)
      kind: "payment",
      mode: "Cash",
      reference: "",
      notes: "",
      ...defaults,
    });
    setEntryOpen(true);
  };

  const submitEntry = async () => {
    if (!entryForm) return;
    const amt = Number(entryForm.amount) || 0;
    if (amt <= 0) { toast.error("Amount must be > 0"); return; }
    try {
      await api.createPartyPayment({
        firm_id: selectedId || "",
        party_id: data.party.id,
        party_name: data.party.name,
        party_type: data.party.type,
        date: entryForm.date,
        amount: amt,
        side: entryForm.side,
        kind: entryForm.kind,
        mode: entryForm.mode,
        reference: entryForm.reference,
        notes: entryForm.notes,
      });
      toast.success("Ledger entry added");
      setEntryOpen(false);
      load();
    } catch { toast.error("Failed"); }
  };

  const deleteEntry = async () => {
    try {
      await api.deletePartyPayment(delId);
      toast.success("Entry removed");
      setDelId(null);
      load();
    } catch { toast.error("Failed"); }
  };

  if (!data) return <div className="p-12 text-stone-600">Loading ledger…</div>;

  const isConsignor = data.party.type === "consignor";
  const balance = data.totals.balance;
  const netLabel = isConsignor
    ? (balance > 0 ? "Receivable from Party" : balance < 0 ? "Advance / Credit balance" : "All Settled")
    : (balance < 0 ? "Payable to Transporter" : balance > 0 ? "Advance paid / Recoverable" : "All Settled");
  const netColor = (isConsignor && balance > 0) || (!isConsignor && balance < 0) ? "#C04848" : balance === 0 ? "#4D7A58" : "#4D7A58";

  return (
    <div className="p-8 lg:p-12">
      <button onClick={() => nav("/parties")} data-testid="back-to-parties" className="text-sm text-stone-600 hover:accent-text flex items-center gap-2 mb-6"><ArrowLeft size={15}/>Back to Parties</button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500 font-bold mb-2">Party Ledger</div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded accent-soft-bg flex items-center justify-center"><Building2 size={20} className="accent-text"/></div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-stone-900" data-testid="ledger-party-name">{data.party.name}</h1>
              <div className="text-xs text-stone-500 mt-1">
                <span className={`status-badge ${isConsignor ? "status-delivered" : "status-in_transit"}`}>{data.party.type}</span>
                {data.party.phone && <span className="ml-3">{data.party.phone}</span>}
                {data.party.gst && <span className="ml-3 font-mono-num">GST: {data.party.gst}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.print()} data-testid="print-ledger"><Printer size={14} className="mr-1.5"/>Print</Button>
          <Button onClick={() => openAddEntry()} data-testid="add-ledger-entry" className="accent-bg text-white"><Plus size={15} className="mr-1.5"/>Add Entry</Button>
        </div>
      </div>

      {/* Balance card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card-flat p-5" data-testid="ledger-total-debit">
          <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold">Total Debit</div>
          <div className="font-display text-2xl font-bold mt-2">{fmtCurrency(data.totals.debit)}</div>
          <div className="text-xs text-stone-500 mt-1">{isConsignor ? "Billed to party" : "Paid to transporter"}</div>
        </div>
        <div className="card-flat p-5" data-testid="ledger-total-credit">
          <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold">Total Credit</div>
          <div className="font-display text-2xl font-bold mt-2">{fmtCurrency(data.totals.credit)}</div>
          <div className="text-xs text-stone-500 mt-1">{isConsignor ? "Received from party" : "Freight owed"}</div>
        </div>
        <div className="card-flat p-5 border-l-4" style={{ borderLeftColor: netColor }} data-testid="ledger-net-balance">
          <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold">{netLabel}</div>
          <div className="font-display text-3xl font-bold mt-2" style={{ color: netColor }}>{fmtCurrency(Math.abs(balance))}</div>
          <div className="text-xs text-stone-500 mt-1">Net = Debit − Credit</div>
        </div>
      </div>

      {/* Quick action */}
      <div className="mb-4 flex items-center gap-2 text-xs text-stone-600">
        {isConsignor ? (
          <Button size="sm" variant="outline" onClick={() => openAddEntry({ side: "credit", kind: "payment" })} data-testid="quick-add-receipt">+ Quick Receipt (money received)</Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => openAddEntry({ side: "debit", kind: "payment" })} data-testid="quick-add-payment">+ Quick Payment (money paid)</Button>
        )}
      </div>

      {/* Ledger table */}
      <div className="card-flat p-2 overflow-x-auto" data-testid="ledger-table-wrap">
        <table className="tms-table w-full min-w-[900px]">
          <thead>
            <tr>
              <th style={{ width: "110px" }}>Date</th>
              <th>Description</th>
              <th>Ref</th>
              <th className="num">Debit</th>
              <th className="num">Credit</th>
              <th className="num">Balance</th>
              <th className="text-right pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {data.entries.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-stone-500">No ledger entries yet. Add trips or payments to see the ledger build up.</td></tr>
            )}
            {data.entries.map((e, i) => (
              <tr key={i} data-testid={`ledger-row-${i}`}>
                <td className="text-xs">{fmtDate(e.date)}</td>
                <td>
                  {e.trip_id ? (
                    <Link to={`/invoice/${e.trip_id}`} target="_blank" className="hover:accent-text underline decoration-dotted">{e.description}</Link>
                  ) : e.description}
                </td>
                <td className="font-mono-num text-xs text-stone-500">{e.reference || "-"}</td>
                <td className="num">{e.debit ? fmtCurrency(e.debit) : "-"}</td>
                <td className="num">{e.credit ? fmtCurrency(e.credit) : "-"}</td>
                <td className="num font-semibold" style={{ color: e.balance > 0 && isConsignor ? "#C04848" : e.balance < 0 && !isConsignor ? "#C04848" : "#1A1A1A" }}>{fmtCurrency(Math.abs(e.balance))} {e.balance < 0 ? "Cr" : e.balance > 0 ? "Dr" : ""}</td>
                <td className="text-right pr-4">
                  {e.party_payment_id && (
                    <button onClick={() => setDelId(e.party_payment_id)} data-testid={`delete-ledger-entry-${e.party_payment_id}`} className="p-1 text-stone-500 hover:text-red-600"><Trash2 size={13}/></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {data.entries.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3} className="text-right font-semibold pr-2">Totals:</td>
                <td className="num font-bold">{fmtCurrency(data.totals.debit)}</td>
                <td className="num font-bold">{fmtCurrency(data.totals.credit)}</td>
                <td className="num font-bold accent-text">{fmtCurrency(Math.abs(balance))} {balance < 0 ? "Cr" : balance > 0 ? "Dr" : ""}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Add Entry Dialog */}
      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent className="max-w-lg" data-testid="ledger-entry-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Add Ledger Entry</DialogTitle>
            <DialogDescription>{isConsignor ? "For a receipt from party, use Credit. For an extra charge, use Debit." : "For a payment made to transporter, use Debit. For an extra amount owed, use Credit."}</DialogDescription>
          </DialogHeader>
          {entryForm && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <F label="Date"><Input type="date" data-testid="entry-date" value={entryForm.date} onChange={e => setEntryForm({ ...entryForm, date: e.target.value })} /></F>
                <F label="Amount (₹)"><Input type="number" data-testid="entry-amount" value={entryForm.amount} onChange={e => setEntryForm({ ...entryForm, amount: e.target.value })} /></F>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="Side">
                  <Select value={entryForm.side} onValueChange={v => setEntryForm({ ...entryForm, side: v })}>
                    <SelectTrigger data-testid="entry-side"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">{isConsignor ? "Credit — money received" : "Credit — additional amount owed"}</SelectItem>
                      <SelectItem value="debit">{isConsignor ? "Debit — extra charge" : "Debit — money paid"}</SelectItem>
                    </SelectContent>
                  </Select>
                </F>
                <F label="Kind">
                  <Select value={entryForm.kind} onValueChange={v => setEntryForm({ ...entryForm, kind: v })}>
                    <SelectTrigger data-testid="entry-kind"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KIND_OPTIONS.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </F>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="Mode">
                  <Select value={entryForm.mode} onValueChange={v => setEntryForm({ ...entryForm, mode: v })}>
                    <SelectTrigger data-testid="entry-mode"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank">Bank Transfer</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </F>
                <F label="Reference"><Input data-testid="entry-reference" value={entryForm.reference} onChange={e => setEntryForm({ ...entryForm, reference: e.target.value })} placeholder="UTR / Chq #" /></F>
              </div>
              <F label="Notes"><Textarea data-testid="entry-notes" value={entryForm.notes} onChange={e => setEntryForm({ ...entryForm, notes: e.target.value })} placeholder="Optional description" rows={2} /></F>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEntryOpen(false)}>Cancel</Button>
                <Button onClick={submitEntry} data-testid="save-ledger-entry" className="accent-bg text-white">Add Entry</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delId} onOpenChange={() => setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this ledger entry?</AlertDialogTitle><AlertDialogDescription>Trip-linked entries can't be deleted from here (edit the trip's payments instead). Only standalone entries can be removed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={deleteEntry} className="bg-red-600 text-white">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function F({ label, children }) { return (<div><Label className="text-[11px] uppercase tracking-[0.15em] text-stone-600 font-semibold mb-1.5 block">{label}</Label>{children}</div>); }
