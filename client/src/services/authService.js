import api, { clearAuthToken, storeAuthToken } from './api';

// On native only, the API returns the JWT in the body (because the WebView has no usable
// cross-site cookie); persist it for the request interceptor. On web these calls are no-ops.
export const registerUser = async (payload) => {
  const response = await api.post('/auth/register', payload);
  await storeAuthToken(response.data.token);
  return response.data;
};

export const loginUser = async (payload) => {
  const response = await api.post('/auth/login', payload);
  await storeAuthToken(response.data.token);
  return response.data;
};

export const logoutUser = async () => {
  try {
    const response = await api.post('/auth/logout');
    return response.data;
  } finally {
    await clearAuthToken();
  }
};

export const updateProfile = async (data) => {
  const response = await api.patch('/auth/profile', data);
  return response.data;
};

export const submitVerificationProfile = async (data) => {
  const response = await api.patch('/auth/verification-profile', data);
  return response.data;
};

export const changePassword = async (data) => {
  const response = await api.patch('/auth/password', data);
  return response.data;
};

export const setRecoveryEmail = async (data) => {
  const response = await api.put('/auth/recovery-email', data);
  return response.data;
};

export const removeRecoveryEmail = async (data) => {
  const response = await api.delete('/auth/recovery-email', { data });
  return response.data;
};

export const changeEmail = async (data) => {
  const response = await api.patch('/auth/email', data);
  return response.data;
};


export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};
