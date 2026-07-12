import React, { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { Bell, Check, Eye } from "lucide-react";

export default function Header({ title, user, notifications, fetchNotifications, setActiveScreen }) {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  return (
    <header className="h-16 bg-white border-b border-slate-100 px-8 flex items-center justify-between shrink-0 relative z-30 shadow-sm">
      <h2 className="text-xl font-bold text-slate-800 font-sans tracking-wide">{title}</h2>

      <div className="flex items-center gap-6">
        {/* Notification Bell with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="h-10 w-10 hover:bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center transition-all relative border border-slate-100"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-sm font-bold text-slate-800">Recent Alerts</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-odoo-purple hover:underline font-semibold flex items-center gap-1"
                  >
                    <Check size={12} />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 transition-all hover:bg-slate-50/80 ${
                        !notif.is_read ? "bg-purple-50/30" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h4 className={`text-xs font-bold ${!notif.is_read ? 'text-slate-850' : 'text-slate-500'}`}>
                          {notif.title}
                        </h4>
                        {!notif.is_read && (
                          <button
                            onClick={() => handleMarkRead(notif.id)}
                            className="text-[10px] text-odoo-purple hover:underline font-semibold"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-2 font-medium">
                        {new Date(notif.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    setActiveScreen("logs");
                    setShowNotifDropdown(false);
                  }}
                  className="text-xs text-odoo-purple hover:text-odoo-darkPurple font-bold flex items-center justify-center gap-1 mx-auto"
                >
                  <Eye size={12} />
                  View all activity logs
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile details */}
        <div className="flex items-center gap-3 pl-6 border-l border-slate-100">
          <div className="h-9 w-9 bg-odoo-purple/10 text-odoo-purple rounded-xl flex items-center justify-center font-bold text-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-850">{user.name}</h4>
            <span className="text-[10px] text-slate-500 font-semibold">{user.email}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
