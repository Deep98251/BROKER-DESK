import { useEffect, useState } from "react";
import { api, fmtCurrency, fmtDate } from "@/lib/api";
import { useFirm } from "@/context/FirmContext";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Coins, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function Commission() {
  const { selectedId, selectedName } = useFirm();
  const [s, setS] = useState(null);
  const [trips, setTrips] = useState([]);

  const load = () => {
    api.summary(selectedId).then(setS);
    api.listTrips(selectedId).then(setTrips);
  };
  useEffect(() => { load(); }, [selectedId]); // eslint-disable-line

  const markReceived = async (t) => {
    try {
      await api.updateTrip(t.id, { ...t, commission_received: true });
      toast.success("Marked as received");
      load();
    } catch { toast.error("Failed"); }
  };

  const pendingList = trips.filter(t => (t.commission_amount || 0) > 0 && !t.commission_received);
  const receivedList = trips.filter(t => (t.commission_amount || 0) > 0 && t.commission_received);

  return (
    <div className="p-8 lg:p-12">
      <PageHeader title="Commission" subtitle={`Revenue engine for ${selectedName === "All Firms" ? "your brokerage" : selectedName} — every rupee, tracked and traceable.`} testid="commission-header" />

      {/* Hero Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <div className="lg:col-span-5 p-8 rounded-md border-line" style={{ background: "linear-gradient(135deg, #D95E36 0%, #B94826 100%)", color: "white" }} data-testid="commission-hero">
          <div className="text-[11px] uppercase tracking-[0.22em] font-bold opacity-80">Total Commission Earned</div>
          <div className="font-display text-5xl sm:text-6xl font-bold tracking-tight mt-4">{fmtCurrency(s?.total_commission || 0)}</div>
          <div className="mt-6 flex items-center gap-8">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] opacity-70 font-bold">Received</div>
              <div className="font-display text-2xl font-semibold mt-1">{fmtCurrency(s?.received_commission || 0)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] opacity-70 font-bold">Pending</div>
              <div className="font-display text-2xl font-semibold mt-1">{fmtCurrency(s?.pending_commission || 0)}</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 card-flat p-6" data-testid="commission-monthly-chart">
          <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold">Monthly earnings</div>
          <div className="font-display font-semibold text-lg mt-1 mb-4">Last 6 months</div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={s?.monthly || []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#EFEFEA" vertical={false} />
                <XAxis dataKey="month" stroke="#999" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#999" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ border: "1px solid #E5E5E0", borderRadius: 6, fontSize: 12 }} formatter={(v) => fmtCurrency(v)} />
                <Bar dataKey="commission" fill="#D95E36" radius={[4,4,0,0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pending & Received */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-flat p-6" data-testid="pending-commissions">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded surface-muted flex items-center justify-center"><Clock size={15} className="text-stone-600"/></div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold">Awaiting</div>
              <div className="font-display font-semibold text-lg">Pending Commission ({pendingList.length})</div>
            </div>
          </div>
          {pendingList.length === 0 ? (
            <div className="text-sm text-stone-500 py-6">All commissions received 🎯</div>
          ) : (
            <div className="divide-y divide-line">
              {pendingList.map(t => (
                <div key={t.id} className="flex items-center gap-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{t.from_location} → {t.to_location}</div>
                    <div className="text-xs text-stone-500 mt-0.5">{t.party_name || "—"} · {fmtDate(t.date)} · LR {t.lr_number || "-"}</div>
                  </div>
                  <div className="font-mono-num font-semibold accent-text">{fmtCurrency(t.commission_amount)}</div>
                  <Button size="sm" variant="outline" onClick={() => markReceived(t)} data-testid={`mark-received-${t.id}`} className="text-xs"><Check size={13} className="mr-1"/>Mark received</Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-flat p-6" data-testid="received-commissions">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded accent-soft-bg flex items-center justify-center"><Check size={15} className="accent-text"/></div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold">Cleared</div>
              <div className="font-display font-semibold text-lg">Received Commission ({receivedList.length})</div>
            </div>
          </div>
          {receivedList.length === 0 ? (
            <EmptyState title="Nothing here yet" description="Once you mark commissions as received, they show up here." icon={Coins} />
          ) : (
            <div className="divide-y divide-line">
              {receivedList.map(t => (
                <div key={t.id} className="flex items-center gap-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{t.from_location} → {t.to_location}</div>
                    <div className="text-xs text-stone-500 mt-0.5">{t.party_name || "—"} · {fmtDate(t.date)}</div>
                  </div>
                  <div className="font-mono-num font-semibold text-green-700">{fmtCurrency(t.commission_amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
