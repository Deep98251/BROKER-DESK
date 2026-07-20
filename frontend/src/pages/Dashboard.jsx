import { useEffect, useState } from "react";
import { api, fmtCurrency, fmtDate } from "@/lib/api";
import { useFirm } from "@/context/FirmContext";
import PageHeader from "@/components/PageHeader";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ArrowUpRight, Truck, Users, UserRound, TrendingUp, Wallet, Coins, Route as RouteIcon } from "lucide-react";
import { computeTripDerived } from "@/pages/Trips";

const StatCard = ({ label, value, sub, testid, accent }) => (
  <div className={`card-flat p-5 ${accent ? "border-l-4" : ""}`} style={accent ? { borderLeftColor: "var(--accent)" } : {}} data-testid={testid}>
    <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold">{label}</div>
    <div className={`font-display mt-3 text-3xl font-bold tracking-tight ${accent ? "accent-text" : "text-stone-900"}`}>{value}</div>
    {sub && <div className="text-xs text-stone-500 mt-1.5">{sub}</div>}
  </div>
);

export default function Dashboard() {
  const { selectedId, selectedName } = useFirm();
  const [s, setS] = useState(null);
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    api.summary(selectedId).then(setS).catch(() => {});
    api.listTrips(selectedId).then(setTrips).catch(() => {});
  }, [selectedId]);

  const recent = trips.slice(0, 6);

  return (
    <div className="p-8 lg:p-12">
      <PageHeader
        title="Dashboard"
        subtitle={`A live snapshot of ${selectedName === "All Firms" ? "your brokerage" : selectedName} — commissions, active trips, and cash movement in one glance.`}
        testid="dashboard-header"
        action={
          <Link to="/trips" data-testid="dashboard-cta-newtrip" className="inline-flex items-center gap-2 accent-bg text-white px-4 py-2.5 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity">
            View all trips <ArrowUpRight size={16} />
          </Link>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard testid="stat-commission" accent label="Total Commission" value={fmtCurrency(s?.total_commission || 0)} sub={`${fmtCurrency(s?.received_commission || 0)} received`} />
        <StatCard testid="stat-party-receivable" label="Party Receivable" value={fmtCurrency(s?.party_receivable_total || 0)} sub={`${fmtCurrency(s?.party_received_total || 0)} received`} />
        <StatCard testid="stat-transporter-payable" label="Transporter Payable" value={fmtCurrency(s?.transporter_payable_total || 0)} sub={`${fmtCurrency(s?.transporter_paid_total || 0)} paid`} />
        <StatCard testid="stat-active-trips" label="Active Trips" value={s?.active_trips ?? 0} sub={`${s?.delivered_trips ?? 0} delivered`} />
      </div>

      {/* Chart + Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card-flat p-6 lg:col-span-2" data-testid="commission-chart">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold">Commission Trend</div>
              <div className="font-display font-semibold text-lg mt-1">Last 6 months</div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-500"><TrendingUp size={14}/> Monthly earned</div>
          </div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={s?.monthly || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D95E36" stopOpacity={0.35}/>
                    <stop offset="100%" stopColor="#D95E36" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#EFEFEA" vertical={false} />
                <XAxis dataKey="month" stroke="#999" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#999" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ border: "1px solid #E5E5E0", borderRadius: 6, fontSize: 12 }} formatter={(v) => fmtCurrency(v)} />
                <Area type="monotone" dataKey="commission" stroke="#D95E36" strokeWidth={2} fill="url(#cg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-flat p-6" data-testid="directory-summary">
          <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold mb-4">Directory</div>
          <div className="space-y-4">
            <DirRow icon={Users} label="Parties" value={s?.parties_count ?? 0} to="/parties" />
            <DirRow icon={Truck} label="Trucks" value={s?.trucks_count ?? 0} to="/trucks" />
            <DirRow icon={UserRound} label="Drivers" value={s?.drivers_count ?? 0} to="/drivers" />
            <DirRow icon={Wallet} label="Expenses" value={fmtCurrency(s?.total_expenses || 0)} to="/expenses" />
            <DirRow icon={Coins} label="Received" value={fmtCurrency(s?.received_commission || 0)} to="/commission" />
          </div>
        </div>
      </div>

      {/* Recent trips */}
      <div className="card-flat p-6" data-testid="recent-trips">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold">Recent</div>
            <div className="font-display font-semibold text-lg mt-1">Latest Trips</div>
          </div>
          <Link to="/trips" className="text-xs accent-text font-semibold" data-testid="view-all-trips">View all →</Link>
        </div>
        {recent.length === 0 ? (
          <div className="text-sm text-stone-500 py-10 flex items-center gap-2"><RouteIcon size={16}/> No trips yet. Head over to Trips to add your first load.</div>
        ) : (
          <table className="tms-table w-full">
            <thead>
              <tr>
                <th>Date</th><th>LR</th><th>Route</th><th>Party</th>
                <th className="num">Party Freight</th><th className="num">Commission</th>
                <th className="num">Party Bal.</th><th className="num">Trans. Bal.</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(t => {
                const d = computeTripDerived(t);
                return (
                  <tr key={t.id}>
                    <td>{fmtDate(t.date)}</td>
                    <td className="font-mono-num text-xs">{t.lr_number || "-"}</td>
                    <td>{t.from_location} → {t.to_location}</td>
                    <td>{t.party_name || "-"}</td>
                    <td className="num">{fmtCurrency(d.pf)}</td>
                    <td className="num accent-text font-semibold">{fmtCurrency(d.commissionAgreed)}</td>
                    <td className="num" style={{ color: d.partyBalance > 0 ? "#C04848" : "#4D7A58" }}>{fmtCurrency(d.partyBalance)}</td>
                    <td className="num" style={{ color: d.transporterBalance > 0 ? "#C04848" : "#4D7A58" }}>{fmtCurrency(d.transporterBalance)}</td>
                    <td><span className={`status-badge status-${t.status}`}>{t.status.replace("_"," ")}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function DirRow({ icon: Icon, label, value, to }) {
  return (
    <Link to={to} className="flex items-center gap-3 py-2 hover:bg-stone-50 -mx-2 px-2 rounded transition-colors" data-testid={`dir-${label.toLowerCase()}`}>
      <div className="w-8 h-8 rounded surface-muted flex items-center justify-center text-stone-600"><Icon size={15} strokeWidth={1.7}/></div>
      <div className="flex-1">
        <div className="text-sm text-stone-800">{label}</div>
      </div>
      <div className="font-display font-semibold text-stone-900">{value}</div>
    </Link>
  );
}
