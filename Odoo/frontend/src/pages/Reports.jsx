import React, { useState, useEffect } from "react";
import { api } from "../api";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  AreaChart, 
  Area 
} from "recharts";
import { 
  BarChart3, 
  Download, 
  PieChart as PieIcon, 
  TrendingUp, 
  Wrench, 
  Users, 
  CalendarRange 
} from "lucide-react";

export default function Reports() {
  const [stats, setStats] = useState({
    status_distribution: {},
    most_utilized_assets: [],
    maintenance_frequency: { by_category: [], by_condition: {} },
    department_summary: [],
    booking_heatmap: []
  });
  const [loading, setLoading] = useState(true);

  const COLORS = ['#714B67', '#3f55ab', '#5270c5', '#E9A115', '#ef4444', '#10b981', '#64748b'];

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const utilData = await api.reports.getUtilization();
      const maintData = await api.reports.getMaintenanceFrequency();
      const deptData = await api.reports.getDepartmentSummary();
      const heatmapData = await api.reports.getBookingHeatmap();

      setStats({
        status_distribution: utilData.status_distribution,
        most_utilized_assets: utilData.most_utilized_assets,
        maintenance_frequency: maintData,
        department_summary: deptData,
        booking_heatmap: heatmapData
      });
    } catch (e) {
      console.error("Failed to load report analytics", e);
    } finally {
      setLoading(false);
    }
  };

  // Convert status distribution object to list for PieChart
  const getPieData = () => {
    return Object.entries(stats.status_distribution).map(([name, value]) => ({
      name,
      value
    }));
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    
    // Extract headers
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(","));

    // Extract values
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        // Format if string contains comma
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      });
      csvRows.push(values.join(","));
    }

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-odoo-purple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const pieData = getPieData();

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Operational Reports & Analytics</h2>
          <p className="text-xs text-slate-500 mt-1">Perform data analysis on utilization trends, booking statistics, and maintenance cycles.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Card 1: Asset Lifecycle Distribution (Pie) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-850 flex items-center gap-2">
              <PieIcon size={16} className="text-odoo-purple" />
              <span>Asset Lifecycle Distribution</span>
            </h3>
            <button
              onClick={() => exportToCSV(pieData, "lifecycle_distribution")}
              className="text-xs text-odoo-purple hover:underline font-bold flex items-center gap-1 border border-slate-200 hover:border-odoo-purple px-2 py-1 rounded-lg transition-all"
            >
              <Download size={12} /> CSV
            </button>
          </div>
          
          <div className="h-64 flex items-center justify-center">
            {pieData.length === 0 ? (
              <span className="text-xs text-slate-400 italic">No asset lifecycle records.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Card 2: Leaderboard: Most Utilized Assets (Bar) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-850 flex items-center gap-2">
              <TrendingUp size={16} className="text-odoo-purple" />
              <span>Leaderboard: Most Utilized Assets</span>
            </h3>
            <button
              onClick={() => exportToCSV(stats.most_utilized_assets, "most_utilized_assets")}
              className="text-xs text-odoo-purple hover:underline font-bold flex items-center gap-1 border border-slate-200 hover:border-odoo-purple px-2 py-1 rounded-lg transition-all"
            >
              <Download size={12} /> CSV
            </button>
          </div>

          <div className="h-64">
            {stats.most_utilized_assets.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No allocation logs found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.most_utilized_assets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="tag" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="allocations" fill="#714B67" radius={[4, 4, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Card 3: Maintenance Requests by Category */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-850 flex items-center gap-2">
              <Wrench size={16} className="text-odoo-purple" />
              <span>Maintenance Incidents by Category</span>
            </h3>
            <button
              onClick={() => exportToCSV(stats.maintenance_frequency.by_category, "maintenance_by_category")}
              className="text-xs text-odoo-purple hover:underline font-bold flex items-center gap-1 border border-slate-200 hover:border-odoo-purple px-2 py-1 rounded-lg transition-all"
            >
              <Download size={12} /> CSV
            </button>
          </div>

          <div className="h-64">
            {stats.maintenance_frequency.by_category.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No maintenance tickets found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.maintenance_frequency.by_category} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="requests" fill="#3f55ab" radius={[4, 4, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Card 4: Department-wise Allocation Summary */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-850 flex items-center gap-2">
              <Users size={16} className="text-odoo-purple" />
              <span>Department Allocation Summaries</span>
            </h3>
            <button
              onClick={() => exportToCSV(stats.department_summary, "department_allocation_summary")}
              className="text-xs text-odoo-purple hover:underline font-bold flex items-center gap-1 border border-slate-200 hover:border-odoo-purple px-2 py-1 rounded-lg transition-all"
            >
              <Download size={12} /> CSV
            </button>
          </div>

          <div className="h-64">
            {stats.department_summary.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No allocations recorded.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.department_summary} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis type="category" dataKey="department" stroke="#94a3b8" fontSize={10} width={120} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="allocated_assets" fill="#E9A115" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Card 5: Resource Booking Heatmap (Peak hours) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-850 flex items-center gap-2">
              <CalendarRange size={16} className="text-odoo-purple" />
              <span>Shared Resource Booking Heatmap (Business Hours Peak)</span>
            </h3>
            <button
              onClick={() => exportToCSV(stats.booking_heatmap, "booking_heatmap")}
              className="text-xs text-odoo-purple hover:underline font-bold flex items-center gap-1 border border-slate-200 hover:border-odoo-purple px-2 py-1 rounded-lg transition-all"
            >
              <Download size={12} /> CSV
            </button>
          </div>

          <div className="h-72">
            {stats.booking_heatmap.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No booking records found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.booking_heatmap} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBooking" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#714B67" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#714B67" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="bookings" stroke="#714B67" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBooking)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
