import { Platform } from "react-native";

// Hostinger backend URL
const HOSTINGER_API = "https://indiangroupofschools.com/tasks-app/api";
// Local backend URL for development proxy
const LOCAL_API = "http://localhost:3001/api";

let API_BASE = HOSTINGER_API;

// Use explicit env override if provided
if (typeof process !== 'undefined') {
  if (process.env.API_BASE) {
    API_BASE = process.env.API_BASE;
  } else if (process.env.REACT_APP_API_BASE) {
    API_BASE = process.env.REACT_APP_API_BASE;
  }
}

// Only use the local proxy when explicitly enabled via env flag.
const isLocalOverrideEnabled =
  typeof process !== 'undefined' &&
  (process.env.REACT_APP_USE_LOCAL_API === 'true' ||
    process.env.USE_LOCAL_API === 'true' ||
    process.env.USE_LOCAL_API === '1');

if (
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  isLocalOverrideEnabled
) {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    API_BASE = LOCAL_API;
  }
}

console.log(`[API Config] Platform: ${Platform.OS}, Using API: ${API_BASE}`);

export { API_BASE, HOSTINGER_API, LOCAL_API };
export default API_BASE;
