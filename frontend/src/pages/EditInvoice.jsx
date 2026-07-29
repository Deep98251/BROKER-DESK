import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";

export default function EditInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    loadInvoice();
  }, []);

  const loadInvoice = async () => {
    try {
      const data = await api.getInvoice(id);
      setInvoice(data);
    } catch (err) {
      console.error(err);
      alert("Unable to load invoice.");
    }
  };

  const saveInvoice = async () => {
    try {
      await api.updateInvoice(id, invoice);
      alert("Invoice updated successfully.");
      navigate("/invoices");
    } catch (err) {
      console.error(err);
      alert("Unable to update invoice.");
    }
  };

  if (!invoice) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Edit Invoice</h1>

      <div className="space-y-4">

        <div>
          <label>Invoice Number</label>
          <input
            className="w-full border rounded p-2"
            value={invoice.invoice_number}
            disabled
          />
        </div>

        <div>
          <label>Invoice Date</label>
          <input
            type="date"
            className="w-full border rounded p-2"
            value={invoice.invoice_date}
            onChange={(e) =>
              setInvoice({ ...invoice, invoice_date: e.target.value })
            }
          />
        </div>

        <div>
          <label>Other Charges</label>
          <input
            type="number"
            className="w-full border rounded p-2"
            value={invoice.other_charges}
            onChange={(e) =>
              setInvoice({
                ...invoice,
                other_charges: Number(e.target.value),
              })
            }
          />
        </div>

        <div>
          <label>Advance Paid</label>
          <input
            type="number"
            className="w-full border rounded p-2"
            value={invoice.advance_paid}
            onChange={(e) =>
              setInvoice({
                ...invoice,
                advance_paid: Number(e.target.value),
              })
            }
          />
        </div>

        <div>
          <label>Status</label>
          <select
            className="w-full border rounded p-2"
            value={invoice.status}
            onChange={(e) =>
              setInvoice({ ...invoice, status: e.target.value })
            }
          >
            <option>Unpaid</option>
            <option>Paid</option>
          </select>
        </div>

        <div>
          <label>Notes</label>
          <textarea
            className="w-full border rounded p-2"
            rows="4"
            value={invoice.notes}
            onChange={(e) =>
              setInvoice({ ...invoice, notes: e.target.value })
            }
          />
        </div>

        <button
          onClick={saveInvoice}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          Save Changes
        </button>

      </div>
    </div>
  );
}