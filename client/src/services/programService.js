import api from './api';

export const getPrograms = async () => {
  const response = await api.get('/programs');
  return response.data;
};

export const getProgramById = async (id) => {
  const response = await getPrograms();
  return response.data.find((program) => program._id === id) || null;
};
