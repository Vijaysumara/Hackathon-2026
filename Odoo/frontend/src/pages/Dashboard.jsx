import React, { useState, useEffect } from "react";
import { api } from "../api";
import { 
  Box, 
  ShieldAlert, 
  Wrench, 
  CalendarDays, 
  RefreshCw, 
  AlertTriangle,
  PlusCircle,
  CalendarRange,
  FileSpreadsheet,
  Clock,
  ArrowRight
} from "lucide-react";

export default function Dashboard({ user, setActiveScreen, openRegisterModalDirectly }) {
  const [stats, setStats] = useState({
    assets_available: 0,
    assets_allocated: 0,
    maintenance_today: 0,
    active_bookings: 0,
    pending_transfers: 0,
    overdue_returns: 0,
    total_assets: 0
  });
  const [overdueList, setOverdueList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const dashboardStats = await api.reports.getDashboardStats();
      setStats(dashboardStats);
      
      // Fetch allocations and filter overdue ones
      const allocations = await api.allocations.getAllocations();
      const overdue = allocations.filter(a => a.status === "Overdue");
      setOverdueList(overdue);
    } catch (e) {
      console.error("Failed to load dashboard stats", e);
    } finally {
      setLoading(false);
    }
  };

  const kpis = [
    { id: "available", name: "Assets Available", value: stats.assets_available, icon: Box, color: "bg-green-50 text-green-700 border-green-100" },
    { id: "allocated", name: "Assets Allocated", value: stats.assets_allocated, icon: FileSpreadsheet, color: "bg-blue-50 text-blue-700 border-blue-100" },
    { id: "maintenance", name: "Maintenance Today", value: stats.maintenance_today, icon: Wrench, color: "bg-amber-50 text-amber-700 border-amber-100" },
    { id: "bookings", name: "Active Bookings", value: stats.active_bookings, icon: CalendarDays, color: "bg-purple-50 text-purple-700 border-purple-100" },
    { id: "transfers", name: "Pending Transfers", value: stats.pending_transfers, icon: RefreshCw, color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
    { id: "overdue", name: "Overdue Returns", value: stats.overdue_returns, icon: AlertTriangle, color: "bg-red-50 text-red-700 border-red-100 font-bold" }
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-odoo-purple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-7xl mx-auto w-full">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-odoo-purple to-odoo-darkPurple rounded-2xl p-6 text-white shadow-lg flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-sans">Good day, {user.name}!</h2>
          <p className="text-purple-100 text-sm mt-1">
            You are logged in as <span className="font-semibold text-odoo-gold">{user.role}</span>. Here is your operational snapshot.
          </p>
        </div>
        <div className="hidden md:flex gap-4">
          <button
            onClick={() => setActiveScreen("logs")}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-all"
          >
            Check Notifications
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div 
              key={idx} 
              className={`p-5 rounded-2xl border bg-white flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200 ${kpi.id === 'overdue' && stats.overdue_returns > 0 ? 'ring-2 ring-red-500 border-transparent animate-pulse' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{kpi.name}</span>
                <div className={`p-2 rounded-xl border ${kpi.color}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{kpi.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 mb-4">Quick Action Utilities</h3>
            <div className="space-y-3">
              {/* Register Asset (Admin / Asset Manager only) */}
              {(user.role === "Admin" || user.role === "Asset Manager") ? (
                <button
                  onClick={openRegisterModalDirectly}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-odoo-purple hover:bg-purple-50/10 group transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-purple-50 text-odoo-purple group-hover:bg-odoo-purple group-hover:text-white transition-all">
                      <PlusCircle size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Register New Asset</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Catalog hardware & categories</p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-all" />
                </button>
              ) : (
                <div className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 opacity-60 text-left bg-slate-50/50 cursor-not-allowed">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-slate-100 text-slate-400">
                      <PlusCircle size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-400">Register Asset (Restricted)</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Asset Manager privilege only</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Book Shared Resource */}
              <button
                onClick={() => setActiveScreen("bookings")}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-odoo-purple hover:bg-purple-50/10 group transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-green-50 text-green-650 group-hover:bg-green-600 group-hover:text-white transition-all">
                    <CalendarRange size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Book Shared Resource</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Reserve rooms, cars, or projectors</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-all" />
              </button>

              {/* Raise Maintenance Ticket */}
              <button
                onClick={() => setActiveScreen("maintenance")}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-odoo-purple hover:bg-purple-50/10 group transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-50 text-amber-650 group-hover:bg-amber-600 group-hover:text-white transition-all">
                    <Wrench size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Raise Repair Ticket</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Submit maintenance requests</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3 text-xs text-slate-500">
            <Clock size={16} className="text-slate-450 shrink-0" />
            <span>Overlapping resource requests and double allocations are rejected automatically by the system.</span>
          </div>
        </div>

        {/* Overdue Returns Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="text-red-500" size={18} />
              <span>Overdue Return Allocations</span>
            </h3>
            <span className="text-xs bg-red-50 text-red-650 px-3 py-1 rounded-full font-bold">
              {stats.overdue_returns} flagged
            </span>
          </div>

          <div className="overflow-y-auto max-h-72 divide-y divide-slate-100 pr-2">
            {overdueList.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400">
                <Box size={32} className="mb-2 opacity-50" />
                <span className="text-sm font-medium">All active allocations are in compliance.</span>
              </div>
            ) : (
              overdueList.map((alloc) => (
                <div key={alloc.id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      {alloc.asset.name} <span className="text-xs text-slate-400 font-mono">({alloc.asset.asset_tag})</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Held by: <span className="font-semibold text-slate-700">{alloc.allocated_to_dept_id ? alloc.allocated_to_dept.name : alloc.allocated_to.name}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-red-650 font-bold bg-red-50 px-2 py-0.5 rounded-md inline-block">
                      Overdue since {new Date(alloc.expected_return_date).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => setActiveScreen("allocations")}
                      className="text-xs text-odoo-purple hover:underline font-bold block mt-1 ml-auto"
                    >
                      Manage Return
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
