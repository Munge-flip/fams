import api from './api';

export const getPrograms = async () => {
  const response = await api.get('/programs');
  return response.data;
};
