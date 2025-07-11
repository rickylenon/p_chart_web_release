import axios from "axios";
import { UserSession } from "./clientAuth";

// Create axios instance
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "",
  timeout: 10000,
});

// Request interceptor to add auth headers
axiosInstance.interceptors.request.use(
  (config) => {
    // Get auth headers from UserSession
    const authHeaders = UserSession.getAuthHeaders();

    // Ensure headers object exists
    if (!config.headers) {
      config.headers = {};
    }

    // Add auth headers to the request
    Object.keys(authHeaders).forEach((key) => {
      config.headers![key] = authHeaders[key];
    });

    console.log("Adding auth headers to request:", authHeaders);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error(
      " API request failed:",
      error.config?.url,
      error.response?.status
    );

    if (error.response?.status === 401) {
      console.log(
        "Authentication error, clearing stale session data and redirecting to login..."
      );

      // Clear stale localStorage session data
      UserSession.clearSession();

      // Only redirect if we're not already on the login page
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/auth/login")
      ) {
        // Redirect to login page
        window.location.href = "/auth/login";
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
