import React from "react";
import { 
  LayoutDashboard, 
  Box, 
  RefreshCw, 
  Calendar, 
  Wrench, 
  ClipboardCheck, 
  BarChart3, 
  Settings, 
  BellRing,
  LogOut
} from "lucide-react";

export default function Sidebar({ user, activeScreen, setActiveScreen, onLogout }) {
  const getNavItems = () => {
    const items = [
      { id: "dashboard", name: "Dashboard", icon: LayoutDashboard, roles: ["Admin", "Asset Manager", "Department Head", "Employee"] },
      { id: "assets", name: "Asset Directory", icon: Box, roles: ["Admin", "Asset Manager", "Department Head", "Employee"] },
      { id: "allocations", name: "Allocations & Transfers", icon: RefreshCw, roles: ["Admin", "Asset Manager", "Department Head", "Employee"] },
      { id: "bookings", name: "Resource Bookings", icon: Calendar, roles: ["Admin", "Asset Manager", "Department Head", "Employee"] },
      { id: "maintenance", name: "Maintenance Board", icon: Wrench, roles: ["Admin", "Asset Manager", "Department Head", "Employee"] },
      { id: "audits", name: "Asset Audits", icon: ClipboardCheck, roles: ["Admin", "Asset Manager", "Department Head", "Employee"] },
      { id: "reports", name: "Analytics & Reports", icon: BarChart3, roles: ["Admin", "Asset Manager", "Department Head"] },
      { id: "organization", name: "Organization Setup", icon: Settings, roles: ["Admin"] },
      { id: "logs", name: "Notifications & Logs", icon: BellRing, roles: ["Admin", "Asset Manager", "Department Head", "Employee"] }
    ];

    return items.filter(item => item.roles.includes(user.role));
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col justify-between shrink-0 shadow-sm relative z-20">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100 bg-white">
          <div className="h-8 w-8 bg-odoo-purple rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-md shadow-odoo-purple/10">
            AF
          </div>
          <span className="text-lg font-bold text-slate-800 tracking-wide font-sans">
            AssetFlow
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveScreen(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? "bg-odoo-purple text-white shadow-lg shadow-odoo-purple/10" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={18} className={isActive ? "text-white" : "text-slate-500"} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile Summary */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 bg-odoo-purple/10 rounded-xl flex items-center justify-center font-bold text-odoo-purple">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-bold text-slate-800 truncate">{user.name}</h4>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-0.5 font-medium">
              {user.role}
            </span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-600 text-sm font-semibold transition-all duration-200"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
