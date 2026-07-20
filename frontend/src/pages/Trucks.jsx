import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";

const empty = { number: "", type: "Open Body", capacity: "", owner_name: "", contact: "", notes: "" };

export default function Trucks() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [delId, setDelId] = useState(null);

  const load = () => api.listTrucks().then(setItems);
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (t) => { setEditing(t); setForm({ ...empty, ...t }); setOpen(true); };

  const save = async () => {
    if (!form.number.trim()) { toast.error("Truck number is required"); return; }
    try {
      if (editing) { await api.updateTruck(editing.id, form); toast.success("Truck updated"); }
      else { await api.createTruck(form); toast.success("Truck added"); }
      setOpen(false); load();
    } catch (e) { toast.error("Failed to save"); }
  };

  const remove = async () => {
    try { await api.deleteTruck(delId); toast.success("Truck deleted"); setDelId(null); load(); }
    catch { toast.error("Failed to delete"); }
  };

  return (
    <div className="p-8 lg:p-12">
      <PageHeader
        title="Trucks"
        subtitle="Your fleet directory — trucks you commonly deal with."
        testid="trucks-header"
        action={<Button onClick={openAdd} data-testid="add-truck-button" className="accent-bg text-white hover:opacity-90"><Plus size={16} className="mr-1.5"/>Add Truck</Button>}
      />

      {items.length === 0 ? (
        <EmptyState title="No trucks added yet" description="Add your first truck to start tracking capacity, ownership and contact." icon={Truck}
          action={<Button onClick={openAdd} data-testid="empty-add-truck" className="accent-bg text-white"><Plus size={16} className="mr-1.5"/>Add Truck</Button>} />
      ) : (
        <div className="card-flat p-2 overflow-x-auto">
          <table className="tms-table w-full">
            <thead>
              <tr>
                <th>Number</th><th>Type</th><th>Capacity</th><th>Owner</th><th>Contact</th><th className="text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(t => (
                <tr key={t.id} data-testid={`truck-row-${t.id}`}>
                  <td className="font-semibold">{t.number}</td>
                  <td>{t.type}</td>
                  <td>{t.capacity || "-"}</td>
                  <td>{t.owner_name || "-"}</td>
                  <td>{t.contact || "-"}</td>
                  <td className="text-right pr-4">
                    <button onClick={() => openEdit(t)} data-testid={`edit-truck-${t.id}`} className="text-stone-600 hover:accent-text p-1.5"><Pencil size={15}/></button>
                    <button onClick={() => setDelId(t.id)} data-testid={`delete-truck-${t.id}`} className="text-stone-600 hover:text-red-600 p-1.5"><Trash2 size={15}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display">{editing ? "Edit Truck" : "Add Truck"}</SheetTitle>
            <SheetDescription>Enter the truck's details.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <Field label="Truck Number *"><Input data-testid="input-truck-number" value={form.number} onChange={e => setForm({ ...form, number: e.target.value.toUpperCase() })} placeholder="MH12 AB 1234" /></Field>
            <Field label="Type"><Input data-testid="input-truck-type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} placeholder="Open Body / Container / Trailer" /></Field>
            <Field label="Capacity"><Input data-testid="input-truck-capacity" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} placeholder="e.g. 20 Ton" /></Field>
            <Field label="Owner Name"><Input data-testid="input-truck-owner" value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} /></Field>
            <Field label="Contact"><Input data-testid="input-truck-contact" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></Field>
            <Field label="Notes"><Textarea data-testid="input-truck-notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)} data-testid="cancel-truck">Cancel</Button>
              <Button onClick={save} data-testid="save-truck" className="accent-bg text-white">{editing ? "Update" : "Add"}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!delId} onOpenChange={() => setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this truck?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} data-testid="confirm-delete" className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-[11px] uppercase tracking-[0.15em] text-stone-600 font-semibold mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
