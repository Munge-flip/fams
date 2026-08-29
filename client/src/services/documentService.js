import api from './api';

export const uploadDocument = async ({ applicationId, docType, file, onUploadProgress }) => {
  const formData = new FormData();
  formData.append('application', applicationId);
  formData.append('docType', docType);
  formData.append('file', file);

  const response = await api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
  return response.data;
};
