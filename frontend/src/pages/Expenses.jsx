import { useEffect, useState } from "react";
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
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

const CATS = ["Fuel", "Toll", "Repair & Maintenance", "Driver Payment", "Office", "Loading/Unloading", "Other"];
const empty = () => ({ date: new Date().toISOString().slice(0,10), category: "Fuel", amount: 0, description: "", trip_id: "" });

export default function Expenses() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty());
  const [delId, setDelId] = useState(null);

  const load = () => api.listExpenses().then(setItems);
  useEffect(() => { load(); }, []);

  const save = async () => {
    const payload = { ...form, amount: Number(form.amount) || 0 };
    try {
      if (editing) { await api.updateExpense(editing.id, payload); toast.success("Updated"); }
      else { await api.createExpense(payload); toast.success("Added"); }
      setOpen(false); load();
    } catch { toast.error("Failed"); }
  };

  const remove = async () => { try { await api.deleteExpense(delId); toast.success("Deleted"); setDelId(null); load(); } catch { toast.error("Failed"); } };

  const total = items.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  return (
    <div className="p-8 lg:p-12">
      <PageHeader title="Expenses" subtitle="Track fuel, tolls, repairs and all overheads that eat into your commission." testid="expenses-header"
        action={<Button onClick={() => { setEditing(null); setForm(empty()); setOpen(true); }} data-testid="add-expense-button" className="accent-bg text-white"><Plus size={16} className="mr-1.5"/>Add Expense</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <div className="card-flat p-5" data-testid="total-expenses">
          <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold">Total Expenses</div>
          <div className="font-display text-3xl font-bold mt-2 text-stone-900">{fmtCurrency(total)}</div>
        </div>
        <div className="card-flat p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold">Entries</div>
          <div className="font-display text-3xl font-bold mt-2 text-stone-900">{items.length}</div>
        </div>
        <div className="card-flat p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold">Categories</div>
          <div className="font-display text-3xl font-bold mt-2 text-stone-900">{new Set(items.map(i => i.category)).size}</div>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No expenses recorded" description="Start logging expenses to see the true net profit of your brokerage." icon={Wallet}
          action={<Button onClick={() => setOpen(true)} className="accent-bg text-white"><Plus size={16} className="mr-1.5"/>Add Expense</Button>} />
      ) : (
        <div className="card-flat p-2 overflow-x-auto">
          <table className="tms-table w-full">
            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th className="num">Amount</th><th className="text-right pr-4">Actions</th></tr></thead>
            <tbody>
              {items.map(e => (
                <tr key={e.id}>
                  <td>{fmtDate(e.date)}</td>
                  <td><span className="status-badge status-in_transit">{e.category}</span></td>
                  <td className="max-w-md truncate">{e.description || "-"}</td>
                  <td className="num font-semibold">{fmtCurrency(e.amount)}</td>
                  <td className="text-right pr-4">
                    <button onClick={() => { setEditing(e); setForm({ ...empty(), ...e }); setOpen(true); }} data-testid={`edit-expense-${e.id}`} className="p-1.5 text-stone-600 hover:accent-text"><Pencil size={15}/></button>
                    <button onClick={() => setDelId(e.id)} data-testid={`delete-expense-${e.id}`} className="p-1.5 text-stone-600 hover:text-red-600"><Trash2 size={15}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader><SheetTitle className="font-display">{editing ? "Edit Expense" : "Add Expense"}</SheetTitle><SheetDescription>Log a business expense.</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-4">
            <F label="Date"><Input type="date" data-testid="input-expense-date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></F>
            <F label="Category">
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger data-testid="input-expense-category"><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Amount (₹)"><Input type="number" data-testid="input-expense-amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></F>
            <F label="Description"><Textarea data-testid="input-expense-desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></F>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} data-testid="save-expense" className="accent-bg text-white">{editing ? "Update" : "Add"}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!delId} onOpenChange={() => setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete expense?</AlertDialogTitle><AlertDialogDescription>Cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-red-600 text-white">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
function F({ label, children }) { return (<div><Label className="text-[11px] uppercase tracking-[0.15em] text-stone-600 font-semibold mb-1.5 block">{label}</Label>{children}</div>); }
