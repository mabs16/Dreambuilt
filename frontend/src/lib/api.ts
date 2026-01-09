import axios from 'axios';

export const api = axios.create({
  baseURL: `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '')}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle global errors here if needed
    return Promise.reject(error);
  }
);
