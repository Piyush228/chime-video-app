import axios from 'axios';

const API_BASE = 'http://localhost:8080/api/chime';

export const createMeeting = async (userId) => {
  const response = await axios.post(`${API_BASE}/create`, null, {
    params: { userId },
  });
  return response.data;
};
