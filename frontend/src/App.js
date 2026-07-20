import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Trucks from "@/pages/Trucks";
import Drivers from "@/pages/Drivers";
import Parties from "@/pages/Parties";
import Trips from "@/pages/Trips";
import Commission from "@/pages/Commission";
import Expenses from "@/pages/Expenses";
import Invoice from "@/pages/Invoice";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/invoice/:id" element={<Invoice />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trucks" element={<Trucks />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/parties" element={<Parties />} />
            <Route path="/trips" element={<Trips />} />
            <Route path="/commission" element={<Commission />} />
            <Route path="/expenses" element={<Expenses />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
