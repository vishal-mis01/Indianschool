import { Platform } from "react-native";

// Hostinger backend URL
const HOSTINGER_API = "https://indiangroupofschools.com/tasks-app/api";

// Local development API
const LOCAL_API = "http://localhost:3001/api";

// Use production API for all platforms (server has CORS headers)
let API_BASE = HOSTINGER_API;

console.log(`[API Config] Platform: ${Platform.OS}, Using API: ${API_BASE}`);

export { API_BASE };
export default API_BASE;
