import React, { useState, useEffect } from "react";
import { api } from "../api";
import { 
  ClipboardCheck, 
  PlusCircle, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Users,
  MapPin,
  Calendar,
  X,
  Info,
  Lock,
  Activity
} from "lucide-react";

export default function Audits({ user }) {
  const [cycles, setCycles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Cycle details view
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [discrepancies, setDiscrepancies] = useState([]);

  // Create Cycle form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cycleForm, setCycleForm] = useState({
    name: "",
    scope_type: "Department",
    scope_department_id: "",
    scope_location: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    auditor_ids: []
  });

  // Verification form state
  const [verifyingItem, setVerifyingItem] = useState(null);
  const [verificationForm, setVerificationForm] = useState({
    status: "Verified",
    notes: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCycle) {
      // Reload details of current selected cycle
      const updated = cycles.find(c => c.id === selectedCycle.id);
      if (updated) {
        setSelectedCycle(updated);
        fetchDiscrepancies(selectedCycle.id);
      }
    }
  }, [cycles]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await api.audits.getAudits();
      setCycles(list);

      const empList = await api.organization.getEmployees();
      // Filter auditors (managers, department heads, admin, or selected employees)
      setEmployees(empList);

      const deptList = await api.organization.getDepartments();
      setDepartments(deptList);
    } catch (e) {
      setError(e.message || "Failed to load audit cycles.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscrepancies = async (cycleId) => {
    try {
      const list = await api.audits.getDiscrepancies(cycleId);
      setDiscrepancies(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (cycleForm.auditor_ids.length === 0) {
      setError("Please assign at least one auditor.");
      return;
    }

    try {
      const payload = {
        name: cycleForm.name,
        scope_type: cycleForm.scope_type,
        scope_department_id: cycleForm.scope_type === "Department" ? parseInt(cycleForm.scope_department_id) : null,
        scope_location: cycleForm.scope_type === "Location" ? cycleForm.scope_location : null,
        start_date: cycleForm.start_date,
        end_date: cycleForm.end_date,
        auditor_ids: cycleForm.auditor_ids.map(id => parseInt(id))
      };

      await api.audits.createAudit(payload);
      setSuccess("Audit cycle created and items cataloged!");
      setShowCreateModal(false);
      // Reset form
      setCycleForm({
        name: "",
        scope_type: "Department",
        scope_department_id: departments[0]?.id ? String(departments[0].id) : "",
        scope_location: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        auditor_ids: []
      });
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to create audit cycle.");
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.audits.updateAuditItem(verifyingItem.id, {
        verification_status: verificationForm.status,
        notes: verificationForm.notes
      });
      setSuccess("Audit item verified successfully!");
      setVerifyingItem(null);
      setVerificationForm({ status: "Verified", notes: "" });
      
      // Reload cycle data
      const list = await api.audits.getAudits();
      setCycles(list);
    } catch (err) {
      setError(err.message || "Failed to submit verification.");
    }
  };

  const handleCloseCycle = async (id) => {
    setError("");
    setSuccess("");
    try {
      await api.audits.closeAudit(id);
      setSuccess("Audit cycle closed and locked. Affected asset statuses updated.");
      
      const list = await api.audits.getAudits();
      setCycles(list);
    } catch (err) {
      setError(err.message || "Failed to close audit cycle.");
    }
  };

  const handleAuditorSelect = (empId) => {
    const list = [...cycleForm.auditor_ids];
    if (list.includes(empId)) {
      setCycleForm({ ...cycleForm, auditor_ids: list.filter(id => id !== empId) });
    } else {
      list.push(empId);
      setCycleForm({ ...cycleForm, auditor_ids: list });
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Structured Asset Audits</h2>
          <p className="text-xs text-slate-500 mt-1">Conduct stocktakes, mark assets Verified/Missing/Damaged, and generate discrepancy logs.</p>
        </div>

        {user.role === "Admin" && (
          <button
            onClick={() => {
              setCycleForm(prev => ({
                ...prev,
                scope_department_id: departments[0]?.id ? String(departments[0].id) : ""
              }));
              setShowCreateModal(true);
            }}
            className="bg-odoo-purple hover:bg-odoo-darkPurple text-white py-2 px-4 rounded-xl font-semibold flex items-center gap-2 text-sm shadow-md shadow-odoo-purple/10 hover:-translate-y-0.5 transition-all"
          >
            <PlusCircle size={16} />
            <span>Create Audit Cycle</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-center gap-3 text-sm text-red-700 font-medium">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-r-xl flex items-center gap-3 text-sm text-green-700 font-medium">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {loading && cycles.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-odoo-purple border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Audit Cycles List */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Audit Cycles</h3>
            
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {cycles.map((cycle) => (
                <button
                  key={cycle.id}
                  onClick={() => {
                    setSelectedCycle(cycle);
                    fetchDiscrepancies(cycle.id);
                  }}
                  className={`w-full text-left p-5 rounded-2xl border transition-all ${
                    selectedCycle?.id === cycle.id
                      ? "bg-odoo-purple text-white border-transparent shadow-lg shadow-odoo-purple/15"
                      : "bg-white text-slate-800 border-slate-100 hover:border-slate-300 shadow-sm"
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      cycle.status === "Active"
                        ? selectedCycle?.id === cycle.id ? "bg-white/20 text-white" : "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {cycle.status}
                    </span>
                    <span className={`text-[10px] font-semibold ${selectedCycle?.id === cycle.id ? 'text-purple-250' : 'text-slate-400'}`}>
                      {new Date(cycle.start_date).toLocaleDateString()} - {new Date(cycle.end_date).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm leading-tight">{cycle.name}</h4>
                  
                  <div className={`mt-3 flex items-center gap-1.5 text-xs ${
                    selectedCycle?.id === cycle.id ? "text-purple-200" : "text-slate-550"
                  }`}>
                    {cycle.scope_type === "Department" ? (
                      <>
                        <Users size={12} />
                        <span>Scope: Department ({cycle.scope_department_id ? departments.find(d=>d.id===cycle.scope_department_id)?.name : "IT"})</span>
                      </>
                    ) : (
                      <>
                        <MapPin size={12} />
                        <span>Scope: Location ({cycle.scope_location})</span>
                      </>
                    )}
                  </div>
                </button>
              ))}

              {cycles.length === 0 && (
                <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 italic text-xs shadow-sm">
                  No audit cycles created yet.
                </div>
              )}
            </div>
          </div>

          {/* Audit Verification Tasks */}
          <div className="lg:col-span-2 space-y-4">
            {selectedCycle ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
                {/* Header panel */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h3 className="font-bold text-slate-800">{selectedCycle.name}</h3>
                    <div className="flex gap-4 mt-2 text-xs text-slate-500 font-medium">
                      <span>Assigned Auditors: {selectedCycle.assignments.map(a => a.auditor.name).join(", ")}</span>
                    </div>
                  </div>

                  {user.role === "Admin" && selectedCycle.status === "Active" && (
                    <button
                      onClick={() => handleCloseCycle(selectedCycle.id)}
                      className="px-4 py-2 border border-slate-200 hover:border-red-200 hover:text-red-600 rounded-xl text-xs font-bold transition-all bg-white flex items-center gap-1.5"
                    >
                      <Lock size={12} />
                      <span>Close & Lock Cycle</span>
                    </button>
                  )}
                </div>

                {/* Scope items / verification checks */}
                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Verification Checklist</h4>
                    
                    <div className="divide-y divide-slate-100">
                      {selectedCycle.items.map((item) => {
                        const isAssignedAuditor = selectedCycle.assignments.some(a => a.auditor_id === user.id);
                        const canVerify = selectedCycle.status === "Active" && (isAssignedAuditor || user.role === "Admin");

                        return (
                          <div key={item.id} className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                            <div>
                              <h5 className="text-sm font-bold text-slate-850">
                                {item.asset.name} <span className="text-xs text-slate-400 font-mono">({item.asset.asset_tag})</span>
                              </h5>
                              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <MapPin size={12} className="text-slate-400" />
                                <span>{item.asset.location}</span>
                                {item.auditor && (
                                  <span className="text-slate-400 ml-2">
                                    • Verified by: <span className="font-semibold text-slate-655">{item.auditor.name}</span>
                                  </span>
                                )}
                              </p>
                              {item.notes && (
                                <p className="text-[11px] text-slate-500 italic mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                  Notes: "{item.notes}"
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                item.verification_status === "Verified" ? "bg-green-50 text-green-700" :
                                item.verification_status === "Missing" ? "bg-red-50 text-red-700 font-extrabold animate-pulse" :
                                item.verification_status === "Damaged" ? "bg-amber-50 text-amber-700" :
                                "bg-slate-100 text-slate-500"
                              }`}>
                                {item.verification_status}
                              </span>

                              {canVerify && (
                                <button
                                  onClick={() => {
                                    setVerifyingItem(item);
                                    setVerificationForm({ status: item.verification_status, notes: item.notes || "" });
                                  }}
                                  className="px-2.5 py-1.5 border border-slate-200 hover:border-odoo-purple hover:text-odoo-purple rounded-lg text-xs font-bold bg-white transition-all"
                                >
                                  Verify
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {selectedCycle.items.length === 0 && (
                        <div className="py-12 text-center text-slate-450 italic text-sm">
                          No items captured in scope.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Discrepancy summary report */}
                  {discrepancies.length > 0 && (
                    <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-2xl space-y-3">
                      <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle size={16} />
                        <span>Discrepancy Report</span>
                      </h4>
                      <div className="divide-y divide-amber-100/55 text-xs text-amber-900">
                        {discrepancies.map((item) => (
                          <div key={item.id} className="py-2 first:pt-0 last:pb-0 flex justify-between">
                            <span>{item.asset.name} ({item.asset.asset_tag})</span>
                            <span className="font-bold">{item.verification_status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-450 italic text-sm bg-white rounded-2xl border border-slate-100 h-full flex flex-col justify-center items-center">
                <ClipboardCheck size={36} className="mb-2 opacity-50" />
                <span>Select an audit cycle from the panel on the left to inspect tasks and discrepancies.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE CYCLE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h4 className="text-lg font-bold text-slate-800 font-sans">Create Audit Cycle</h4>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Audit Cycle Name</label>
                <input
                  type="text"
                  required
                  value={cycleForm.name}
                  onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none"
                  placeholder="e.g. Q3 Laptop Verification"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Scope Scope Type</label>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700 font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="scope_type"
                      checked={cycleForm.scope_type === "Department"}
                      onChange={() => setCycleForm({ ...cycleForm, scope_type: "Department" })}
                      className="text-odoo-purple focus:ring-odoo-purple"
                    />
                    <span>Department</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="scope_type"
                      checked={cycleForm.scope_type === "Location"}
                      onChange={() => setCycleForm({ ...cycleForm, scope_type: "Location" })}
                      className="text-odoo-purple focus:ring-odoo-purple"
                    />
                    <span>Location</span>
                  </label>
                </div>

                {cycleForm.scope_type === "Department" ? (
                  <select
                    required
                    value={cycleForm.scope_department_id}
                    onChange={(e) => setCycleForm({ ...cycleForm, scope_department_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none text-slate-600"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={cycleForm.scope_location}
                    onChange={(e) => setCycleForm({ ...cycleForm, scope_location: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none"
                    placeholder="e.g. HQ 4th Floor"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Start Date</label>
                  <input
                    type="date"
                    required
                    value={cycleForm.start_date}
                    onChange={(e) => setCycleForm({ ...cycleForm, start_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none text-slate-600 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">End Date</label>
                  <input
                    type="date"
                    required
                    value={cycleForm.end_date}
                    onChange={(e) => setCycleForm({ ...cycleForm, end_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none text-slate-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Assign Auditors</label>
                <div className="border border-slate-200 rounded-xl p-3 max-h-36 overflow-y-auto space-y-2">
                  {employees.map((emp) => (
                    <label key={emp.id} className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cycleForm.auditor_ids.includes(String(emp.id))}
                        onChange={() => handleAuditorSelect(String(emp.id))}
                        className="rounded text-odoo-purple focus:ring-odoo-purple"
                      />
                      <span>{emp.name} ({emp.role})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-odoo-purple hover:bg-odoo-darkPurple text-white text-sm font-semibold shadow-md shadow-odoo-purple/10 transition-all"
                >
                  Start Cycle & Fetch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VERIFY ITEM MODAL */}
      {verifyingItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-800">Verify Physical Asset</h4>
              <button onClick={() => setVerifyingItem(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleVerificationSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <p className="font-bold text-slate-800">Asset: {verifyingItem.asset.name}</p>
                <p className="mt-1">Tag: {verifyingItem.asset.asset_tag} • Location: {verifyingItem.asset.location}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Verification Status</label>
                <select
                  value={verificationForm.status}
                  onChange={(e) => setVerificationForm({ ...verificationForm, status: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none text-slate-600 font-bold"
                >
                  <option value="Verified">Verified (In Order)</option>
                  <option value="Missing">Missing (Discrepancy)</option>
                  <option value="Damaged">Damaged (Faulty / Needs Repair)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Auditor Notes</label>
                <textarea
                  value={verificationForm.notes}
                  onChange={(e) => setVerificationForm({ ...verificationForm, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none h-24"
                  placeholder="Record observations, check-in comments, or findings..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-odoo-purple hover:bg-odoo-darkPurple text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow-md shadow-odoo-purple/10 transition-all"
              >
                Submit Verification Check
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
