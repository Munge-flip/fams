import api from './api';

export const registerUser = async (payload) => {
  const response = await api.post('/auth/register', payload);
  return response.data;
};

export const loginUser = async (payload) => {
  const response = await api.post('/auth/login', payload);
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
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

export const requestEmailChange = async (data) => {
  const response = await api.post('/auth/email-change/request', data);
  return response.data;
};

export const requestEmailVerification = async () => {
  const response = await api.post('/auth/email-verification/request');
  return response.data;
};

export const getEmailVerificationStatus = async () => {
  const response = await api.get('/auth/email-verification');
  return response.data;
};

// Confirms any pending code: account activation, a new primary address, or a new recovery address.
export const confirmVerificationCode = async (data) => {
  const response = await api.post('/auth/verification/confirm', data);
  return response.data;
};


export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};
