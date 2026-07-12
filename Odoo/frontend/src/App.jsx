import React, { useState, useEffect, useRef } from "react";
import { api } from "./api";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import Allocations from "./pages/Allocations";
import Bookings from "./pages/Bookings";
import Maintenance from "./pages/Maintenance";
import Audits from "./pages/Audits";
import Reports from "./pages/Reports";
import Organization from "./pages/Organization";
import Notifications from "./pages/Notifications";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeScreen, setActiveScreen] = useState("dashboard");
  const [notifications, setNotifications] = useState([]);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const assetRef = useRef(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      // Set up a polling interval for notifications (every 30 seconds)
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const checkAuthentication = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const user = await api.auth.getMe();
        setCurrentUser(user);
      } catch (e) {
        // Token invalid or expired
        localStorage.removeItem("token");
        setCurrentUser(null);
      }
    }
    setCheckingAuth(false);
  };

  const fetchNotifications = async () => {
    try {
      const list = await api.notifications.getNotifications();
      setNotifications(list);
    } catch (e) {
      console.error("Failed to load notifications", e);
    }
  };

  const handleLogout = () => {
    api.auth.logout();
    setCurrentUser(null);
    setActiveScreen("dashboard");
  };

  const getScreenTitle = () => {
    const titles = {
      dashboard: "Dashboard",
      assets: "Asset Directory",
      allocations: "Allocations & Transfers",
      bookings: "Resource Bookings",
      maintenance: "Maintenance Board",
      audits: "Asset Audits",
      reports: "Analytics & Reports",
      organization: "Organization Setup",
      logs: "Notifications & Logs"
    };
    return titles[activeScreen] || "AssetFlow";
  };

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case "dashboard":
        return (
          <Dashboard 
            user={currentUser} 
            setActiveScreen={setActiveScreen} 
            openRegisterModalDirectly={() => {
              setActiveScreen("assets");
              // Allow screen render to complete, then open modal
              setTimeout(() => {
                assetRef.current?.openRegister();
              }, 150);
            }}
          />
        );
      case "assets":
        return <Assets ref={assetRef} user={currentUser} />;
      case "allocations":
        return <Allocations user={currentUser} />;
      case "bookings":
        return <Bookings user={currentUser} />;
      case "maintenance":
        return <Maintenance user={currentUser} />;
      case "audits":
        return <Audits user={currentUser} />;
      case "reports":
        return <Reports />;
      case "organization":
        return <Organization />;
      case "logs":
        return (
          <Notifications 
            user={currentUser} 
            notifications={notifications} 
            fetchNotifications={fetchNotifications} 
          />
        );
      default:
        return <Dashboard user={currentUser} setActiveScreen={setActiveScreen} />;
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7FA]">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 border-4 border-odoo-purple border-t-transparent rounded-full animate-spin mx-auto"></div>
          <span className="text-sm font-semibold text-slate-500 block">Validating session credentials...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="h-screen w-screen flex bg-[#F8F7FA] overflow-hidden select-none font-sans">
      {/* Dynamic Sidebar navigation */}
      <Sidebar 
        user={currentUser} 
        activeScreen={activeScreen} 
        setActiveScreen={(screen) => {
          setActiveScreen(screen);
          fetchNotifications(); // Reload notifications on screen changes
        }} 
        onLogout={handleLogout} 
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Dynamic Header */}
        <Header 
          title={getScreenTitle()} 
          user={currentUser} 
          notifications={notifications}
          fetchNotifications={fetchNotifications}
          setActiveScreen={setActiveScreen}
        />

        {/* Dynamic Page viewport */}
        <main className="flex-1 overflow-hidden flex flex-col relative">
          {renderActiveScreen()}
        </main>
      </div>
    </div>
  );
}
