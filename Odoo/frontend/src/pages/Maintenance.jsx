import React, { useState, useEffect } from "react";
import { api } from "../api";
import { 
  Wrench, 
  PlusCircle, 
  Check, 
  X, 
  UserCheck, 
  Clock, 
  AlertTriangle,
  FolderOpen,
  ArrowRight
} from "lucide-react";

export default function Maintenance({ user }) {
  const [requests, setRequests] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Raise Request form state
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [raiseForm, setRaiseForm] = useState({
    asset_id: "",
    description: "",
    priority: "Medium"
  });

  // Assign Tech state
  const [assigningReq, setAssigningReq] = useState(null);
  const [technicianName, setTechnicianName] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await api.maintenance.getMaintenanceRequests();
      setRequests(list);

      // Fetch assets so users can select which one needs repair
      const allAssets = await api.assets.getAssets();
      setAssets(allAssets);
    } catch (e) {
      setError(e.message || "Failed to load maintenance records.");
    } finally {
      setLoading(false);
    }
  };

  const handleRaiseSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const payload = {
        asset_id: parseInt(raiseForm.asset_id),
        description: raiseForm.description,
        priority: raiseForm.priority
      };
      await api.maintenance.raiseMaintenance(payload);
      setSuccess("Maintenance ticket created! Awaiting Asset Manager approval.");
      setShowRaiseModal(false);
      setRaiseForm({ asset_id: "", description: "", priority: "Medium" });
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to raise request.");
    }
  };

  const handleApprove = async (id) => {
    setError("");
    setSuccess("");
    try {
      await api.maintenance.approveMaintenance(id);
      setSuccess("Ticket approved! Asset marked as Under Maintenance.");
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to approve ticket.");
    }
  };

  const handleReject = async (id) => {
    setError("");
    setSuccess("");
    try {
      await api.maintenance.rejectMaintenance(id);
      setSuccess("Ticket rejected.");
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to reject ticket.");
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.maintenance.assignTechnician(assigningReq.id, technicianName);
      setSuccess("Technician assigned and repair status updated to In Progress.");
      setAssigningReq(null);
      setTechnicianName("");
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to assign technician.");
    }
  };

  const handleResolve = async (id) => {
    setError("");
    setSuccess("");
    try {
      await api.maintenance.resolveMaintenance(id);
      setSuccess("Ticket resolved! Asset status reverted to Available.");
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to resolve ticket.");
    }
  };

  const getPriorityBadge = (prio) => {
    const classes = {
      Low: "bg-green-50 text-green-700 border-green-100",
      Medium: "bg-blue-50 text-blue-700 border-blue-100",
      High: "bg-amber-50 text-amber-700 border-amber-100",
      Critical: "bg-red-50 text-red-700 border-red-100 font-bold"
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${classes[prio] || ""}`}>
        {prio}
      </span>
    );
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Maintenance Board</h2>
          <p className="text-xs text-slate-500 mt-1">Raise and track repair tickets. Asset managers approve works and dispatch technicians.</p>
        </div>

        <button
          onClick={() => {
            if (assets.length > 0) {
              setRaiseForm(prev => ({ ...prev, asset_id: String(assets[0].id) }));
            }
            setShowRaiseModal(true);
          }}
          className="bg-odoo-purple hover:bg-odoo-darkPurple text-white py-2 px-4 rounded-xl font-semibold flex items-center gap-2 text-sm shadow-md shadow-odoo-purple/10 hover:-translate-y-0.5 transition-all"
        >
          <PlusCircle size={16} />
          <span>Raise Repair Ticket</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-center gap-3 text-sm text-red-700 font-medium">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-r-xl flex items-center gap-3 text-sm text-green-700 font-medium">
          <Check size={18} />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-odoo-purple border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Column 1: Pending Approvals */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-505 uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} className="text-slate-400" />
              <span>Awaiting Approval ({requests.filter(r => r.status === "Pending").length})</span>
            </h3>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {requests.filter(r => r.status === "Pending").map((req) => (
                <div key={req.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">
                      {req.asset.asset_tag}
                    </span>
                    {getPriorityBadge(req.priority)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{req.asset.name}</h4>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed italic">"{req.description}"</p>
                    <p className="text-[10px] text-slate-400 mt-3 font-medium">
                      Raised by: {req.raised_by.name} • {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {(user.role === "Admin" || user.role === "Asset Manager") && (
                    <div className="flex gap-2 pt-3 border-t border-slate-50">
                      <button
                        onClick={() => handleReject(req.id)}
                        className="flex-1 py-1.5 border border-slate-200 hover:border-red-200 hover:text-red-600 rounded-lg text-xs font-semibold bg-white text-slate-550 transition-all flex items-center justify-center gap-1"
                      >
                        <X size={12} /> Reject
                      </button>
                      <button
                        onClick={() => handleApprove(req.id)}
                        className="flex-1 py-1.5 bg-odoo-purple hover:bg-odoo-darkPurple text-white rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 shadow-sm"
                      >
                        <Check size={12} /> Approve
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {requests.filter(r => r.status === "Pending").length === 0 && (
                <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 italic text-xs shadow-sm">
                  No tickets awaiting approval.
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Approved / In Progress */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-505 uppercase tracking-wider flex items-center gap-2">
              <Wrench size={16} className="text-slate-400" />
              <span>Repairs In Progress ({requests.filter(r => ["Approved", "In Progress"].includes(r.status)).length})</span>
            </h3>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {requests.filter(r => ["Approved", "In Progress"].includes(r.status)).map((req) => (
                <div key={req.id} className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">
                      {req.asset.asset_tag}
                    </span>
                    {getPriorityBadge(req.priority)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{req.asset.name}</h4>
                    <p className="text-xs text-slate-650 mt-2 leading-relaxed">"{req.description}"</p>
                    
                    {req.assigned_technician ? (
                      <div className="mt-3 p-2.5 bg-green-50/50 rounded-xl border border-green-100 flex items-center gap-2 text-xs text-green-750 font-medium">
                        <UserCheck size={14} className="text-green-600 shrink-0" />
                        <span>Tech: {req.assigned_technician}</span>
                      </div>
                    ) : (
                      <div className="mt-3 p-2.5 bg-amber-50/50 rounded-xl border border-amber-100 flex items-center gap-2 text-xs text-amber-700 font-medium">
                        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                        <span>Awaiting technician dispatch</span>
                      </div>
                    )}
                  </div>

                  {(user.role === "Admin" || user.role === "Asset Manager") && (
                    <div className="flex gap-2 pt-3 border-t border-slate-50">
                      <button
                        onClick={() => {
                          setAssigningReq(req);
                          setTechnicianName(req.assigned_technician || "");
                        }}
                        className="flex-1 py-1.5 border border-slate-200 hover:border-odoo-purple hover:text-odoo-purple rounded-lg text-xs font-semibold bg-white text-slate-550 transition-all flex items-center justify-center gap-1"
                      >
                        <UserCheck size={12} /> Dispatch Tech
                      </button>
                      
                      {req.assigned_technician && (
                        <button
                          onClick={() => handleResolve(req.id)}
                          className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Check size={12} /> Resolve
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {requests.filter(r => ["Approved", "In Progress"].includes(r.status)).length === 0 && (
                <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 italic text-xs shadow-sm">
                  No repairs currently in progress.
                </div>
              )}
            </div>
          </div>

          {/* Column 3: History / Resolved / Rejected */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-505 uppercase tracking-wider flex items-center gap-2">
              <FolderOpen size={16} className="text-slate-400" />
              <span>Resolved Log ({requests.filter(r => ["Resolved", "Rejected"].includes(r.status)).length})</span>
            </h3>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {requests.filter(r => ["Resolved", "Rejected"].includes(r.status)).map((req) => (
                <div key={req.id} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 opacity-80 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold">
                      {req.asset.asset_tag}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      req.status === "Resolved" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-700 text-sm">{req.asset.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 truncate">"{req.description}"</p>
                    {req.resolved_at && (
                      <p className="text-[10px] text-slate-400 mt-2">
                        Resolved: {new Date(req.resolved_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {requests.filter(r => ["Resolved", "Rejected"].includes(r.status)).length === 0 && (
                <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 italic text-xs shadow-sm">
                  No resolved history records.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RAISE MODAL */}
      {showRaiseModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h4 className="text-lg font-bold text-slate-800 font-sans">Submit Repair Ticket</h4>
              <button onClick={() => setShowRaiseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleRaiseSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Select Damaged Asset</label>
                <select
                  required
                  value={raiseForm.asset_id}
                  onChange={(e) => setRaiseForm({ ...raiseForm, asset_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none text-slate-600 font-medium"
                >
                  <option value="">Choose Asset</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.asset_tag} - {a.status})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Issue Description</label>
                <textarea
                  required
                  value={raiseForm.description}
                  onChange={(e) => setRaiseForm({ ...raiseForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none h-24"
                  placeholder="Clearly describe the hardware issue or malfunction..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Urgency / Priority</label>
                <select
                  value={raiseForm.priority}
                  onChange={(e) => setRaiseForm({ ...raiseForm, priority: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none text-slate-600 font-semibold"
                >
                  <option value="Low">Low (Minor / Preventive)</option>
                  <option value="Medium">Medium (Standard Issue)</option>
                  <option value="High">High (Disruptive / Faulty)</option>
                  <option value="Critical">Critical (Blocked Work / Server Down)</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRaiseModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-odoo-purple hover:bg-odoo-darkPurple text-white text-sm font-semibold shadow-md shadow-odoo-purple/10 transition-all"
                >
                  Raise Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH TECH MODAL */}
      {showRaiseModal === false && assigningReq && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h4 className="text-lg font-bold text-slate-800 font-sans">Dispatch Technician</h4>
              <button onClick={() => setAssigningReq(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <p className="font-bold text-slate-800">Asset: {assigningReq.asset.name}</p>
                <p className="mt-1 font-medium text-slate-605">Issue: {assigningReq.description}</p>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Technician / Repair Agent Name</label>
                <input
                  type="text"
                  required
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none"
                  placeholder="e.g. IT Helpdesk Staff or external vendor name..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-odoo-purple hover:bg-odoo-darkPurple text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow-md shadow-odoo-purple/10 transition-all"
              >
                Confirm Dispatch
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
