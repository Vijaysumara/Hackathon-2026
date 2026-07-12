import React, { useState } from "react";
import { api } from "../api";
import { LogIn, UserPlus, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function Login({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isLogin) {
        // Login Flow
        await api.auth.login(email, password);
        const user = await api.auth.getMe();
        onLoginSuccess(user);
      } else {
        // Signup Flow
        await api.auth.register(email, name, password);
        setSuccess("Account created successfully! Please log in.");
        setIsLogin(true);
        setPassword("");
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F1F5] p-4 relative overflow-hidden">
      {/* Background abstract decoration shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-odoo-purple/5 animate-pulse-slow"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-odoo-gold/5 animate-pulse-slow"></div>

      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row relative z-10 min-h-[550px]">
        {/* Branding Sidebar */}
        <div className="md:w-1/2 bg-odoo-purple p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-odoo-darkPurple to-odoo-purple opacity-90 z-0"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-10 bg-odoo-gold rounded-xl flex items-center justify-center font-bold text-odoo-darkPurple text-xl">
                AF
              </div>
              <span className="text-2xl font-bold tracking-wide">AssetFlow</span>
            </div>
            <h1 className="text-4xl font-extrabold mb-4 leading-tight">
              Enterprise Asset & Resource Management
            </h1>
            <p className="text-purple-200 text-lg font-light leading-relaxed">
              Track physical assets, streamline allocation approvals, organize shared resource bookings, and monitor maintenance cycles.
            </p>
          </div>

          <div className="relative z-10 mt-12">
            <div className="flex items-center gap-4 text-sm text-purple-200">
              <span className="h-2 w-2 rounded-full bg-odoo-gold animate-ping"></span>
              <span>Centralized Organization Digital Hub</span>
            </div>
            <p className="text-xs text-purple-300 mt-2">© 2026 AssetFlow Enterprise System.</p>
          </div>
        </div>

        {/* Action Panel */}
        <div className="md:w-1/2 p-12 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-slate-500 mb-8 text-sm">
              {isLogin
                ? "Enter your credentials to access the management panel."
                : "Register an account to start tracking your allocations."}
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-start gap-3">
                <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={18} />
                <span className="text-sm text-red-700 font-medium">{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-xl flex items-start gap-3">
                <CheckCircle2 className="text-green-500 shrink-0 mt-0.5" size={18} />
                <span className="text-sm text-green-700 font-medium">{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple transition-all text-sm"
                    placeholder="John Doe"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple transition-all text-sm"
                  placeholder="name@company.com"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Password
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => alert("Please contact your organization administrator to reset your password.")}
                      className="text-xs text-odoo-purple hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-odoo-purple hover:bg-odoo-darkPurple text-white py-3 px-4 rounded-xl font-semibold shadow-lg shadow-odoo-purple/10 flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all text-sm disabled:opacity-50 disabled:pointer-events-none mt-2"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : isLogin ? (
                  <>
                    <LogIn size={18} />
                    <span>Sign In</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm text-slate-500">
              {isLogin ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(false);
                      setError("");
                    }}
                    className="text-odoo-purple hover:underline font-semibold"
                  >
                    Register
                  </button>
                </>
              ) : (
                <>
                  Already registered?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      setError("");
                    }}
                    className="text-odoo-purple hover:underline font-semibold"
                  >
                    Log In
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
