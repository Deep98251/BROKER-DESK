import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const FirmContext = createContext(null);
const STORAGE_KEY = "brokerdesk_firm_id";

export function FirmProvider({ children }) {
  const [firms, setFirms] = useState([]);
  const [selectedId, setSelectedId] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const list = await api.listFirms();
      setFirms(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (selectedId) localStorage.setItem(STORAGE_KEY, selectedId);
    else localStorage.removeItem(STORAGE_KEY);
  }, [selectedId]);

  const selectedFirm = firms.find(f => f.id === selectedId) || null;
  const selectedName = selectedFirm?.name || "All Firms";

  return (
    <FirmContext.Provider value={{ firms, selectedId, selectedFirm, selectedName, setSelectedId, refresh, loading }}>
      {children}
    </FirmContext.Provider>
  );
}

export function useFirm() {
  const ctx = useContext(FirmContext);
  if (!ctx) throw new Error("useFirm must be used inside FirmProvider");
  return ctx;
}
