import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { api } from "../api";
import { 
  Search, 
  Filter, 
  History, 
  QrCode, 
  PlusCircle, 
  Info,
  Calendar,
  DollarSign,
  MapPin,
  FileCheck,
  X,
  AlertCircle
} from "lucide-react";

const Assets = forwardRef(({ user, initialOpenRegister = false }, ref) => {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters state
  const [filterText, setFilterText] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterShared, setFilterShared] = useState("");

  // Modals state
  const [showRegisterModal, setShowRegisterModal] = useState(initialOpenRegister);
  const [selectedAssetHistory, setSelectedAssetHistory] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrValue, setQrValue] = useState("");

  // Register Form state
  const [assetForm, setAssetForm] = useState({
    name: "",
    category_id: "",
    serial_number: "",
    acquisition_date: new Date().toISOString().split("T")[0],
    acquisition_cost: "",
    condition: "New",
    location: "",
    is_shared: false,
    image_url: "",
    document_url: ""
  });

  // Expose register modal opening to the parent App.jsx component
  useImperativeHandle(ref, () => ({
    openRegister() {
      setAssetForm({
        name: "",
        category_id: categories[0]?.id || "",
        serial_number: "",
        acquisition_date: new Date().toISOString().split("T")[0],
        acquisition_cost: "",
        condition: "New",
        location: "",
        is_shared: false,
        image_url: "",
        document_url: ""
      });
      setShowRegisterModal(true);
    }
  }));

  useEffect(() => {
    fetchData();
  }, [filterText, filterCat, filterStatus, filterShared]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const cats = await api.organization.getCategories();
      setCategories(cats);

      const filters = {};
      if (filterText) filters.query = filterText;
      if (filterCat) filters.category_id = filterCat;
      if (filterStatus) filters.status = filterStatus;
      if (filterShared !== "") filters.is_shared = filterShared === "true";

      const list = await api.assets.getAssets(filters);
      setAssets(list);
    } catch (e) {
      setError(e.message || "Failed to load assets.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        ...assetForm,
        category_id: parseInt(assetForm.category_id),
        acquisition_cost: parseFloat(assetForm.acquisition_cost)
      };

      await api.assets.registerAsset(payload);
      setShowRegisterModal(false);
      fetchData();
    } catch (e) {
      setError(e.message);
    }
  };

  const openAssetHistory = async (assetId) => {
    setError("");
    try {
      const history = await api.assets.getAssetHistory(assetId);
      setSelectedAssetHistory(history);
      setShowHistoryModal(true);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleQRSearch = (e) => {
    e.preventDefault();
    setFilterText(qrValue);
    setShowQRModal(false);
    setQrValue("");
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
      {/* Header section with actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Asset Registry & Directory</h2>
          <p className="text-xs text-slate-500 mt-1">Catalog, allocate, and audit corporate hardware assets centrally.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowQRModal(true)}
            className="flex items-center gap-2 border border-slate-200 hover:border-odoo-purple hover:text-odoo-purple px-4 py-2 bg-white rounded-xl text-sm font-semibold transition-all shadow-sm"
          >
            <QrCode size={16} />
            <span>Scan QR/Barcode</span>
          </button>
          
          {(user.role === "Admin" || user.role === "Asset Manager") && (
            <button
              onClick={() => {
                if (categories.length > 0) {
                  setAssetForm(prev => ({ ...prev, category_id: String(categories[0].id) }));
                }
                setShowRegisterModal(true);
              }}
              className="bg-odoo-purple hover:bg-odoo-darkPurple text-white py-2 px-4 rounded-xl font-semibold flex items-center gap-2 text-sm shadow-md shadow-odoo-purple/10 hover:-translate-y-0.5 transition-all"
            >
              <PlusCircle size={16} />
              <span>Register Asset</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-center gap-3 text-sm text-red-700 font-medium">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none"
            placeholder="Search tag, serial, name, location..."
          />
        </div>

        <div>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none text-slate-600"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none text-slate-600 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Allocated">Allocated</option>
            <option value="Reserved">Reserved</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Lost">Lost</option>
            <option value="Retired">Retired</option>
            <option value="Disposed">Disposed</option>
          </select>
        </div>

        <div>
          <select
            value={filterShared}
            onChange={(e) => setFilterShared(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none text-slate-600"
          >
            <option value="">Allocation Types</option>
            <option value="false">Dedicated Asset</option>
            <option value="true">Shared Resource</option>
          </select>
        </div>
      </div>

      {/* Assets Grid */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-odoo-purple border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset) => (
            <div key={asset.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-all duration-200">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono bg-slate-100 text-slate-650 px-2 py-0.5 rounded-md font-bold">
                    {asset.asset_tag}
                  </span>
                  
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    asset.status === "Available" ? "bg-green-50 text-green-700" :
                    asset.status === "Allocated" ? "bg-blue-50 text-blue-700" :
                    asset.status === "Under Maintenance" ? "bg-amber-50 text-amber-700 animate-pulse" :
                    asset.status === "Lost" ? "bg-red-50 text-red-700" :
                    "bg-slate-100 text-slate-555"
                  }`}>
                    {asset.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-800">{asset.name}</h3>
                  <p className="text-xs text-slate-450 mt-1">
                    Category: <span className="font-semibold text-slate-600">{asset.category ? asset.category.name : "N/A"}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-slate-400" />
                    <span className="truncate">{asset.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <FileCheck size={14} className="text-slate-400" />
                    <span>{asset.is_shared ? "Shared Bookable" : "Dedicated"}</span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-50 bg-slate-50/50 flex gap-3">
                <button
                  onClick={() => openAssetHistory(asset.id)}
                  className="flex-1 py-2 border border-slate-200 hover:border-odoo-purple hover:text-odoo-purple rounded-xl text-xs font-bold bg-white text-slate-600 transition-all flex items-center justify-center gap-1"
                >
                  <History size={14} />
                  <span>Audit History</span>
                </button>
              </div>
            </div>
          ))}

          {assets.length === 0 && (
            <div className="col-span-full h-64 bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-slate-400 shadow-sm">
              <Info size={32} className="mb-2 opacity-50" />
              <span className="text-sm font-medium">No assets matching the query found.</span>
            </div>
          )}
        </div>
      )}

      {/* REGISTER MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h4 className="text-lg font-bold text-slate-800">Register Physical Asset</h4>
              <button onClick={() => setShowRegisterModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleRegister} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Asset Name</label>
                  <input
                    type="text"
                    required
                    value={assetForm.name}
                    onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none"
                    placeholder="e.g. MacBook Pro 14"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Asset Category</label>
                  <select
                    required
                    value={assetForm.category_id}
                    onChange={(e) => setAssetForm({ ...assetForm, category_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none text-slate-600"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Serial Number</label>
                  <input
                    type="text"
                    required
                    value={assetForm.serial_number}
                    onChange={(e) => setAssetForm({ ...assetForm, serial_number: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none"
                    placeholder="SN-1234567"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Acquisition Date</label>
                  <input
                    type="date"
                    required
                    value={assetForm.acquisition_date}
                    onChange={(e) => setAssetForm({ ...assetForm, acquisition_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Acquisition Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={assetForm.acquisition_cost}
                    onChange={(e) => setAssetForm({ ...assetForm, acquisition_cost: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none"
                    placeholder="1200.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Condition</label>
                  <select
                    value={assetForm.condition}
                    onChange={(e) => setAssetForm({ ...assetForm, condition: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none text-slate-600"
                  >
                    <option value="New">New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Location / Room</label>
                  <input
                    type="text"
                    required
                    value={assetForm.location}
                    onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none"
                    placeholder="HQ Room 402"
                  />
                </div>

                <div className="col-span-2 py-2 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_shared"
                    checked={assetForm.is_shared}
                    onChange={(e) => setAssetForm({ ...assetForm, is_shared: e.target.checked })}
                    className="h-4 w-4 text-odoo-purple focus:ring-odoo-purple border-slate-300 rounded"
                  />
                  <label htmlFor="is_shared" className="text-sm font-semibold text-slate-700">
                    Mark as Shared Bookable Resource
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-odoo-purple hover:bg-odoo-darkPurple text-white text-sm font-semibold shadow-md shadow-odoo-purple/10 transition-all"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDIT HISTORY MODAL */}
      {showHistoryModal && selectedAssetHistory && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h4 className="text-lg font-bold text-slate-800">Asset History Log</h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedAssetHistory.name} ({selectedAssetHistory.tag})</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Allocations history section */}
              <div>
                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Allocation Log</h5>
                <div className="space-y-3">
                  {selectedAssetHistory.allocations.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No allocation logs found for this asset.</p>
                  ) : (
                    selectedAssetHistory.allocations.map((alloc, i) => (
                      <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{alloc.target}</p>
                          <p className="text-slate-500 mt-1">
                            Allocated on {new Date(alloc.allocation_date).toLocaleDateString()}
                            {alloc.expected_return_date && ` • Expected: ${new Date(alloc.expected_return_date).toLocaleDateString()}`}
                          </p>
                          {alloc.return_notes && (
                            <p className="text-slate-600 mt-1.5 p-2 bg-slate-100/50 rounded-lg italic">
                              Check-in notes: "{alloc.return_notes}"
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            alloc.status === "Active" ? "bg-green-50 text-green-700" :
                            alloc.status === "Returned" ? "bg-slate-100 text-slate-500" :
                            "bg-red-50 text-red-700"
                          }`}>
                            {alloc.status}
                          </span>
                          {alloc.actual_return_date && (
                            <span className="block text-slate-400 mt-1 text-[10px]">
                              Returned {new Date(alloc.actual_return_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Maintenance history section */}
              <div>
                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Maintenance & Repair Log</h5>
                <div className="space-y-3">
                  {selectedAssetHistory.maintenance.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No maintenance records found for this asset.</p>
                  ) : (
                    selectedAssetHistory.maintenance.map((maint, i) => (
                      <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 flex justify-between items-start text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{maint.description}</p>
                          <p className="text-slate-500 mt-1">
                            Raised on {new Date(maint.created_at).toLocaleString()}
                          </p>
                          {maint.technician && (
                            <p className="text-slate-600 mt-1.5 font-medium">
                              Assigned Technician: {maint.technician}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex flex-col gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                            maint.status === "Resolved" ? "bg-green-50 text-green-700" :
                            maint.status === "Pending" ? "bg-slate-100 text-slate-500" :
                            "bg-amber-50 text-amber-700"
                          }`}>
                            {maint.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded inline-block">
                            Priority: {maint.priority}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR SCAN MOCK MODAL */}
      {showQRModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-800">Scan QR Code (Mock POC)</h4>
              <button onClick={() => setShowQRModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleQRSearch} className="p-6 space-y-4">
              <div className="h-48 bg-slate-900 rounded-xl relative overflow-hidden border border-slate-800 flex items-center justify-center flex-col text-slate-400 text-xs gap-3">
                <QrCode size={48} className="text-slate-500 animate-pulse" />
                <span>Simulating QR camera stream...</span>
                <div className="absolute inset-x-0 h-0.5 bg-green-500 top-1/2 -translate-y-1/2 animate-bounce"></div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Scan QR Value (Input Mock)
                </label>
                <input
                  type="text"
                  required
                  value={qrValue}
                  onChange={(e) => setQrValue(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none font-mono"
                  placeholder="e.g. AF-0001"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-odoo-purple hover:bg-odoo-darkPurple text-white py-2 px-4 rounded-xl text-xs font-bold shadow-md shadow-odoo-purple/10 transition-all"
              >
                Mock Scan Success
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

export default Assets;
