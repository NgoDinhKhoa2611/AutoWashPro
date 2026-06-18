import api from './api';

export const customerService = {
  updateProfile: async (fullName, phone) => {
    const response = await api.post('/Customer/UpdateProfile', {
      FullName: fullName,
      Phone: phone
    });
    return response.data;
  },

  sendEmailOtp: async (email) => {
    const response = await api.post('/Customer/SendEmailOtp', {
      Email: email
    });
    return response.data;
  },

  verifyEmailAndChangePassword: async (email, otpCode, currentPassword, newPassword) => {
    const response = await api.post('/Customer/VerifyEmailAndChangePassword', {
      Email: email,
      OtpCode: otpCode,
      CurrentPassword: currentPassword,
      NewPassword: newPassword
    });
    return response.data;
  },

  getVehicles: async () => {
    const response = await api.get('/Customer/GetVehicles');
    return response.data;
  },

  sendVehicleOtp: async (licensePlate, brand, model, vehicleClass) => {
    const response = await api.post('/api/vehicle/send-otp', {
      LicensePlate: licensePlate,
      Brand: brand,
      Model: model,
      VehicleClass: vehicleClass
    });
    return response.data;
  },

  verifyVehicleOtpAndSave: async (licensePlate, brand, model, vehicleClass, otpCode) => {
    const response = await api.post('/api/vehicle/verify-otp', {
      LicensePlate: licensePlate,
      Brand: brand,
      Model: model,
      VehicleClass: vehicleClass,
      OtpCode: otpCode
    });
    return response.data;
  },

  editVehicle: async (vehicleId, brand, model, vehicleClass) => {
    const response = await api.put(`/api/vehicle/${vehicleId}`, {
      Brand: brand,
      Model: model,
      VehicleClass: vehicleClass
    });
    return response.data;
  },

  deleteVehicle: async (vehicleId) => {
    const response = await api.delete(`/api/vehicle/${vehicleId}`);
    return response.data;
  },

  getServices: async () => {
    const response = await api.get('/Customer/GetServices');
    return response.data;
  },

  createBooking: async (bookingData) => {
    const response = await api.post('/Customer/CreateBooking', bookingData);
    return response.data;
  },

  getWashHistory: async () => {
    const response = await api.get('/Customer/GetWashHistory');
    return response.data;
  },

  getActiveBooking: async () => {
    const response = await api.get('/Customer/GetActiveBooking');
    return response.data;
  },

  getVouchers: async () => {
    const response = await api.get('/Customer/GetVouchers');
    return response.data;
  },

  getNotifications: async () => {
    const response = await api.get('/Customer/GetNotifications');
    return response.data;
  },

  markNotificationAsRead: async (id) => {
    const response = await api.post('/Customer/MarkNotificationAsRead', {
      Id: id
    });
    return response.data;
  },

  getRewards: async () => {
    const response = await api.get('/Customer/GetRewards');
    return response.data;
  },

  redeemReward: async (rewardId) => {
    const response = await api.post('/Customer/RedeemReward', {
      RewardId: rewardId
    });
    return response.data;
  }
};
