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

export default api;