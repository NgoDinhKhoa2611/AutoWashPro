import api from './api';

export const authService = {
  login: async (identifier, password) => {
    const response = await api.post('/Account/Login', {
      Identifier: identifier,
      Password: password
    });
    return response.data;
  },

  logout: async () => {
    const response = await api.get('/Account/Logout');
    return response.data;
  },

  googleLogin: async (email, fullName, googleId) => {
    const response = await api.post('/Account/GoogleLogin', {
      Email: email,
      FullName: fullName,
      GoogleId: googleId
    });
    return response.data;
  },

  completeGoogleSignup: async (email, fullName, googleId, phone, password) => {
    const response = await api.post('/Account/CompleteGoogleSignup', {
      Email: email,
      FullName: fullName,
      GoogleId: googleId,
      Phone: phone,
      Password: password
    });
    return response.data;
  },

  sendRegisterOtp: async (email) => {
    const response = await api.post('/Account/SendRegisterOtp', {
      Email: email
    });
    return response.data;
  },

  register: async (email, fullName, phone, password, otpCode) => {
    const response = await api.post('/Account/Register', {
      Email: email,
      FullName: fullName,
      Phone: phone,
      Password: password,
      OtpCode: otpCode
    });
    return response.data;
  }
};
