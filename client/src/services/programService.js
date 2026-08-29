import api from './api';

export const getPrograms = async () => {
  const response = await api.get('/programs');
  return response.data;
};

export const getProgramById = async (id) => {
  const response = await api.get(`/programs/${id}`);
  return response.data;
};

export const createProgram = async (program) => {
  const response = await api.post('/programs', program);
  return response.data;
};

export const updateProgram = async (id, program) => {
  const response = await api.put(`/programs/${id}`, program);
  return response.data;
};

export const deleteProgram = async (id) => {
  const response = await api.delete(`/programs/${id}`);
  return response.data;
};
