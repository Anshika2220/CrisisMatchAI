import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://crisismatchai.onrender.com';

export const addVolunteer = async (volunteerData) => {
  const response = await axios.post(`${API_BASE_URL}/volunteers`, volunteerData);
  return response.data;
};

export const addTask = async (taskData) => {
  const response = await axios.post(`${API_BASE_URL}/tasks`, taskData);
  return response.data;
};

export const getTasks = async () => {
  const response = await axios.get(`${API_BASE_URL}/tasks`);
  return response.data;
};

export const getVolunteers = async () => {
  const response = await axios.get(`${API_BASE_URL}/volunteers`);
  return response.data;
};

export const assignTask = async (taskId) => {
  const response = await axios.post(`${API_BASE_URL}/tasks/${taskId}/assign`);
  return response.data;
};

export const cancelAssignment = async (taskId) => {
  const response = await axios.post(`${API_BASE_URL}/tasks/${taskId}/cancel`);
  return response.data;
};

export const completeTask = async (taskId) => {
  const response = await axios.post(`${API_BASE_URL}/tasks/${taskId}/complete`);
  return response.data;
};

export const getDemandAnalytics = async () => {
  const response = await axios.get(`${API_BASE_URL}/analytics/demand`);
  return response.data;
};

export const sendChatMessage = async (message, history = []) => {
  const response = await axios.post(`${API_BASE_URL}/chat`, { message, history });
  return response.data;
};
