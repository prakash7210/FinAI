import axios from 'axios';
const USE_WIFI = true; // toggle this based on your testing environment
const API = axios.create({
  baseURL: USE_WIFI
    ? 'http://192.168.55.101:8000/api'
    : 'http://10.198.208.231:8000/api',
  timeout: 16000,
});

export const setAuthToken = token => {
  if (token) {
    API.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete API.defaults.headers.common.Authorization;
  }
};

export default API;
