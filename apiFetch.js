import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { API_BASE, HOSTINGER_API, LOCAL_API } from "./apiConfig";

async function fetchWithFallback(url, fetchOptions) {
  try {
    return await fetch(url, fetchOptions);
  } catch (error) {
    // If local proxy is unavailable, fall back to the hosted backend.
    if (url.startsWith(LOCAL_API)) {
      const remoteUrl = url.replace(LOCAL_API, HOSTINGER_API);
      console.warn(`Local API request failed, falling back to hosted API: ${error.message}`);
      return await fetch(remoteUrl, fetchOptions);
    }
    throw error;
  }
}

export default async function apiFetch(path, options = {}) {
  // Use configured API base URL
  let url;
  if (path.startsWith("http")) {
    url = path;
  } else {
    url = `${API_BASE}${path}`;
  }
  
  const token = await AsyncStorage.getItem("auth_token");
  const headers = {
    ...options.headers,
    "X-Requested-With": "XMLHttpRequest", // Helps bypass some server filters
    "Accept": "application/json",
  };

  // Only add Authorization header if token exists and this is not an OPTIONS request
  if (token && options.method !== 'OPTIONS') {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let finalBody = options.body;

  if (options.body instanceof FormData) {
    // DO NOT set Content-Type for FormData; browser needs to set the boundary
    delete headers["Content-Type"];
  } else if (options.body && typeof options.body === "object") {
    headers["Content-Type"] = "application/json";
    finalBody = JSON.stringify(options.body);
  }

  // Configure timeout / abort controller (AbortSignal.timeout isn't available in React Native)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  const fetchOptions = {
    ...options,
    method: options.method || "GET",
    headers,
    body: finalBody,
    signal: controller.signal,
  };

  // For web platform, try without CORS mode first, fallback to CORS
  let res;
  if (Platform.OS === 'web') {
    try {
      // First try without CORS mode
      res = await fetchWithFallback(url, fetchOptions);
      if (res.ok || res.status !== 0) {
        // If it works or fails for non-CORS reasons, use this response
      } else {
        throw new Error('CORS issue');
      }
    } catch (error) {
      // If it fails, try with CORS mode
      console.log('Web fetch failed, trying with CORS mode:', error.message);
      fetchOptions.mode = "cors";
      fetchOptions.credentials = "omit";
      res = await fetchWithFallback(url, fetchOptions);
    }
  } else {
    // For native, use CORS mode
    fetchOptions.mode = "cors";
    fetchOptions.credentials = "omit";
    res = await fetchWithFallback(url, fetchOptions);
  }

  async function processResponse(res) {
    // Handle CORS errors specifically
    if (!res.ok && res.status === 0) {
      throw new Error(
        "CORS Error: The server is not allowing requests from this origin. " +
        "Please contact the server administrator to add CORS headers."
      );
    }

    const text = await res.text();
    if (!text) return { success: true };

    // Check if response is HTML (error page)
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      console.error('Received HTML instead of JSON. URL:', url);
      console.error('Response preview:', text.substring(0, 200));
      throw new Error(
        `Server returned HTML instead of JSON. This usually means:\n` +
        `1. The API endpoint doesn't exist\n` +
        `2. The proxy isn't working correctly\n` +
        `3. The server is returning an error page\n\n` +
        `Requested URL: ${url}`
      );
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON Parse Error. URL:', url);
      console.error('Response:', text.substring(0, 500));
      throw new Error(`Invalid JSON response from ${url}: ${text.substring(0, 100)}`);
    }

    if (!res.ok) {
      const apiError = data.error || data.message || `API Error: ${res.status} ${res.statusText}`;
      const details = data.details ? ` Details: ${data.details}` : "";
      throw new Error(apiError + details);
    }
    return data;
  }

  // Process the response
  try {
    return await processResponse(res);
  } finally {
    clearTimeout(timeoutId);
  }
}
