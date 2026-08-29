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
