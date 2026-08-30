import api from './api';

export const createApplication = async (payload) => {
  const response = await api.post('/applications', payload);
  return response.data;
};

export const getApplications = async () => {
  const response = await api.get('/applications');
  return response.data;
};

export const getApplication = async (id) => {
  const response = await api.get(`/applications/${id}`);
  return response.data;
};

export const cancelApplication = async (id) => {
  const response = await api.delete(`/applications/${id}`);
  return response.data;
};

export const updateApplicationStatus = async (id, payload) => {
  const response = await api.put(`/applications/${id}/status`, payload);
  return response.data;
};

export const verifyApplication = async (id, data) => {
  const response = await api.patch(`/applications/${id}/verify`, data);
  return response.data;
};

export const scheduleRelease = async (id, data) => {
  const response = await api.patch(`/applications/${id}/schedule`, data);
  return response.data;
};
