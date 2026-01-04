import axios from "axios"

const apiHost = typeof window !== "undefined" && window.location?.hostname
    ? window.location.hostname
    : "localhost";

export const axiosInstance = axios.create({
        baseURL:`http://${apiHost}:5000/api`,
    withCredentials:true,
    // Prevent infinite pending requests (e.g. large uploads / stalled network)
    timeout: 30000,
})

// Request deduplication - store promises for pending GET requests
const pendingRequests = new Map();

const getRequestKey = (config) => {
  const { method, url, params } = config;
  // Only deduplicate based on method, url and params for GET requests
  return `${method}:${url}:${JSON.stringify(params || {})}`;
};

// Request interceptor for auth
axiosInstance.interceptors.request.use((config) => {
    // Attach auth token
    try {
        if (typeof window !== "undefined") {
            const token = window.localStorage?.getItem("auth_token");
            if (token) {
                const headers = config.headers;
                if (headers && typeof headers.set === "function") {
                    if (!headers.get?.("Authorization")) {
                        headers.set("Authorization", `Bearer ${token}`);
                    }
                } else {
                    config.headers = config.headers || {};
                    if (!config.headers.Authorization) {
                        config.headers.Authorization = `Bearer ${token}`;
                    }
                }
            }
        }
    } catch {
        // ignore storage errors
    }

    return config;
});

// Response interceptor to clean up pending requests
axiosInstance.interceptors.response.use(
    (response) => {
        if (response.config._requestKey) {
            pendingRequests.delete(response.config._requestKey);
        }
        return response;
    },
    (error) => {
        if (error.config?._requestKey) {
            pendingRequests.delete(error.config._requestKey);
        }
        return Promise.reject(error);
    }
);

// Wrapper function for deduplicating GET requests
export const deduplicatedGet = async (url, config = {}) => {
    const requestKey = `get:${url}:${JSON.stringify(config.params || {})}`;
    
    // If there's already a pending request with the same key, return its promise
    if (pendingRequests.has(requestKey)) {
        return pendingRequests.get(requestKey);
    }
    
    // Create the request and store the promise
    const promise = axiosInstance.get(url, { ...config, _requestKey: requestKey })
        .finally(() => {
            pendingRequests.delete(requestKey);
        });
    
    pendingRequests.set(requestKey, promise);
    return promise;
};