import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

let hasShownAdminAuthToast = false;
let hasLoggedDoctorsError = false;
let inFlightDoctorsPromise = null;
let doctorsCooldownUntil = 0;

// Aggressive caching - show stale data instantly while revalidating
let statsCache = { data: null, timestamp: 0 };
let doctorsCache = { data: null, timestamp: 0 };
const STATS_CACHE_TTL = 300000; // 5 minutes
const DOCTORS_CACHE_TTL = 300000; // 5 minutes

// Request deduplication
let fetchStatsPromise = null;

// Preload admin data on app start
let hasPreloaded = false;
export const preloadAdminData = () => {
  if (hasPreloaded) return;
  hasPreloaded = true;
  const baseUrl = `http://${window.location.hostname}:5000/api`;
  // Preload stats
  fetch(`${baseUrl}/admin/stats`, { credentials: 'include' })
    .then(r => r.json())
    .then(data => { if (data) statsCache = { data, timestamp: Date.now() }; })
    .catch(() => {});
  // Preload doctors
  fetch(`${baseUrl}/admin/doctors?limit=100`, { credentials: 'include' })
    .then(r => r.json())
    .then(data => { if (data?.doctors) doctorsCache = { data: data.doctors, timestamp: Date.now() }; })
    .catch(() => {});
};

export const useAdminStore = create((set, get) => ({
  doctors: doctorsCache.data || [],
  stats: statsCache.data || null,
  isLoading: false,
  isUpdating: false,
  isFetchingDoctors: false,

  // Fetch admin statistics - stale-while-revalidate
  fetchStats: async (forceRefresh = false) => {
    const now = Date.now();
    const cacheAge = now - statsCache.timestamp;
    
    // INSTANT: Show cached data immediately
    if (statsCache.data) {
      set({ stats: statsCache.data });
      // If fresh, don't refetch
      if (cacheAge < STATS_CACHE_TTL && !forceRefresh) {
        return;
      }
    }
    
    // Deduplicate concurrent requests
    if (fetchStatsPromise && !forceRefresh) {
      return fetchStatsPromise;
    }
    
    fetchStatsPromise = (async () => {
      try {
        const response = await axiosInstance.get("/admin/stats");
        statsCache = { data: response.data, timestamp: Date.now() };
        set({ stats: response.data });
      } catch (error) {
        // Silent fail - don't trigger re-renders
      } finally {
        fetchStatsPromise = null;
      }
    })();
    
    return fetchStatsPromise;
  },

  // Fetch all doctors - stale-while-revalidate
  fetchDoctors: async (filters = {}, forceRefresh = false) => {
    const now = Date.now();
    const cacheAge = now - doctorsCache.timestamp;
    
    // INSTANT: Show cached data immediately
    if (doctorsCache.data) {
      set({ doctors: doctorsCache.data, isLoading: false });
      // If fresh, don't refetch
      if (cacheAge < DOCTORS_CACHE_TTL && !forceRefresh) {
        return { doctors: doctorsCache.data, total: doctorsCache.data.length };
      }
    }

    // Prevent repeated calls
    if (inFlightDoctorsPromise) return inFlightDoctorsPromise;
    if (get().isFetchingDoctors) return { doctors: get().doctors || [], total: 0 };
    
    if (doctorsCooldownUntil && now < doctorsCooldownUntil) {
      return { doctors: get().doctors || [], total: 0 };
    }

    // Only show loading if no cached data
    if (!doctorsCache.data) {
      set({ isLoading: true, isFetchingDoctors: true });
    } else {
      set({ isFetchingDoctors: true });
    }
    
    inFlightDoctorsPromise = (async () => {
      try {
        const effectiveFilters = { limit: 100, ...filters };
        // Cache-bust on force refresh to ensure we don't get a cached response.
        if (forceRefresh) {
          effectiveFilters._t = Date.now();
        }
        const params = new URLSearchParams(effectiveFilters).toString();
        const response = await axiosInstance.get(`/admin/doctors?${params}`);
        
        // Update cache
        doctorsCache = { data: response.data.doctors, timestamp: Date.now() };
        set({ doctors: response.data.doctors });
        return response.data;
      } catch (error) {
        doctorsCooldownUntil = Date.now() + 10000;
        return { doctors: [], total: 0 };
      } finally {
        inFlightDoctorsPromise = null;
        set({ isLoading: false, isFetchingDoctors: false });
      }
    })();
    
    return inFlightDoctorsPromise;
  },

  // Add new doctor
  addDoctor: async (doctorData) => {
    set({ isUpdating: true });
    try {
      const response = await axiosInstance.post("/admin/doctors", doctorData);
      
      // Update local state
      const { doctors } = get();
      set({ doctors: [response.data.doctor, ...doctors] });
      
      toast.success("Doctor added successfully");
      return { success: true, doctor: response.data.doctor };
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add doctor");
      return { success: false, error: error.response?.data?.message };
    } finally {
      set({ isUpdating: false });
    }
  },

  // Update doctor
  updateDoctor: async (doctorId, updateData) => {
    set({ isUpdating: true });
    try {
      const response = await axiosInstance.put(`/admin/doctors/${doctorId}`, updateData);
      
      // Update local state
      const { doctors } = get();
      const updatedDoctors = doctors.map(doctor => 
        doctor._id === doctorId ? response.data.doctor : doctor
      );
      set({ doctors: updatedDoctors });
      
      toast.success("Doctor updated successfully");
      return { success: true, doctor: response.data.doctor };
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update doctor");
      return { success: false, error: error.response?.data?.message };
    } finally {
      set({ isUpdating: false });
    }
  },

  // Toggle doctor status (active/inactive)
  toggleDoctorStatus: async (doctorId) => {
    set({ isUpdating: true });
    try {
      const response = await axiosInstance.patch(`/admin/doctors/${doctorId}/toggle-status`);
      
      // Update local state
      const { doctors } = get();
      const updatedDoctors = doctors.map(doctor => 
        doctor._id === doctorId ? response.data.doctor : doctor
      );
      set({ doctors: updatedDoctors });
      
      toast.success(response.data.message);
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to toggle doctor status");
      return { success: false };
    } finally {
      set({ isUpdating: false });
    }
  },

  // Delete doctor (soft delete - deactivate)
  deleteDoctor: async (doctorId) => {
    set({ isUpdating: true });
    try {
      await axiosInstance.delete(`/admin/doctors/${doctorId}`);
      
      // Update local state
      const { doctors } = get();
      const updatedDoctors = doctors.map(doctor => 
        doctor._id === doctorId ? { ...doctor, isActive: false } : doctor
      );
      set({ doctors: updatedDoctors });
      
      toast.success("Doctor deactivated successfully");
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete doctor");
      return { success: false };
    } finally {
      set({ isUpdating: false });
    }
  },

  // Get doctor by ID
  getDoctorById: async (doctorId) => {
    try {
      const response = await axiosInstance.get(`/admin/doctors/${doctorId}`);
      return { success: true, doctor: response.data };
    } catch (error) {
      toast.error("Failed to fetch doctor details");
      return { success: false, error: error.response?.data?.message };
    }
  },
}));
