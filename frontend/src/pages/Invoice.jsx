import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, fmtCurrency, fmtDate } from "@/lib/api";
import { Printer, ArrowLeft } from "lucide-react";
import { computeTripDerived } from "@/pages/Trips";

export default function Invoice() {
  const { id } = useParams();
  const [t, setT] = useState(null);

  useEffect(() => { api.getTrip(id).then(setT).catch(() => setT(null)); }, [id]);

  if (!t) return <div className="p-12 text-stone-600">Loading invoice…</div>;

  const doPrint = () => window.print();
  const d = computeTripDerived(t);
  const payments = t.payments || [];
  const partyPays = payments.filter(p => p.direction === "from_party");
  const transporterPays = payments.filter(p => p.direction === "to_transporter");

  return (
    <div className="min-h-screen bg-stone-100">
      <div className="no-print sticky top-0 bg-white border-b border-line px-6 py-3 flex items-center justify-between z-10">
        <button onClick={() => window.close()} data-testid="close-invoice" className="text-sm text-stone-600 hover:accent-text flex items-center gap-2"><ArrowLeft size={16}/>Close</button>
        <button onClick={doPrint} data-testid="print-invoice" className="accent-bg text-white px-4 py-2 rounded-md text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90"><Printer size={15}/>Print / Save as PDF</button>
      </div>

      <div className="print-page max-w-3xl mx-auto my-8 bg-white border border-line p-12" data-testid="invoice-content">
        {/* Header */}
        <div className="flex items-start justify-between pb-6 border-b border-line">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded accent-bg flex items-center justify-center text-white font-bold font-display text-lg">B</div>
              <div>
                <div className="font-display font-bold text-xl leading-none">BrokerDesk</div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 mt-1">Transport Brokerage</div>
              </div>
            </div>
            <div className="text-xs text-stone-500 mt-4 leading-relaxed">
              Freight Bill & Payment Statement<br/>
              Single-user broker workspace
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold">Bill Number</div>
            <div className="font-mono-num text-lg font-bold mt-1">{t.lr_number || t.id.slice(0,8).toUpperCase()}</div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold mt-4">Date</div>
            <div className="text-sm mt-1">{fmtDate(t.date)}</div>
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-8 py-6 border-b border-line">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold mb-2">Party / Consignor</div>
            <div className="font-semibold text-stone-900">{t.party_name || "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold mb-2">Transporter</div>
            <div className="font-semibold text-stone-900">{t.transporter_name || "—"}</div>
          </div>
        </div>

        {/* Trip Details */}
        <div className="py-6 border-b border-line">
          <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold mb-4">Trip Details</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Row label="Route" value={`${t.from_location} → ${t.to_location}`} />
            <Row label="Truck Number" value={t.truck_number || "—"} />
            <Row label="Driver" value={t.driver_name || "—"} />
            <Row label="Material" value={t.material || "—"} />
            <Row label="Weight" value={t.weight || "—"} />
            <Row label="Status" value={t.status.replace("_", " ").toUpperCase()} />
          </div>
        </div>

        {/* Freight Summary */}
        <div className="py-6 border-b border-line">
          <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold mb-4">Freight Summary</div>
          <table className="w-full text-sm">
            <tbody>
              <MoneyRow label="Freight agreed with Party" value={fmtCurrency(d.pf)} />
              <MoneyRow label="Freight agreed with Transporter" value={fmtCurrency(d.tf)} />
              <MoneyRow label="Brokerage / Commission" value={fmtCurrency(d.commissionAgreed)} accent bold />
            </tbody>
          </table>
        </div>

        {/* Payments From Party */}
        <div className="py-6 border-b border-line">
          <div className="flex items-baseline justify-between mb-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold">Received from Party</div>
            <div className="text-xs text-stone-500">{partyPays.length} entries</div>
          </div>
          {partyPays.length === 0 ? (
            <div className="text-sm text-stone-500">No receipts yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-line"><th className="text-left py-2 text-[10px] uppercase tracking-wider text-stone-500">Date</th><th className="text-left py-2 text-[10px] uppercase tracking-wider text-stone-500">Mode</th><th className="text-left py-2 text-[10px] uppercase tracking-wider text-stone-500">Ref</th><th className="text-right py-2 text-[10px] uppercase tracking-wider text-stone-500">Amount</th></tr></thead>
              <tbody>
                {partyPays.map(p => (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="py-2">{fmtDate(p.date)}</td>
                    <td className="py-2">{p.mode}</td>
                    <td className="py-2 text-xs">{p.reference || "-"}</td>
                    <td className="py-2 text-right font-mono-num">{fmtCurrency(p.amount)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td colSpan={3} className="py-2 text-right">Total received:</td>
                  <td className="py-2 text-right font-mono-num">{fmtCurrency(d.partyReceived)}</td>
                </tr>
                <tr className="font-bold" style={{ color: d.partyBalance > 0 ? "#C04848" : "#4D7A58" }}>
                  <td colSpan={3} className="py-2 text-right">Balance from party:</td>
                  <td className="py-2 text-right font-mono-num">{fmtCurrency(d.partyBalance)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Payments To Transporter */}
        <div className="py-6 border-b border-line">
          <div className="flex items-baseline justify-between mb-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold">Paid to Transporter</div>
            <div className="text-xs text-stone-500">{transporterPays.length} entries</div>
          </div>
          {transporterPays.length === 0 ? (
            <div className="text-sm text-stone-500">No payments yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-line"><th className="text-left py-2 text-[10px] uppercase tracking-wider text-stone-500">Date</th><th className="text-left py-2 text-[10px] uppercase tracking-wider text-stone-500">Mode</th><th className="text-left py-2 text-[10px] uppercase tracking-wider text-stone-500">Ref</th><th className="text-right py-2 text-[10px] uppercase tracking-wider text-stone-500">Amount</th></tr></thead>
              <tbody>
                {transporterPays.map(p => (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="py-2">{fmtDate(p.date)}</td>
                    <td className="py-2">{p.mode}</td>
                    <td className="py-2 text-xs">{p.reference || "-"}</td>
                    <td className="py-2 text-right font-mono-num">{fmtCurrency(p.amount)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td colSpan={3} className="py-2 text-right">Total paid:</td>
                  <td className="py-2 text-right font-mono-num">{fmtCurrency(d.transporterPaid)}</td>
                </tr>
                <tr className="font-bold" style={{ color: d.transporterBalance > 0 ? "#C04848" : "#4D7A58" }}>
                  <td colSpan={3} className="py-2 text-right">Balance to transporter:</td>
                  <td className="py-2 text-right font-mono-num">{fmtCurrency(d.transporterBalance)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Net Position */}
        <div className="py-6">
          <div className="p-4 accent-soft-bg rounded-md border border-orange-200/60">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] accent-text font-bold">Broker Position</div>
                <div className="text-xs text-stone-600 mt-1">Commission agreed {fmtCurrency(d.commissionAgreed)} · Realized so far {fmtCurrency(d.commissionRealized)}</div>
              </div>
              <div className="font-display text-3xl font-bold accent-text">{fmtCurrency(d.commissionRealized)}</div>
            </div>
          </div>
        </div>

        {t.notes && (
          <div className="pt-6 border-t border-line">
            <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-bold mb-2">Notes</div>
            <div className="text-sm text-stone-700 whitespace-pre-wrap">{t.notes}</div>
          </div>
        )}

        <div className="pt-10 mt-10 border-t border-line flex justify-between items-end text-xs text-stone-500">
          <div>This is a system-generated statement.</div>
          <div className="text-right">
            <div className="pt-8 border-t border-stone-400 w-40 text-center text-xs">Authorised Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-bold">{label}</div>
      <div className="mt-1">{value}</div>
    </div>
  );
}

function MoneyRow({ label, value, bold, accent }) {
  return (
    <tr className="border-b border-line last:border-0">
      <td className={`py-3 ${bold ? "font-semibold" : ""}`}>{label}</td>
      <td className={`py-3 text-right font-mono-num ${bold ? "font-bold text-base" : ""} ${accent ? "accent-text text-lg" : ""}`}>{value}</td>
    </tr>
  );
}
