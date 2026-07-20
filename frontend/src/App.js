import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { FirmProvider } from "@/context/FirmContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Trucks from "@/pages/Trucks";
import Drivers from "@/pages/Drivers";
import Parties from "@/pages/Parties";
import Trips from "@/pages/Trips";
import Commission from "@/pages/Commission";
import Expenses from "@/pages/Expenses";
import Firms from "@/pages/Firms";
import PartyLedger from "@/pages/PartyLedger";
import Invoice from "@/pages/Invoice";

function App() {
  return (
    <div className="App">
      <FirmProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/invoice/:id" element={<Invoice />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/trucks" element={<Trucks />} />
              <Route path="/drivers" element={<Drivers />} />
              <Route path="/parties" element={<Parties />} />
              <Route path="/parties/:id/ledger" element={<PartyLedger />} />
              <Route path="/trips" element={<Trips />} />
              <Route path="/commission" element={<Commission />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/firms" element={<Firms />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </FirmProvider>
    </div>
  );
}

export default App;
