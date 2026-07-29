        import { useEffect, useState } from "react";
        import { Link } from "react-router-dom";
        import { api, fmtCurrency, fmtDate } from "@/lib/api";

        export default function Invoices() {
          const [invoices, setInvoices] = useState([]);
          const [search, setSearch] = useState("");
        
          const totalInvoices = invoices.length;

        const paidInvoices = invoices.filter(
          (i) => i.status === "Paid"
        ).length;

        const unpaidInvoices = invoices.filter(
          (i) => i.status !== "Paid"
        ).length;

        const outstandingAmount = invoices.reduce(
          (sum, i) => sum + (i.grand_total ?? i.subtotal ?? 0),
          0
        );
        
        const filteredInvoices = invoices.filter((invoice) => {
          const text = search.toLowerCase();

          return (
            invoice.invoice_number?.toLowerCase().includes(text) ||
            invoice.party_name?.toLowerCase().includes(text)
          );
        });
         
        useEffect(() => {
            loadInvoices();
          }, []);
        
        

          const loadInvoices = async () => {
            try {
              const data = await api.listInvoices();
              setInvoices(data);
            } catch (err) {
              console.error(err);
            }
          };

          return (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Invoice Management
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

          <div className="bg-white rounded-lg shadow border p-4">
            <p className="text-sm text-gray-500">Total Invoices</p>
            <h2 className="text-3xl font-bold mt-2">{totalInvoices}</h2>
          </div>

          <div className="bg-white rounded-lg shadow border p-4">
            <p className="text-sm text-gray-500">Paid</p>
            <h2 className="text-3xl font-bold text-green-600 mt-2">
              {paidInvoices}
            </h2>
          </div>

          <div className="bg-white rounded-lg shadow border p-4">
            <p className="text-sm text-gray-500">Unpaid</p>
            <h2 className="text-3xl font-bold text-red-600 mt-2">
              {unpaidInvoices}
            </h2>
          </div>

          <div className="bg-white rounded-lg shadow border p-4">
            <p className="text-sm text-gray-500">Outstanding</p>
            <h2 className="text-2xl font-bold text-blue-600 mt-2">
              {fmtCurrency(outstandingAmount)}
            </h2>
          </div>

        </div>

<div className="bg-white rounded-lg shadow border p-4 mb-6">
  <input
    type="text"
    placeholder="Search Invoice No or Party..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="w-full border rounded-lg px-4 py-2"
  />
</div>

<table className="min-w-full border">
                <thead className="bg-gray-100">
  <tr>
    <th className="px-4 py-3 text-left">Invoice No</th>
    <th className="px-4 py-3 text-left">Party</th>
    <th className="px-4 py-3 text-left">Date</th>
    <th className="px-4 py-3 text-center">Trips</th>
    <th className="px-4 py-3 text-right">Amount</th>
    <th className="px-4 py-3 text-center">Status</th>
    <th className="px-4 py-3 text-center">Actions</th>
  </tr>
</thead>

                <tbody>
  {filteredInvoices.map((inv) => (
    <tr
      key={inv.id}
      className="border-b hover:bg-gray-50 transition"
    >
      <td className="px-4 py-3">
        <Link
          to={`/invoice/${inv.id}`}
          className="text-blue-600 font-medium hover:underline"
        >
          {inv.invoice_number}
        </Link>
      </td>

      <td className="px-4 py-3">
        {inv.party_name}
      </td>

      <td className="px-4 py-3">
        {fmtDate(inv.created_at)}
      </td>

      <td className="px-4 py-3 text-center">
        {inv.trip_ids?.length || 0}
      </td>

      <td className="px-4 py-3 text-right font-semibold">
        {fmtCurrency(inv.grand_total ?? inv.subtotal ?? 0)}
      </td>

      <td className="px-4 py-3 text-center">
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            inv.status === "Paid"
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {inv.status || "Unpaid"}
        </span>
      </td>

      <td className="px-4 py-3 text-center space-x-3">

  <Link
  to={`/invoice/${inv.id}`}
  className="text-blue-600 hover:underline"
>
  View
</Link>

<Link
  to={`/invoice/edit/${inv.id}`}
  className="text-orange-600 hover:underline"
>
  Edit
</Link>

  <button
    onClick={() => window.print()}
    className="text-green-600 hover:underline"
  >
    Print
  </button>

  <button
    onClick={async () => {
      if (!window.confirm("Delete this invoice?")) return;

      try {
        await api.deleteInvoice(inv.id);
        loadInvoices();
      } catch (err) {
        console.error(err);
        alert("Unable to delete invoice.");
      }
    }}
    className="text-red-600 hover:underline"
  >
    Delete
  </button>

</td>
    </tr>
  ))}
</tbody>
              </table>
            </div>
          );
        }