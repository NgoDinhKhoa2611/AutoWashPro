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

  verifyEmailAndChangePassword: async (email, otpCode, newPassword) => {
    const response = await api.post('/Customer/VerifyEmailAndChangePassword', {
      Email: email,
      OtpCode: otpCode,
      NewPassword: newPassword
    });
    return response.data;
  },

  changePasswordWithPhoneOtp: async (phone, currentPassword, newPassword) => {
    const response = await api.post('/Customer/ChangePasswordWithPhoneOtp', {
      Phone: phone,
      CurrentPassword: currentPassword,
      NewPassword: newPassword
    });
    return response.data;
  },

  getVehicles: async () => {
    const response = await api.get('/Customer/GetVehicles');
    return response.data;
  },

  sendVehicleOtp: async (licensePlate) => {
    const response = await api.post('/Customer/SendVehicleOtp', {
      LicensePlate: licensePlate
    });
    return response.data;
  },

  verifyVehicleOtpAndSave: async (licensePlate, type, otpCode) => {
    const response = await api.post('/Customer/VerifyVehicleOtpAndSave', {
      LicensePlate: licensePlate,
      Type: type,
      OtpCode: otpCode
    });
    return response.data;
  },

  deleteVehicle: async (licensePlate) => {
    const response = await api.post('/Customer/DeleteVehicle', {
      LicensePlate: licensePlate
    });
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
  }
};
