import api from './api';

export const getUsers = async () => {
  const response = await api.get('/admin/users');
  return response.data;
};

export const getUser = async (id) => {
  const response = await api.get(`/admin/users/${id}`);
  return response.data;
};

export const verifyUser = async (id, data) => {
  const response = await api.patch(`/admin/users/${id}/verify`, data);
  return response.data;
};
