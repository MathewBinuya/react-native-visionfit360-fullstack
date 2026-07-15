import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL }  from './api'

const api = axios.create({ baseURL: API_URL });

// Automatically attach the token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


// auto logout when backend rejects token ( someone else logged in )
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      router.replace("/(auth)");
    }
    return Promise.reject(error);
  }
);

export default api;