import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

export const useAdminStore = create((set, get) => ({
  doctors: [],
  stats: null,
  isLoading: false,
  isUpdating: false,

  // Fetch admin statistics
  fetchStats: async () => {
    try {
      const response = await axiosInstance.get("/admin/stats");
      set({ stats: response.data });
    } catch (error) {
      console.error("Fetch stats error:", error);
      toast.error("Failed to fetch statistics");
    }
  },

  // Fetch all doctors with admin view
  fetchDoctors: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await axiosInstance.get(`/admin/doctors?${params}`);
      set({ doctors: response.data.doctors });
      return response.data;
    } catch (error) {
      toast.error("Failed to fetch doctors");
      console.error("Fetch doctors error:", error);
      return { doctors: [], total: 0 };
    } finally {
      set({ isLoading: false });
    }
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
