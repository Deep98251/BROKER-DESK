import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";

export default function Invoice() {
  const { id } = useParams();

  const [invoice, setInvoice] = useState(null);
 const [trips, setTrips] = useState([]);
 const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  async function loadInvoice() {
  try {
    const inv = await api.getInvoice(id);
    setInvoice(inv);

    const tripData = await Promise.all(
      inv.trip_ids.map((tripId) => api.getTrip(tripId))
    );

    setTrips(tripData);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
}

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!invoice) {
    return <div className="p-6">Invoice not found.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4">

     <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden"> 
     {/* ================= HEADER ================= */}

<div className="bg-slate-900 text-white px-10 py-8">

  <div className="flex justify-between items-start">

    {/* Company Details */}

    <div>

      <div className="flex items-center gap-4">

        <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-2xl font-bold shadow-lg">
          DL
        </div>

        <div>

          <h1 className="text-4xl font-extrabold tracking-wide">
            DEEP LOGISTICS
          </h1>

          <p className="text-slate-300 mt-1">
            Transport & Brokerage
          </p>

        </div>

      </div>

      <div className="mt-6 text-sm text-slate-300 space-y-1">

        <p>📞 +91 98251 96595</p>

        <p>✉️ deepthakker34@gmail.com</p>

      </div>

    </div>

    {/* Invoice Details */}

    <div className="text-right">

      <p className="uppercase tracking-[6px] text-emerald-400 text-sm font-semibold">
        TAX INVOICE
      </p>

      <h2 className="text-3xl font-bold mt-3">
        {invoice.invoice_number}
      </h2>

      <p className="text-slate-300 mt-2">
        {invoice.invoice_date}
      </p>

    </div>

  </div>

</div>



      <div className="grid grid-cols-2 gap-6 p-8">

  {/* Invoice Details */}
  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">

    <h3 className="text-sm uppercase tracking-widest text-slate-500 mb-4">
      Invoice Details
    </h3>

    <div className="space-y-4">

      

      <div>
        <p className="text-xs text-slate-500">Invoice Date</p>
        <p className="font-medium">
          {invoice.invoice_date}
        </p>
      </div>

      <div>
        <p className="text-xs text-slate-500">Status</p>

        <span className="inline-block mt-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">
          {invoice.status}
        </span>
      </div>

    </div>

  </div>

  {/* Bill To */}
  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">

    <h3 className="text-sm uppercase tracking-widest text-slate-500 mb-4">
      Bill To
    </h3>

    <div className="space-y-3">

      <p className="text-xl font-bold text-slate-800">
        {invoice.party_name}
      </p>

      <p className="text-slate-500">
        Customer Address
      </p>

      <p className="text-slate-500">
        GSTIN
      </p>

      <p className="text-slate-500">
        Phone Number
      </p>

    </div>

  </div>

</div>
        
        <table className="w-full mt-8 border-collapse border">
  <thead>
    <tr className="bg-gray-100">
      <th className="border p-2">LR No</th>
      <th className="border p-2">Date</th>
      <th className="border p-2">From</th>
      <th className="border p-2">To</th>
      <th className="border p-2">Truck</th>
      <th className="border p-2">Container</th>
      <th className="border p-2 text-right">Freight</th>
    </tr>
  </thead>

  <tbody>
    {trips.map((trip) => (
      <tr key={trip.id}>
        <td className="border p-2">{trip.lr_number}</td>
        <td className="border p-2">{trip.date}</td>
        <td className="border p-2">{trip.from_location}</td>
        <td className="border p-2">{trip.to_location}</td>
        <td className="border p-2">{trip.truck_number}</td>

        <td className="border p-2">
       {trip.container_number || "-"}
       </td>

       <td className="border p-2 text-right">
        ₹{trip.party_freight.toFixed(2)}
      </td>
      </tr>
    ))}
  </tbody>
</table>


<div className="p-8">

  <div className="flex justify-end">

    <div className="w-96 bg-slate-50 border rounded-2xl p-6">

     <div className="flex justify-between mb-3">
  <span>Freight Charges</span>
  <span>₹{(invoice.subtotal ?? 0).toFixed(2)}</span>
</div>

<div className="flex justify-between mb-3">
  <span>Other Charges</span>
  <span>₹{(invoice.other_charges ?? 0).toFixed(2)}</span>
</div>

<div className="flex justify-between mb-3 text-red-600">
  <span>Advance Paid</span>
  <span>-₹{(invoice.advance_paid ?? 0).toFixed(2)}</span>
</div>

      <hr className="my-4" />

      <div className="flex justify-between text-xl font-bold">
        <span>Grand Total</span>
        <span>₹{(invoice.grand_total ?? 0).toFixed(2)}</span>
      </div>

    </div>

  </div>

  <div className="flex justify-end mt-6">

    <button
      onClick={() => window.print()}
      className="px-4 py-2 bg-blue-600 text-white rounded"
    >
      Print Invoice
    </button>

  </div>

</div>

</div>

</div>
  );
}