import React, { useState, useEffect } from "react";
import { api } from "../api";
import { 
  RefreshCw, 
  User, 
  Building2, 
  ArrowRightLeft, 
  Check, 
  X, 
  AlertCircle,
  PlusCircle,
  FileText,
  Clock,
  HelpCircle
} from "lucide-react";

export default function Allocations({ user }) {
  const [allocations, setAllocations] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // double allocation conflict state
  const [conflictDetails, setConflictDetails] = useState(null);

  // Forms state
  const [showAllocModal, setShowAllocModal] = useState(false);
  const [allocForm, setAllocForm] = useState({
    asset_id: "",
    allocated_type: "employee", // employee or department
    allocated_to_id: "",
    allocated_to_dept_id: "",
    expected_return_date: ""
  });

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returningAlloc, setReturningAlloc] = useState(null);
  const [returnNotes, setReturnNotes] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const allocList = await api.allocations.getAllocations();
      setAllocations(allocList);

      const transferList = await api.allocations.getTransfers();
      setTransfers(transferList);

      const assetList = await api.assets.getAssets({ status: "Available" });
      // Also get currently allocated assets so they can be selected in the list for transfers
      const allAssets = await api.assets.getAssets();
      setAssets(allAssets);

      const empList = await api.organization.getEmployees();
      setEmployees(empList);

      const deptList = await api.organization.getDepartments();
      setDepartments(deptList);
    } catch (e) {
      setError(e.message || "Failed to load allocation data.");
    } finally {
      setLoading(false);
    }
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setConflictDetails(null);

    const payload = {
      asset_id: parseInt(allocForm.asset_id),
      allocated_to_id: allocForm.allocated_type === "employee" ? parseInt(allocForm.allocated_to_id) : null,
      allocated_to_dept_id: allocForm.allocated_type === "department" ? parseInt(allocForm.allocated_to_dept_id) : null,
      expected_return_date: allocForm.expected_return_date || null
    };

    try {
      await api.allocations.allocateAsset(payload);
      setSuccess("Asset allocated successfully!");
      setShowAllocModal(false);
      fetchData();
    } catch (err) {
      if (err.status === 409) {
        // Double allocation conflict occurred!
        setConflictDetails(err.rawDetail);
      } else {
        setError(err.message || "Failed to allocate asset.");
      }
    }
  };

  const triggerTransferRequest = async () => {
    setError("");
    setSuccess("");
    if (!conflictDetails) return;

    try {
      const payload = {
        asset_id: conflictDetails.asset_id,
        target_employee_id: allocForm.allocated_type === "employee" ? parseInt(allocForm.allocated_to_id) : null,
        target_dept_id: allocForm.allocated_type === "department" ? parseInt(allocForm.allocated_to_dept_id) : null
      };

      await api.allocations.requestTransfer(payload);
      setSuccess("Transfer request submitted successfully! Awaiting manager approval.");
      setConflictDetails(null);
      setShowAllocModal(false);
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to request transfer.");
    }
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.allocations.returnAsset(returningAlloc.id, returnNotes);
      setSuccess("Asset returned successfully. Status is now Available.");
      setShowReturnModal(false);
      setReturningAlloc(null);
      setReturnNotes("");
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to return asset.");
    }
  };

  const handleApproveTransfer = async (id) => {
    setError("");
    setSuccess("");
    try {
      await api.allocations.approveTransfer(id);
      setSuccess("Transfer request approved and asset re-allocated!");
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to approve transfer.");
    }
  };

  const handleRejectTransfer = async (id) => {
    setError("");
    setSuccess("");
    try {
      await api.allocations.rejectTransfer(id);
      setSuccess("Transfer request rejected.");
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to reject transfer.");
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Allocations & Transfers</h2>
          <p className="text-xs text-slate-500 mt-1">Assign equipment to staff/departments or request asset transfers between roles.</p>
        </div>

        {/* Allocate button (Managers/Admins only) */}
        {(user.role === "Admin" || user.role === "Asset Manager") && (
          <button
            onClick={() => {
              setConflictDetails(null);
              if (assets.length > 0) {
                setAllocForm(prev => ({ 
                  ...prev, 
                  asset_id: String(assets[0].id),
                  allocated_to_id: employees[0]?.id ? String(employees[0].id) : "",
                  allocated_to_dept_id: departments[0]?.id ? String(departments[0].id) : ""
                }));
              }
              setShowAllocModal(true);
            }}
            className="bg-odoo-purple hover:bg-odoo-darkPurple text-white py-2 px-4 rounded-xl font-semibold flex items-center gap-2 text-sm shadow-md shadow-odoo-purple/10 hover:-translate-y-0.5 transition-all"
          >
            <PlusCircle size={16} />
            <span>Allocate Asset</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-center gap-3 text-sm text-red-700 font-medium">
          <AlertCircle size={18} />
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
          {/* Active Allocations Column */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <User size={18} className="text-slate-500" />
              <span>Active Equipment Allocations</span>
            </h3>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-55 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="p-4">Asset</th>
                      <th className="p-4">Allocated To</th>
                      <th className="p-4">Due Date</th>
                      <th className="p-4">Status</th>
                      {(user.role === "Admin" || user.role === "Asset Manager") && (
                        <th className="p-4 text-right">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-650">
                    {allocations
                      .filter(a => a.status === "Active" || a.status === "Overdue")
                      .map((alloc) => (
                        <tr key={alloc.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="p-4 font-bold text-slate-800">
                            {alloc.asset.name} <span className="text-xs text-slate-400 font-mono">({alloc.asset.asset_tag})</span>
                          </td>
                          <td className="p-4 flex items-center gap-2">
                            {alloc.allocated_to_dept_id ? (
                              <>
                                <Building2 size={14} className="text-slate-400" />
                                <span>{alloc.allocated_to_dept.name}</span>
                              </>
                            ) : (
                              <>
                                <User size={14} className="text-slate-400" />
                                <span>{alloc.allocated_to.name}</span>
                              </>
                            )}
                          </td>
                          <td className="p-4 font-mono text-xs">
                            {alloc.expected_return_date ? new Date(alloc.expected_return_date).toLocaleDateString() : <span className="text-slate-400 italic">No limit</span>}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold inline-block ${
                              alloc.status === "Overdue" ? "bg-red-50 text-red-700 animate-pulse font-bold" : "bg-green-50 text-green-700"
                            }`}>
                              {alloc.status}
                            </span>
                          </td>
                          {(user.role === "Admin" || user.role === "Asset Manager") && (
                            <td className="p-4 text-right">
                              <button
                                onClick={() => {
                                  setReturningAlloc(alloc);
                                  setShowReturnModal(true);
                                }}
                                className="px-3 py-1.5 border border-slate-200 hover:border-odoo-purple hover:text-odoo-purple rounded-xl text-xs font-bold transition-all bg-white"
                              >
                                Return
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    {allocations.filter(a => a.status === "Active" || a.status === "Overdue").length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-450 italic">
                          No active allocations.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Transfer Workflow Column */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ArrowRightLeft size={18} className="text-slate-500" />
              <span>Transfer Workflows</span>
            </h3>

            <div className="space-y-4">
              {transfers.map((req) => {
                const target = req.target_dept_id ? `Dept: ${req.target_dept.name}` : `Staff: ${req.target_employee.name}`;
                return (
                  <div key={req.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-650">
                        {req.asset.asset_tag}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        req.status === "Pending" ? "bg-amber-50 text-amber-700 animate-pulse" :
                        req.status === "Approved" ? "bg-green-50 text-green-700" :
                        "bg-red-50 text-red-700"
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="text-sm">
                      <h4 className="font-bold text-slate-850">{req.asset.name}</h4>
                      <div className="mt-2 text-slate-500 text-xs space-y-1">
                        <p>Requested by: <span className="font-semibold text-slate-700">{req.requested_by.name}</span></p>
                        <p>Target Transfer: <span className="font-semibold text-slate-700">{target}</span></p>
                      </div>
                    </div>

                    {req.status === "Pending" && (user.role === "Admin" || user.role === "Asset Manager" || user.role === "Department Head") && (
                      <div className="pt-2 border-t border-slate-50 flex gap-2">
                        <button
                          onClick={() => handleRejectTransfer(req.id)}
                          className="flex-1 py-2 border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all bg-white"
                        >
                          <X size={14} />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleApproveTransfer(req.id)}
                          className="flex-1 py-2 bg-odoo-purple hover:bg-odoo-darkPurple text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-sm"
                        >
                          <Check size={14} />
                          <span>Approve</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {transfers.length === 0 && (
                <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 italic text-sm">
                  No transfer requests found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ALLOCATION MODAL WITH DOUBLE ALLOCATION CONFLICT HANDLING */}
      {showAllocModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h4 className="text-lg font-bold text-slate-800">Allocate Equipment</h4>
            </div>

            {conflictDetails ? (
              // DOUBLE ALLOCATION INTERACTIVE CONFLICT SCREEN
              <div className="p-6 space-y-6">
                <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex gap-3 text-sm text-red-750 font-medium">
                  <AlertCircle size={24} className="text-red-500 shrink-0" />
                  <div>
                    <h5 className="font-bold text-red-800">Double Allocation Conflict</h5>
                    <p className="mt-1 leading-relaxed">{conflictDetails.message}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-xs text-slate-600">
                  <p>The system blocks direct double allocation to maintain chain-of-custody tracking.</p>
                  <p className="font-bold text-slate-800">Option 1: Initiate a Transfer Request</p>
                  <p>This raises an authorization request. Once approved by the Manager/Department Head, the asset re-allocates automatically.</p>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setConflictDetails(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
                  >
                    Go Back
                  </button>
                  <button
                    type="button"
                    onClick={triggerTransferRequest}
                    className="px-4 py-2 rounded-xl bg-odoo-purple hover:bg-odoo-darkPurple text-white text-sm font-semibold shadow-md shadow-odoo-purple/10 transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw size={16} className="animate-spin-slow" />
                    <span>Raise Transfer Request</span>
                  </button>
                </div>
              </div>
            ) : (
              // REGULAR ALLOCATION ENTRY FORM
              <form onSubmit={handleAllocate} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Select Asset</label>
                  <select
                    required
                    value={allocForm.asset_id}
                    onChange={(e) => setAllocForm({ ...allocForm, asset_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none text-slate-600"
                  >
                    {assets.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.asset_tag} - {a.status})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Allocation Holder</label>
                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700 font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="holder"
                        checked={allocForm.allocated_type === "employee"}
                        onChange={() => setAllocForm({ ...allocForm, allocated_type: "employee" })}
                        className="text-odoo-purple focus:ring-odoo-purple"
                      />
                      <span>Employee</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="holder"
                        checked={allocForm.allocated_type === "department"}
                        onChange={() => setAllocForm({ ...allocForm, allocated_type: "department" })}
                        className="text-odoo-purple focus:ring-odoo-purple"
                      />
                      <span>Department</span>
                    </label>
                  </div>

                  {allocForm.allocated_type === "employee" ? (
                    <select
                      required
                      value={allocForm.allocated_to_id}
                      onChange={(e) => setAllocForm({ ...allocForm, allocated_to_id: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none text-slate-600"
                    >
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      required
                      value={allocForm.allocated_to_dept_id}
                      onChange={(e) => setAllocForm({ ...allocForm, allocated_to_dept_id: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none text-slate-600"
                    >
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Expected Return Date</label>
                  <input
                    type="date"
                    value={allocForm.expected_return_date}
                    onChange={(e) => setAllocForm({ ...allocForm, expected_return_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none text-slate-600"
                  />
                  <span className="text-[10px] text-slate-450 mt-1 block">Leave blank for permanent assignments.</span>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAllocModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-odoo-purple hover:bg-odoo-darkPurple text-white text-sm font-semibold shadow-md shadow-odoo-purple/10 transition-all"
                  >
                    Allocate Asset
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* RETURN NOTE CAPTURE MODAL */}
      {showReturnModal && returningAlloc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-800">Return Check-In Notes</h4>
              <button onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleReturn} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-1">
                <p className="font-bold text-slate-800">Asset: {returningAlloc.asset.name}</p>
                <p>Allocated Holder: {returningAlloc.allocated_to_dept_id ? returningAlloc.allocated_to_dept.name : returningAlloc.allocated_to.name}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Check-in Condition / Notes</label>
                <textarea
                  value={returnNotes}
                  required
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none h-24"
                  placeholder="Record screen condition, scratch reports, or returned components..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-odoo-purple hover:bg-odoo-darkPurple text-white py-2 px-4 rounded-xl text-xs font-bold shadow-md shadow-odoo-purple/10 transition-all"
              >
                Mark Returned & Release Asset
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
