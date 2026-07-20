import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useFirm } from "@/context/FirmContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";

const empty = { name: "", address: "", phone: "", email: "", gst: "", pan: "", bank_details: "", tagline: "" };

export default function Firms() {
  const { firms, refresh } = useFirm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [delId, setDelId] = useState(null);

  useEffect(() => { refresh(); }, []); // eslint-disable-line

  const openAdd = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (f) => { setEditing(f); setForm({ ...empty, ...f }); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Firm name required"); return; }
    try {
      if (editing) { await api.updateFirm(editing.id, form); toast.success("Firm updated"); }
      else { await api.createFirm(form); toast.success("Firm added"); }
      setOpen(false); refresh();
    } catch { toast.error("Failed to save"); }
  };

  const remove = async () => {
    try { await api.deleteFirm(delId); toast.success("Firm deleted"); setDelId(null); refresh(); } catch { toast.error("Failed"); }
  };

  return (
    <div className="p-8 lg:p-12">
      <PageHeader title="Firms" subtitle="Multiple firms under one workspace. Each trip and expense is tagged to a firm — use the sidebar switcher to filter." testid="firms-header"
        action={<Button onClick={openAdd} data-testid="add-firm-button" className="accent-bg text-white"><Plus size={16} className="mr-1.5"/>Add Firm</Button>} />

      {firms.length === 0 ? (
        <div className="card-flat p-10 text-stone-600">Loading firms…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {firms.map(f => (
            <div key={f.id} className="card-flat p-6 hover:-translate-y-0.5 transition-transform" data-testid={`firm-card-${f.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded accent-soft-bg flex items-center justify-center"><Building2 size={20} className="accent-text"/></div>
                  <div>
                    <div className="font-display font-bold text-lg tracking-tight">{f.name}</div>
                    <div className="text-xs text-stone-500 mt-0.5">{f.tagline || "—"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(f)} data-testid={`edit-firm-${f.id}`} className="p-1.5 text-stone-500 hover:accent-text"><Pencil size={15}/></button>
                  <button onClick={() => setDelId(f.id)} data-testid={`delete-firm-${f.id}`} className="p-1.5 text-stone-500 hover:text-red-600"><Trash2 size={15}/></button>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Info label="Phone" value={f.phone} />
                <Info label="Email" value={f.email} />
                <Info label="GSTIN" value={f.gst} mono />
                <Info label="PAN" value={f.pan} mono />
                <Info label="Address" value={f.address} full />
                <Info label="Bank Details" value={f.bank_details} full />
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle className="font-display">{editing ? "Edit Firm" : "Add Firm"}</SheetTitle><SheetDescription>Firm details are used on invoices.</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-4">
            <F label="Firm Name *"><Input data-testid="input-firm-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value.toUpperCase() })} placeholder="DEEP LOGISTICS" /></F>
            <F label="Tagline"><Input data-testid="input-firm-tagline" value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })} placeholder="Transport & Brokerage" /></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Phone"><Input data-testid="input-firm-phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></F>
              <F label="Email"><Input data-testid="input-firm-email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="GSTIN"><Input data-testid="input-firm-gst" value={form.gst} onChange={e => setForm({ ...form, gst: e.target.value.toUpperCase() })} /></F>
              <F label="PAN"><Input data-testid="input-firm-pan" value={form.pan} onChange={e => setForm({ ...form, pan: e.target.value.toUpperCase() })} /></F>
            </div>
            <F label="Address"><Textarea data-testid="input-firm-address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} /></F>
            <F label="Bank Details"><Textarea data-testid="input-firm-bank" value={form.bank_details} onChange={e => setForm({ ...form, bank_details: e.target.value })} placeholder="Bank name, A/c no, IFSC" rows={2} /></F>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} data-testid="save-firm" className="accent-bg text-white">{editing ? "Update" : "Add"}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!delId} onOpenChange={() => setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete firm?</AlertDialogTitle><AlertDialogDescription>Trips already tagged to this firm will keep their firm_name text but will no longer link to this firm. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-red-600 text-white">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function F({ label, children }) { return (<div><Label className="text-[11px] uppercase tracking-[0.15em] text-stone-600 font-semibold mb-1.5 block">{label}</Label>{children}</div>); }

function Info({ label, value, mono, full }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-bold">{label}</div>
      <div className={`mt-1 ${mono ? "font-mono-num text-xs" : "text-sm"} text-stone-800`}>{value || "—"}</div>
    </div>
  );
}
