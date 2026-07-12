import React, { useState, useEffect } from "react";
import { api } from "../api";
import { 
  Bell, 
  Check, 
  ListTodo, 
  Clock, 
  User, 
  Search, 
  Info,
  ShieldCheck,
  AlertCircle
} from "lucide-react";

export default function Notifications({ user, notifications, fetchNotifications }) {
  const [logs, setLogs] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState("");

  const isAdminOrManager = user.role === "Admin" || user.role === "Asset Manager";

  useEffect(() => {
    if (isAdminOrManager) {
      fetchLogs();
    }
  }, []);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    setError("");
    try {
      const activityLogs = await api.notifications.getActivityLogs();
      setLogs(activityLogs);
    } catch (e) {
      setError("Failed to load audit logs. Verify administrative privilege.");
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.notifications.markRead(id);
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredLogs = logs.filter(log => {
    const term = filterText.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      (log.details && log.details.toLowerCase().includes(term)) ||
      (log.user && log.user.name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Notifications & Activity Logs</h2>
          <p className="text-xs text-slate-500 mt-1">Review alerts sent to you or examine audit logs of all management actions.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-center gap-3 text-sm text-red-700 font-medium">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Personal Alerts Tray */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Bell size={18} className="text-slate-500" />
              <span>Personal Alerts Tray</span>
            </h3>
            {notifications.filter(n => !n.is_read).length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-odoo-purple hover:underline font-bold flex items-center gap-1"
              >
                <Check size={12} />
                Mark all read
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100 overflow-hidden max-h-[600px] overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <div className="p-12 text-center text-slate-405 italic text-sm">
                No alerts.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-5 transition-all relative ${
                    !notif.is_read ? "bg-purple-50/15" : ""
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <h4 className={`text-xs font-bold ${!notif.is_read ? 'text-slate-850' : 'text-slate-500'}`}>
                      {notif.title}
                    </h4>
                    {!notif.is_read && (
                      <button
                        onClick={() => handleMarkRead(notif.id)}
                        className="text-[10px] text-odoo-purple hover:underline font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-100 shrink-0"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-650 mt-2 leading-relaxed">
                    {notif.message}
                  </p>
                  <span className="text-[10px] text-slate-400 block mt-3 font-semibold">
                    {new Date(notif.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Organization Audit Trail */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ListTodo size={18} className="text-slate-500" />
              <span>Organization Audit Trail</span>
            </h3>
            {isAdminOrManager && (
              <button
                onClick={fetchLogs}
                className="text-xs text-slate-500 hover:text-slate-700 font-bold border border-slate-200 px-3 py-1 bg-white rounded-lg hover:bg-slate-50 transition-all"
              >
                Refresh Log
              </button>
            )}
          </div>

          {!isAdminOrManager ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-450 h-64 flex flex-col justify-center items-center shadow-sm">
              <ShieldCheck size={32} className="mb-2 text-slate-400 opacity-60" />
              <p className="text-sm font-semibold">Audit Logs Restricted</p>
              <p className="text-xs text-slate-400 mt-1">Full action tracking is visible to Admins and Asset Managers only.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[600px]">
              {/* Search Log Bar */}
              <div className="p-4 border-b border-slate-100 relative bg-slate-50/50">
                <Search className="absolute left-7 top-7 text-slate-400" size={16} />
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none"
                  placeholder="Filter logs by user, action, details..."
                />
              </div>

              {/* Log List */}
              <div className="overflow-y-auto divide-y divide-slate-100 flex-1 min-h-[400px]">
                {loadingLogs ? (
                  <div className="h-48 flex items-center justify-center">
                    <div className="h-6 w-6 border-2 border-odoo-purple border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 italic text-xs">
                    No activity logs recorded matching query.
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-slate-50/30 transition-all">
                      <div className="p-2 bg-slate-100 rounded-lg shrink-0 text-slate-600">
                        <User size={14} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800">
                            {log.user ? log.user.name : "System"}
                          </span>
                          <span className="text-[10px] text-slate-405 font-medium flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-odoo-purple font-mono bg-purple-50/30 px-2 py-0.5 rounded inline-block">
                          {log.action}
                        </p>
                        {log.details && (
                          <p className="text-xs text-slate-650 leading-relaxed pt-1">
                            {log.details}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
