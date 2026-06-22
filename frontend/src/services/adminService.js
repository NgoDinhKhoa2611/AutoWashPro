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
  },

  getServices: async () => {
    const response = await api.get('/Admin/GetServices');
    return response.data;
  },

  saveService: async (service) => {
    const response = await api.post('/Admin/SaveService', service);
    return response.data;
  },

  toggleService: async (id) => {
    const response = await api.post(`/Admin/ToggleService?id=${id}`);
    return response.data;
  },

  deleteService: async (id) => {
    const response = await api.post(`/Admin/DeleteService?id=${id}`);
    return response.data;
  },

  getCustomers: async (search) => {
    const response = await api.get('/Admin/GetCustomers', { params: { search } });
    return response.data;
  },

  getCustomerDetail: async (id) => {
    const response = await api.get(`/Admin/GetCustomerDetail?id=${id}`);
    return response.data;
  },

  adjustCustomerPoints: async (customerId, pointsChange, reason) => {
    const response = await api.post('/Admin/AdjustCustomerPoints', {
      CustomerId: customerId,
      PointsChange: pointsChange,
      Reason: reason
    });
    return response.data;
  },

  getAvailableVouchers: async () => {
    const response = await api.get('/Admin/GetAvailableVouchers');
    return response.data;
  },

  assignVoucher: async (customerId, rewardId) => {
    const response = await api.post('/Admin/AssignVoucher', {
      CustomerId: customerId,
      RewardId: rewardId
    });
    return response.data;
  },

  getPromotions: async () => {
    const response = await api.get('/api/admin/promotions');
    return response.data;
  },

  createPromotion: async (data) => {
    const response = await api.post('/api/admin/promotions', data);
    return response.data;
  },

  updatePromotion: async (id, data) => {
    const response = await api.put(`/api/admin/promotions/${id}`, data);
    return response.data;
  },

  togglePromotionStatus: async (id) => {
    const response = await api.patch(`/api/admin/promotions/${id}/toggle`);
    return response.data;
  },

  deletePromotion: async (id) => {
    const response = await api.delete(`/api/admin/promotions/${id}`);
    return response.data;
  },

  getBookings: async () => {
    const response = await api.get('/api/admin/bookings');
    return response.data;
  },

  getBookingDetail: async (id) => {
    const response = await api.get(`/api/admin/bookings/${id}`);
    return response.data;
  },

  confirmBooking: async (id) => {
    const response = await api.put(`/api/admin/bookings/${id}/confirm`);
    return response.data;
  },

 cancelBooking: async (id, reason) => {
  console.log("Cancel Booking", {
    id,
    reason
  });

  const response = await api.put(
    `/api/admin/bookings/${id}/cancel`,
    JSON.stringify({
      reason: reason
    }),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  return response.data;
},

  checkinBooking: async (id) => {
    const response = await api.put(`/api/admin/bookings/${id}/checkin`);
    return response.data;
  },

  rescheduleBooking: async (id, scheduledAt, reason) => {
    const response = await api.put(`/api/admin/bookings/${id}/reschedule`, {
      ScheduledAt: scheduledAt,
      Reason: reason
    });
    return response.data;
  },

  getAdminReviews: async () => {
    const response = await api.get('/api/reviews/admin');
    return response.data;
  }
};
