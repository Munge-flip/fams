import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// Capacitor marks the Android/iOS WebView as native; the Vercel build runs in a browser and
// takes the existing cookie-only path. Everything native-specific below is gated on this flag.
export const isNativeApp = Capacitor.isNativePlatform();

const TOKEN_KEY = 'fams_token';

export const readAuthToken = async () => {
  if (!isNativeApp) {
    return null;
  }

  const { value } = await Preferences.get({ key: TOKEN_KEY });
  return value || null;
};

export const storeAuthToken = async (token) => {
  if (!isNativeApp || !token) {
    return;
  }

  await Preferences.set({ key: TOKEN_KEY, value: token });
};

export const clearAuthToken = async () => {
  if (!isNativeApp) {
    return;
  }

  await Preferences.remove({ key: TOKEN_KEY });
};

// .env.mobile supplies VITE_API_URL for `vite build --mode mobile`. The deployed URL is the
// fallback for that mode so a mobile build can never silently point the APK at localhost,
// while the normal web build keeps the historical localhost fallback for `npm run dev`.
const MOBILE_API_URL = 'https://fams-y7et.onrender.com/api';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    || (import.meta.env.MODE === 'mobile' ? MOBILE_API_URL : 'http://localhost:5001/api'),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// The native app has no reliable cross-site cookie, so it authenticates with the JWT it
// received at login/registration. The marker tells the API to include that token in the body.
// It is never sent by the web build, so web responses keep their existing shape.
if (isNativeApp) {
  api.defaults.headers.common['X-Client-Platform'] = 'capacitor';

  api.interceptors.request.use(async (config) => {
    const token = await readAuthToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        await clearAuthToken();
      }

      return Promise.reject(error);
    },
  );
}

export default api;
