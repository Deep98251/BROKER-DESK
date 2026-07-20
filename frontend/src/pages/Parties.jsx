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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

const empty = { name: "", type: "consignor", phone: "", email: "", address: "", gst: "", notes: "" };

export default function Parties() {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [delId, setDelId] = useState(null);

  const load = () => api.listParties().then(setItems);
  useEffect(() => { load(); }, []);

  const filtered = tab === "all" ? items : items.filter(p => p.type === tab);

  const save = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    try {
      if (editing) { await api.updateParty(editing.id, form); toast.success("Updated"); }
      else { await api.createParty(form); toast.success("Added"); }
      setOpen(false); load();
    } catch { toast.error("Failed"); }
  };

  const remove = async () => { try { await api.deleteParty(delId); toast.success("Deleted"); setDelId(null); load(); } catch { toast.error("Failed"); } };

  return (
    <div className="p-8 lg:p-12">
      <PageHeader title="Parties" subtitle="Both sides of your deals — transporters that own trucks and parties (consignors) who ship goods." testid="parties-header"
        action={<Button onClick={() => { setEditing(null); setForm(empty); setOpen(true); }} data-testid="add-party-button" className="accent-bg text-white"><Plus size={16} className="mr-1.5"/>Add Party</Button>} />

      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList data-testid="parties-tabs">
          <TabsTrigger value="all" data-testid="tab-all">All ({items.length})</TabsTrigger>
          <TabsTrigger value="transporter" data-testid="tab-transporter">Transporters ({items.filter(p => p.type === "transporter").length})</TabsTrigger>
          <TabsTrigger value="consignor" data-testid="tab-consignor">Consignors / Parties ({items.filter(p => p.type === "consignor").length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState title="No parties yet" description="Add transporters and consignors to link them to your trips." icon={Users}
          action={<Button onClick={() => setOpen(true)} className="accent-bg text-white"><Plus size={16} className="mr-1.5"/>Add Party</Button>} />
      ) : (
        <div className="card-flat p-2 overflow-x-auto">
          <table className="tms-table w-full">
            <thead><tr><th>Name</th><th>Type</th><th>Phone</th><th>GST</th><th>Address</th><th className="text-right pr-4">Actions</th></tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td className="font-semibold">{p.name}</td>
                  <td><span className={`status-badge ${p.type === "transporter" ? "status-in_transit" : "status-delivered"}`}>{p.type}</span></td>
                  <td>{p.phone || "-"}</td>
                  <td className="font-mono-num text-xs">{p.gst || "-"}</td>
                  <td className="max-w-xs truncate">{p.address || "-"}</td>
                  <td className="text-right pr-4">
                    <button onClick={() => { setEditing(p); setForm({ ...empty, ...p }); setOpen(true); }} data-testid={`edit-party-${p.id}`} className="p-1.5 text-stone-600 hover:accent-text"><Pencil size={15}/></button>
                    <button onClick={() => setDelId(p.id)} data-testid={`delete-party-${p.id}`} className="p-1.5 text-stone-600 hover:text-red-600"><Trash2 size={15}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader><SheetTitle className="font-display">{editing ? "Edit Party" : "Add Party"}</SheetTitle><SheetDescription>Enter details.</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-4">
            <F label="Name *"><Input data-testid="input-party-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></F>
            <F label="Type *">
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger data-testid="input-party-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transporter">Transporter (owns truck)</SelectItem>
                  <SelectItem value="consignor">Consignor / Party (ships goods)</SelectItem>
                </SelectContent>
              </Select>
            </F>
            <F label="Phone"><Input data-testid="input-party-phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></F>
            <F label="Email"><Input data-testid="input-party-email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></F>
            <F label="GST Number"><Input data-testid="input-party-gst" value={form.gst} onChange={e => setForm({ ...form, gst: e.target.value.toUpperCase() })} /></F>
            <F label="Address"><Textarea data-testid="input-party-address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></F>
            <F label="Notes"><Textarea data-testid="input-party-notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></F>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} data-testid="save-party" className="accent-bg text-white">{editing ? "Update" : "Add"}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!delId} onOpenChange={() => setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete party?</AlertDialogTitle><AlertDialogDescription>Cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-red-600 text-white">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
function F({ label, children }) { return (<div><Label className="text-[11px] uppercase tracking-[0.15em] text-stone-600 font-semibold mb-1.5 block">{label}</Label>{children}</div>); }
