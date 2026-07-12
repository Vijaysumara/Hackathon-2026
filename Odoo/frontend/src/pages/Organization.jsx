import React, { useState, useEffect } from "react";
import { api } from "../api";
import { 
  Building2, 
  FolderPlus, 
  Users, 
  PlusCircle, 
  Pencil, 
  Power,
  ShieldCheck,
  CheckCircle,
  AlertCircle
} from "lucide-react";

export default function Organization() {
  const [activeTab, setActiveTab] = useState("departments");
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals / Forms state
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: "", head_id: "", parent_id: "", status: "Active" });

  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: "", custom_fields: "" });

  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [empForm, setEmpForm] = useState({ name: "", email: "", role: "Employee", department_id: "", status: "Active" });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      if (activeTab === "departments") {
        const depts = await api.organization.getDepartments();
        const emps = await api.organization.getEmployees();
        setDepartments(depts);
        setEmployees(emps);
      } else if (activeTab === "categories") {
        const cats = await api.organization.getCategories();
        setCategories(cats);
      } else if (activeTab === "employees") {
        const emps = await api.organization.getEmployees();
        const depts = await api.organization.getDepartments();
        setEmployees(emps);
        setDepartments(depts);
      }
    } catch (e) {
      setError(e.message || "Failed to load organization settings.");
    } finally {
      setLoading(false);
    }
  };

  // ----------------- DEPARTMENT ACTIONS -----------------
  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const payload = {
        name: deptForm.name,
        head_id: deptForm.head_id ? parseInt(deptForm.head_id) : null,
        parent_id: deptForm.parent_id ? parseInt(deptForm.parent_id) : null,
        status: deptForm.status
      };
      
      if (editingDept) {
        await api.organization.updateDepartment(editingDept.id, payload);
        setSuccess("Department updated successfully!");
      } else {
        await api.organization.createDepartment(payload);
        setSuccess("Department created successfully!");
      }
      setShowDeptModal(false);
      fetchData();
    } catch (e) {
      setError(e.message);
    }
  };

  const openEditDept = (dept) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      head_id: dept.head_id ? String(dept.head_id) : "",
      parent_id: dept.parent_id ? String(dept.parent_id) : "",
      status: dept.status
    });
    setShowDeptModal(true);
  };

  // ----------------- CATEGORY ACTIONS -----------------
  const handleCatSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const payload = {
        name: catForm.name,
        custom_fields: catForm.custom_fields || null
      };

      if (editingCat) {
        await api.organization.updateCategory(editingCat.id, payload);
        setSuccess("Category updated successfully!");
      } else {
        await api.organization.createCategory(payload);
        setSuccess("Category created successfully!");
      }
      setShowCatModal(false);
      fetchData();
    } catch (e) {
      setError(e.message);
    }
  };

  const openEditCat = (cat) => {
    setEditingCat(cat);
    setCatForm({
      name: cat.name,
      custom_fields: cat.custom_fields || ""
    });
    setShowCatModal(true);
  };

  // ----------------- EMPLOYEE ACTIONS -----------------
  const handleEmpSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const payload = {
        name: empForm.name,
        email: empForm.email,
        role: empForm.role,
        department_id: empForm.department_id ? parseInt(empForm.department_id) : 0, // 0 maps to null in backend
        status: empForm.status
      };

      await api.organization.updateEmployee(editingEmp.id, payload);
      setSuccess("Employee details and role promotions updated!");
      setShowEmpModal(false);
      fetchData();
    } catch (e) {
      setError(e.message);
    }
  };

  const openEditEmp = (emp) => {
    setEditingEmp(emp);
    setEmpForm({
      name: emp.name,
      email: emp.email,
      role: emp.role,
      department_id: emp.department_id ? String(emp.department_id) : "",
      status: emp.status
    });
    setShowEmpModal(true);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveTab("departments"); setSuccess(""); setError(""); }}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-all ${
            activeTab === "departments"
              ? "border-odoo-purple text-odoo-purple bg-purple-50/10"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Building2 size={16} />
          <span>Tab A - Departments</span>
        </button>
        <button
          onClick={() => { setActiveTab("categories"); setSuccess(""); setError(""); }}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-all ${
            activeTab === "categories"
              ? "border-odoo-purple text-odoo-purple bg-purple-50/10"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FolderPlus size={16} />
          <span>Tab B - Asset Categories</span>
        </button>
        <button
          onClick={() => { setActiveTab("employees"); setSuccess(""); setError(""); }}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-all ${
            activeTab === "employees"
              ? "border-odoo-purple text-odoo-purple bg-purple-50/10"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users size={16} />
          <span>Tab C - Employee Directory</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-center gap-3 text-sm text-red-700 font-medium">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-r-xl flex items-center gap-3 text-sm text-green-700 font-medium">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-odoo-purple border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div>
          {/* DEPARTMENTS TAB */}
          {activeTab === "departments" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Departments Management</h3>
                  <p className="text-xs text-slate-500 mt-1">Set up business divisions, hierarchies, and assign department heads.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingDept(null);
                    setDeptForm({ name: "", head_id: "", parent_id: "", status: "Active" });
                    setShowDeptModal(true);
                  }}
                  className="bg-odoo-purple hover:bg-odoo-darkPurple text-white py-2 px-4 rounded-xl font-semibold flex items-center gap-2 text-sm shadow-sm hover:shadow transition-all"
                >
                  <PlusCircle size={16} />
                  <span>Create Department</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-55 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="p-4">Department Name</th>
                      <th className="p-4">Department Head</th>
                      <th className="p-4">Parent Department</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-650">
                    {departments.map((dept) => {
                      const parentDept = departments.find(d => d.id === dept.parent_id);
                      return (
                        <tr key={dept.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="p-4 font-bold text-slate-800">{dept.name}</td>
                          <td className="p-4">{dept.head ? dept.head.name : <span className="text-slate-400 italic">None assigned</span>}</td>
                          <td className="p-4">{parentDept ? parentDept.name : <span className="text-slate-400 italic">None</span>}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold inline-block ${
                              dept.status === "Active" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                            }`}>
                              {dept.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => openEditDept(dept)}
                              className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg inline-flex items-center"
                            >
                              <Pencil size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CATEGORIES TAB */}
          {activeTab === "categories" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Asset Categories Customization</h3>
                  <p className="text-xs text-slate-500 mt-1">Configure asset categories and optional metadata fields (e.g. warranty schemas).</p>
                </div>
                <button
                  onClick={() => {
                    setEditingCat(null);
                    setCatForm({ name: "", custom_fields: "" });
                    setShowCatModal(true);
                  }}
                  className="bg-odoo-purple hover:bg-odoo-darkPurple text-white py-2 px-4 rounded-xl font-semibold flex items-center gap-2 text-sm shadow-sm hover:shadow transition-all"
                >
                  <PlusCircle size={16} />
                  <span>Add Category</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-55 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="p-4">Category Name</th>
                      <th className="p-4">Custom Fields / Properties</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-650">
                    {categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="p-4 font-bold text-slate-800">{cat.name}</td>
                        <td className="p-4">
                          <code className="text-xs bg-slate-50 p-2 rounded-md font-mono text-slate-600 border border-slate-100 block max-w-lg truncate">
                            {cat.custom_fields || "None defined"}
                          </code>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => openEditCat(cat)}
                            className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg inline-flex items-center"
                          >
                            <Pencil size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* EMPLOYEE DIRECTORY */}
          {activeTab === "employees" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-800">Employee Directory</h3>
                <p className="text-xs text-slate-500 mt-1">Review employees, assign departments, and promote to Department Head or Asset Manager.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-55 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">System Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Promotions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-650">
                    {employees.map((emp) => {
                      const dept = departments.find(d => d.id === emp.department_id);
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="p-4 font-bold text-slate-800">{emp.name}</td>
                          <td className="p-4 text-slate-550 font-mono text-xs">{emp.email}</td>
                          <td className="p-4">{dept ? dept.name : <span className="text-slate-400 italic">None</span>}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold inline-block border ${
                              emp.role === "Admin"
                                ? "bg-red-50 text-red-700 border-red-100"
                                : emp.role === "Asset Manager"
                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                : emp.role === "Department Head"
                                ? "bg-purple-50 text-odoo-purple border-purple-100"
                                : "bg-slate-50 text-slate-600 border-slate-100"
                            }`}>
                              {emp.role}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold inline-block ${
                              emp.status === "Active" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                            }`}>
                              {emp.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {emp.role !== "Admin" ? (
                              <button
                                onClick={() => openEditEmp(emp)}
                                className="px-3 py-1.5 border border-slate-200 hover:border-odoo-purple hover:text-odoo-purple text-slate-600 rounded-xl inline-flex items-center gap-1.5 text-xs font-bold transition-all"
                              >
                                <ShieldCheck size={14} />
                                <span>Promote/Update</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 italic pr-4">Admin locked</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DEPARTMENT MODAL */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h4 className="text-lg font-bold text-slate-800">
                {editingDept ? "Modify Department" : "Create New Department"}
              </h4>
            </div>
            <form onSubmit={handleDeptSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Department Name</label>
                <input
                  type="text"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none"
                  placeholder="e.g. Finance & Accounting"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Department Head</label>
                <select
                  value={deptForm.head_id}
                  onChange={(e) => setDeptForm({ ...deptForm, head_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none"
                >
                  <option value="">No head assigned</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Parent Department (Hierarchy)</label>
                <select
                  value={deptForm.parent_id}
                  onChange={(e) => setDeptForm({ ...deptForm, parent_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none"
                >
                  <option value="">No parent (Top level)</option>
                  {departments
                    .filter(d => !editingDept || d.id !== editingDept.id)
                    .map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))
                  }
                </select>
              </div>

              {editingDept && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Status</label>
                  <select
                    value={deptForm.status}
                    onChange={(e) => setDeptForm({ ...deptForm, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none font-medium"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive (Deactivate)</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-odoo-purple hover:bg-odoo-darkPurple text-white text-sm font-semibold shadow-md shadow-odoo-purple/10 transition-all"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {showCatModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h4 className="text-lg font-bold text-slate-800">
                {editingCat ? "Modify Asset Category" : "Add Asset Category"}
              </h4>
            </div>
            <form onSubmit={handleCatSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Category Name</label>
                <input
                  type="text"
                  required
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none"
                  placeholder="e.g. Heavy Vehicles"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Category Attributes (JSON string)
                </label>
                <textarea
                  value={catForm.custom_fields}
                  onChange={(e) => setCatForm({ ...catForm, custom_fields: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none font-mono h-24"
                  placeholder='{"warranty_period": 12, "manufacturer": "String"}'
                />
                <span className="text-[10px] text-slate-450 block mt-1">Specify custom fields to link schema variables for this category.</span>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-odoo-purple hover:bg-odoo-darkPurple text-white text-sm font-semibold shadow-md shadow-odoo-purple/10 transition-all"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMPLOYEE PROMOTION MODAL */}
      {showEmpModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h4 className="text-lg font-bold text-slate-800">
                Promote / Update Employee
              </h4>
            </div>
            <form onSubmit={handleEmpSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h5 className="text-sm font-bold text-slate-800">{editingEmp.name}</h5>
                <p className="text-xs text-slate-550 mt-0.5">{editingEmp.email}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Promote Role</label>
                <select
                  value={empForm.role}
                  onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none font-semibold"
                >
                  <option value="Employee">Employee (Regular)</option>
                  <option value="Department Head">Department Head</option>
                  <option value="Asset Manager">Asset Manager</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Associate Department</label>
                <select
                  value={empForm.department_id}
                  onChange={(e) => setEmpForm({ ...empForm, department_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none"
                >
                  <option value="">No department assigned</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Employment Status</label>
                <select
                  value={empForm.status}
                  onChange={(e) => setEmpForm({ ...empForm, status: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none font-medium"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEmpModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-odoo-purple hover:bg-odoo-darkPurple text-white text-sm font-semibold shadow-md shadow-odoo-purple/10 transition-all"
                >
                  Update Promotion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
