import api from './api';

export const adminService = {
  getDashboardStats: async () => {
    const response = await api.get('/Admin/DashboardStats');
    return response.data;
  },

  getLoyaltyConfig: async () => {
    const response = await api.get('/Admin/GetLoyaltyConfig');
    return response.data;
  },

  saveLoyaltyConfig: async (config) => {
    const response = await api.post('/Admin/SaveLoyaltyConfig', config);
    return response.data;
  },

  tierReview: async () => {
    const response = await api.get('/Admin/TierReview');
    return response.data;
  },

  runTierReview: async () => {
    const response = await api.post('/Admin/RunTierReview');
    return response.data;
  },

  getQueue: async () => {
    const response = await api.get('/Admin/GetQueue');
    return response.data;
  },

  advanceQueue: async (id) => {
    const response = await api.post(`/Admin/AdvanceQueue?id=${id}`);
    return response.data;
  },

  updateQueue: async (id, status, staffNote) => {
    const response = await api.post(`/Admin/UpdateQueue?id=${id}`, {
      Status: status,
      StaffNote: staffNote
    });
    return response.data;
  },

  checkoutQueue: async (id) => {
    const response = await api.post(`/Admin/CheckoutQueue?id=${id}`);
    return response.data;
  },

  cancelQueue: async (id) => {
    const response = await api.post(`/Admin/CancelQueue?id=${id}`);
    return response.data;
  },

  addWalkIn: async (licensePlate, customerName) => {
    const response = await api.post('/Admin/AddWalkIn', {
      LicensePlate: licensePlate,
      CustomerName: customerName
    });
    return response.data;
  }
};
