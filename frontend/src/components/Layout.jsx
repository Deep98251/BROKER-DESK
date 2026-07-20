import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Truck, Users, UserRound, Route as RouteIcon, Coins, Wallet, Building2 } from "lucide-react";
import FirmSwitcher from "@/components/FirmSwitcher";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard", end: true },
  { to: "/trips", label: "Trips / Loads", icon: RouteIcon, testid: "nav-trips" },
  { to: "/commission", label: "Commission", icon: Coins, testid: "nav-commission", highlight: true },
  { to: "/parties", label: "Parties", icon: Users, testid: "nav-parties" },
  { to: "/trucks", label: "Trucks", icon: Truck, testid: "nav-trucks" },
  { to: "/drivers", label: "Drivers", icon: UserRound, testid: "nav-drivers" },
  { to: "/expenses", label: "Expenses", icon: Wallet, testid: "nav-expenses" },
  { to: "/firms", label: "Firms", icon: Building2, testid: "nav-firms" },
];

export default function Layout() {
  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      <aside className="w-64 shrink-0 border-r border-line surface-muted flex flex-col sticky top-0 h-screen" data-testid="sidebar">
        <div className="px-6 py-6 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md accent-bg flex items-center justify-center text-white font-bold font-display">B</div>
            <div>
              <div className="font-display font-bold text-[15px] tracking-tight leading-none">BrokerDesk</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 mt-1">Transport TMS</div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-b border-line">
          <FirmSwitcher />
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                data-testid={item.testid}
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              >
                <Icon size={17} strokeWidth={1.75} />
                <span>{item.label}</span>
                {item.highlight && <span className="ml-auto text-[9px] uppercase tracking-widest accent-text font-bold">Revenue</span>}
              </NavLink>
            );
          })}
        </nav>
        <div className="px-6 py-4 border-t border-line text-[11px] text-stone-500 leading-relaxed">
          Single-user workspace<br/>Manage multiple firms under one roof
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
