import axios from "axios";

// your backend URL — same backend the mobile app uses
const api = axios.create({
  baseURL: "http://localhost:3000/api/admin",
});

// attach the admin token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// if token is invalid/expired, kick back to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("adminToken");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;