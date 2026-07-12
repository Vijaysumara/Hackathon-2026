const API_BASE_URL = "http://localhost:8000";

// Helper for fetching with JWT token attached
async function request(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = "API request failed";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch (e) {
      // Not JSON
    }
    
    // Create an error object with structured details
    const err = new Error(typeof errorDetail === 'object' ? errorDetail.message || JSON.stringify(errorDetail) : errorDetail);
    err.status = response.status;
    err.rawDetail = errorDetail;
    throw err;
  }

  // Handle empty responses
  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  // Authentication
  auth: {
    async login(email, password) {
      // OAuth2 password flow expects form data
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);
      
      const response = await fetch(`${API_BASE_URL}/auth/login/access-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });
      
      if (!response.ok) {
        let errorDetail = "Login failed";
        try {
          const errJson = await response.json();
          errorDetail = errJson.detail || errorDetail;
        } catch(e) {}
        throw new Error(errorDetail);
      }
      
      const data = await response.json();
      localStorage.setItem("token", data.access_token);
      return data;
    },
    
    register(email, name, password) {
      return request("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, name, password }),
      });
    },
    
    getMe() {
      return request("/auth/me");
    },
    
    changePassword(old_password, new_password) {
      return request("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ old_password, new_password }),
      });
    },
    
    logout() {
      localStorage.removeItem("token");
    }
  },

  // Organization Setup
  organization: {
    getDepartments() {
      return request("/organization/departments");
    },
    createDepartment(data) {
      return request("/organization/departments", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    updateDepartment(id, data) {
      return request(`/organization/departments/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    getCategories() {
      return request("/organization/categories");
    },
    createCategory(data) {
      return request("/organization/categories", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    updateCategory(id, data) {
      return request(`/organization/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    getEmployees() {
      return request("/organization/employees");
    },
    updateEmployee(id, data) {
      return request(`/organization/employees/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    }
  },

  // Asset Registry & Directory
  assets: {
    getAssets(filters = {}) {
      const params = new URLSearchParams();
      if (filters.query) params.append("query", filters.query);
      if (filters.category_id) params.append("category_id", filters.category_id);
      if (filters.status) params.append("status", filters.status);
      if (filters.is_shared !== undefined) params.append("is_shared", filters.is_shared);
      
      const queryStr = params.toString();
      return request(`/assets${queryStr ? `?${queryStr}` : ""}`);
    },
    getAsset(id) {
      return request(`/assets/${id}`);
    },
    registerAsset(data) {
      return request("/assets", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    updateAsset(id, data) {
      return request(`/assets/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    getAssetHistory(id) {
      return request(`/assets/${id}/history`);
    }
  },

  // Asset Allocations & Transfers
  allocations: {
    getAllocations() {
      return request("/allocations");
    },
    allocateAsset(data) {
      return request("/allocations", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    returnAsset(id, notes) {
      return request(`/allocations/${id}/return`, {
        method: "POST",
        body: JSON.stringify({ notes }),
      });
    },
    getTransfers() {
      return request("/allocations/transfers");
    },
    requestTransfer(data) {
      return request("/allocations/transfers", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    approveTransfer(id) {
      return request(`/allocations/transfers/${id}/approve`, {
        method: "PUT",
      });
    },
    rejectTransfer(id) {
      return request(`/allocations/transfers/${id}/reject`, {
        method: "PUT",
      });
    }
  },

  // Resource Booking
  bookings: {
    getBookings(assetId = null) {
      const url = assetId ? `/bookings?asset_id=${assetId}` : "/bookings";
      return request(url);
    },
    createBooking(data) {
      return request("/bookings", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    cancelBooking(id) {
      return request(`/bookings/${id}/cancel`, {
        method: "PUT",
      });
    },
    rescheduleBooking(id, data) {
      return request(`/bookings/${id}/reschedule`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    }
  },

  // Maintenance
  maintenance: {
    getMaintenanceRequests(filters = {}) {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.priority) params.append("priority", filters.priority);
      if (filters.asset_id) params.append("asset_id", filters.asset_id);
      
      const queryStr = params.toString();
      return request(`/maintenance${queryStr ? `?${queryStr}` : ""}`);
    },
    raiseMaintenance(data) {
      return request("/maintenance", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    approveMaintenance(id) {
      return request(`/maintenance/${id}/approve`, {
        method: "PUT",
      });
    },
    rejectMaintenance(id) {
      return request(`/maintenance/${id}/reject`, {
        method: "PUT",
      });
    },
    assignTechnician(id, technicianName) {
      return request(`/maintenance/${id}/assign`, {
        method: "PUT",
        body: JSON.stringify({ technician: technicianName }),
      });
    },
    resolveMaintenance(id) {
      return request(`/maintenance/${id}/resolve`, {
        method: "PUT",
      });
    }
  },

  // Audits
  audits: {
    getAudits() {
      return request("/audits");
    },
    getAudit(id) {
      return request(`/audits/${id}`);
    },
    createAudit(data) {
      return request("/audits", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    updateAuditItem(itemId, data) {
      return request(`/audits/items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    closeAudit(id) {
      return request(`/audits/${id}/close`, {
        method: "PUT",
      });
    },
    getDiscrepancies(id) {
      return request(`/audits/${id}/discrepancies`);
    }
  },

  // Reports & Analytics
  reports: {
    getDashboardStats() {
      return request("/reports/dashboard-stats");
    },
    getUtilization() {
      return request("/reports/utilization");
    },
    getMaintenanceFrequency() {
      return request("/reports/maintenance-frequency");
    },
    getDepartmentSummary() {
      return request("/reports/department-summary");
    },
    getBookingHeatmap() {
      return request("/reports/booking-heatmap");
    }
  },

  // Notifications & Logs
  notifications: {
    getNotifications() {
      return request("/notifications");
    },
    markRead(id) {
      return request(`/notifications/${id}/read`, {
        method: "PUT",
      });
    },
    markAllRead() {
      return request("/notifications/read-all", {
        method: "PUT",
      });
    },
    getActivityLogs() {
      return request("/notifications/logs");
    }
  }
};
