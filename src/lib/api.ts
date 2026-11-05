// Client API client for Wave Donuts Egypt

export function getToken(): string | null {
  return localStorage.getItem('wave_token');
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem('wave_token', token);
  } else {
    localStorage.removeItem('wave_token');
  }
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `فشل الطلب مع رمز الحالة ${res.status}`);
  }
  return data;
}

export const api = {
  // Initial Owner Setup & Auth
  getSetupStatus: () => request('/api/admin/setup-status'),
  setupAdmin: (body: any) => request('/api/admin/setup', { method: 'POST', body: JSON.stringify(body) }),
  register: (body: any) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/api/auth/me'),

  // Store Settings (Public & Admin)
  getSettings: () => request('/api/settings'),
  updateSettings: (body: any) => request('/api/admin/settings', { method: 'PUT', body: JSON.stringify(body) }),

  // Public Catalog & Delivery
  getDonuts: () => request('/api/donuts'),
  getDeliveryLocations: () => request('/api/delivery-locations'),

  // Customer Addresses (Egyptian fields)
  getAddresses: () => request('/api/addresses'),
  addAddress: (body: any) => request('/api/addresses', { method: 'POST', body: JSON.stringify(body) }),
  deleteAddress: (id: string) => request(`/api/addresses/${id}`, { method: 'DELETE' }),

  // Orders (Customer)
  createOrder: (body: any) => request('/api/orders', { method: 'POST', body: JSON.stringify(body) }),
  getMyOrders: () => request('/api/orders/my'),
  trackOrder: (identifier: string, phone?: string) =>
    request(`/api/orders/track/${identifier}${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`),

  // Image Uploads (Admin)
  uploadImage: async (file: File): Promise<{ imageUrl: string; message: string }> => {
    const token = getToken();
    const formData = new FormData();
    formData.append('image', file);

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/upload-image', {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشل رفع الصورة');
    return data;
  },

  uploadMultipleImages: async (files: File[]): Promise<{ imageUrls: string[]; message: string }> => {
    const token = getToken();
    const formData = new FormData();
    files.forEach((f) => formData.append('images', f));

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/upload-multiple', {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشل رفع الصور');
    return data;
  },

  deleteImage: (imageUrl: string) =>
    request('/api/admin/delete-image', { method: 'DELETE', body: JSON.stringify({ imageUrl }) }),

  // Products CRUD (Admin)
  getAdminProducts: () => request('/api/admin/products'),
  createProduct: (body: any) => request('/api/admin/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id: string, body: any) =>
    request(`/api/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProduct: (id: string) => request(`/api/admin/products/${id}`, { method: 'DELETE' }),

  // Categories CRUD (Admin)
  getAdminCategories: () => request('/api/admin/categories'),
  createCategory: (body: any) => request('/api/admin/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id: string, body: any) =>
    request(`/api/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCategory: (id: string) => request(`/api/admin/categories/${id}`, { method: 'DELETE' }),

  // Delivery Locations CRUD (Admin)
  getAdminDeliveryLocations: () => request('/api/admin/delivery-locations'),
  createDeliveryLocation: (body: any) =>
    request('/api/admin/delivery-locations', { method: 'POST', body: JSON.stringify(body) }),
  updateDeliveryLocation: (id: string, body: any) =>
    request(`/api/admin/delivery-locations/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteDeliveryLocation: (id: string) =>
    request(`/api/admin/delivery-locations/${id}`, { method: 'DELETE' }),

  // Orders Management (Admin)
  getAdminOrders: () => request('/api/admin/orders'),
  updateOrderStatus: (orderId: string, status: string, cancellationReason?: string, note?: string) =>
    request(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, cancellationReason, note }),
    }),

  // Owner Management (Admins & Permissions)
  getAdministrators: () => request('/api/owner/admins'),
  createAdminUser: (body: any) => request('/api/owner/admins', { method: 'POST', body: JSON.stringify(body) }),
  updateAdminUser: (id: string, body: any) =>
    request(`/api/owner/admins/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAdminUser: (id: string) => request(`/api/owner/admins/${id}`, { method: 'DELETE' }),
  updateOwnerProfile: (body: any) => request('/api/owner/profile', { method: 'PUT', body: JSON.stringify(body) }),
  resetOwnerSlot: () => request('/api/owner/reset-slot', { method: 'POST' }),

  // Customer Management & Blocking System
  getAdminCustomers: () => request('/api/admin/customers'),
  getCustomerDetails: (id: string) => request(`/api/admin/customers/${id}`),
  updateCustomerActiveStatus: (id: string, isActive: boolean) =>
    request(`/api/admin/customers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
  deleteCustomerSafely: (id: string) => request(`/api/admin/customers/${id}`, { method: 'DELETE' }),
  blockCustomer: (id: string, body: { reason: string; type: 'TEMPORARY' | 'PERMANENT'; durationDays?: number }) =>
    request(`/api/admin/customers/${id}/block`, { method: 'POST', body: JSON.stringify(body) }),
  unblockCustomer: (id: string) => request(`/api/admin/customers/${id}/unblock`, { method: 'POST' }),
  addCustomerNote: (id: string, text: string) =>
    request(`/api/admin/customers/${id}/notes`, { method: 'POST', body: JSON.stringify({ text }) }),
  deleteCustomerNote: (id: string, noteId: string) =>
    request(`/api/admin/customers/${id}/notes/${noteId}`, { method: 'DELETE' }),

  // Customization Groups (Builder & Storefront)
  getCustomizationGroups: () => request('/api/customization-groups'),
  getAdminCustomizationGroups: () => request('/api/admin/customization-groups'),
  createCustomizationGroup: (body: any) =>
    request('/api/admin/customization-groups', { method: 'POST', body: JSON.stringify(body) }),
  updateCustomizationGroup: (id: string, body: any) =>
    request(`/api/admin/customization-groups/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCustomizationGroup: (id: string) =>
    request(`/api/admin/customization-groups/${id}`, { method: 'DELETE' }),

  // Audit Logs & Stats
  getAuditLogs: (limit = 100) => request(`/api/admin/audit-logs?limit=${limit}`),
  getAdminStats: () => request('/api/admin/stats'),
};
