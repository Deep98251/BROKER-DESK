import { useFirm } from "@/context/FirmContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";

export default function FirmSwitcher() {
  const { firms, selectedId, setSelectedId } = useFirm();
  const value = selectedId || "all";
  const handleChange = (v) => setSelectedId(v === "all" ? "" : v);

  return (
    <div className="px-5 pb-4" data-testid="firm-switcher">
      <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold mb-2 flex items-center gap-1.5">
        <Building2 size={11} /> Active Firm
      </div>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="w-full text-sm bg-white" data-testid="firm-switcher-trigger"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all" data-testid="firm-option-all">All Firms (combined)</SelectItem>
          {firms.map(f => (
            <SelectItem key={f.id} value={f.id} data-testid={`firm-option-${f.id}`}>{f.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
