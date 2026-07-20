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
import { Plus, Pencil, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

const empty = { name: "", phone: "", license_number: "", address: "" };

export default function Drivers() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [delId, setDelId] = useState(null);

  const load = () => api.listDrivers().then(setItems);
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim()) { toast.error("Driver name is required"); return; }
    try {
      if (editing) { await api.updateDriver(editing.id, form); toast.success("Driver updated"); }
      else { await api.createDriver(form); toast.success("Driver added"); }
      setOpen(false); load();
    } catch { toast.error("Failed to save"); }
  };

  const remove = async () => {
    try { await api.deleteDriver(delId); toast.success("Driver deleted"); setDelId(null); load(); } catch { toast.error("Failed"); }
  };

  return (
    <div className="p-8 lg:p-12">
      <PageHeader title="Drivers" subtitle="Directory of drivers you work with regularly." testid="drivers-header"
        action={<Button onClick={() => { setEditing(null); setForm(empty); setOpen(true); }} data-testid="add-driver-button" className="accent-bg text-white"><Plus size={16} className="mr-1.5"/>Add Driver</Button>}
      />

      {items.length === 0 ? (
        <EmptyState title="No drivers added yet" description="Add drivers to quickly assign them to trips." icon={UserRound}
          action={<Button onClick={() => setOpen(true)} data-testid="empty-add-driver" className="accent-bg text-white"><Plus size={16} className="mr-1.5"/>Add Driver</Button>} />
      ) : (
        <div className="card-flat p-2 overflow-x-auto">
          <table className="tms-table w-full">
            <thead><tr><th>Name</th><th>Phone</th><th>License No.</th><th>Address</th><th className="text-right pr-4">Actions</th></tr></thead>
            <tbody>
              {items.map(d => (
                <tr key={d.id}>
                  <td className="font-semibold">{d.name}</td>
                  <td>{d.phone || "-"}</td>
                  <td className="font-mono-num text-xs">{d.license_number || "-"}</td>
                  <td>{d.address || "-"}</td>
                  <td className="text-right pr-4">
                    <button onClick={() => { setEditing(d); setForm({ ...empty, ...d }); setOpen(true); }} data-testid={`edit-driver-${d.id}`} className="p-1.5 text-stone-600 hover:accent-text"><Pencil size={15}/></button>
                    <button onClick={() => setDelId(d.id)} data-testid={`delete-driver-${d.id}`} className="p-1.5 text-stone-600 hover:text-red-600"><Trash2 size={15}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader><SheetTitle className="font-display">{editing ? "Edit Driver" : "Add Driver"}</SheetTitle><SheetDescription>Driver details.</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-4">
            <F label="Name *"><Input data-testid="input-driver-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></F>
            <F label="Phone"><Input data-testid="input-driver-phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></F>
            <F label="License Number"><Input data-testid="input-driver-license" value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })} /></F>
            <F label="Address"><Textarea data-testid="input-driver-address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></F>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} data-testid="save-driver" className="accent-bg text-white">{editing ? "Update" : "Add"}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!delId} onOpenChange={() => setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete driver?</AlertDialogTitle><AlertDialogDescription>Cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-red-600 text-white">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
function F({ label, children }) { return (<div><Label className="text-[11px] uppercase tracking-[0.15em] text-stone-600 font-semibold mb-1.5 block">{label}</Label>{children}</div>); }
