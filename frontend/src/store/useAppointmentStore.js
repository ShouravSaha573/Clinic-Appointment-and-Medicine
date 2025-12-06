import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

export const useAppointmentStore = create((set, get) => ({
  // State
  appointments: [],
  doctors: [],
  specializations: [],
  selectedDoctor: null,
  isLoading: false,
  isBooking: false,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    total: 0,
    hasNext: false,
    hasPrev: false,
  },

  // Actions
  getDoctors: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      if (filters.specialization) params.append("specialization", filters.specialization);
      if (filters.page) params.append("page", filters.page);
      if (filters.limit) params.append("limit", filters.limit);

      const res = await axiosInstance.get(`/doctors?${params}`);
      set({ 
        doctors: res.data.doctors, 
        pagination: res.data.pagination,
        isLoading: false 
      });
    } catch (error) {
      console.log("Error in getDoctors:", error);
      toast.error(error.response?.data?.message || "Failed to fetch doctors");
      set({ isLoading: false });
    }
  },

  getDoctor: async (id) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get(`/doctors/${id}`);
      set({ selectedDoctor: res.data, isLoading: false });
      return res.data;
    } catch (error) {
      console.log("Error in getDoctor:", error);
      toast.error(error.response?.data?.message || "Failed to fetch doctor");
      set({ isLoading: false });
    }
  },

  getDoctorById: async (id) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get(`/doctors/${id}`);
      set({ selectedDoctor: res.data, isLoading: false });
      return res.data;
    } catch (error) {
      console.log("Error in getDoctorById:", error);
      toast.error(error.response?.data?.message || "Failed to fetch doctor details");
      set({ isLoading: false });
      return null;
    }
  },

  getSpecializations: async () => {
    try {
      const res = await axiosInstance.get("/doctors/specializations");
      set({ specializations: res.data });
    } catch (error) {
      console.log("Error in getSpecializations:", error);
      toast.error("Failed to fetch specializations");
    }
  },

  getDoctorAvailableSlots: async (doctorId, date) => {
    try {
      const res = await axiosInstance.get(`/doctors/${doctorId}/available-slots?date=${date}`);
      return res.data.availableSlots;
    } catch (error) {
      console.log("Error in getDoctorAvailableSlots:", error);
      toast.error("Failed to fetch available slots");
      return [];
    }
  },

  getBookedSlots: async (doctorId, date) => {
    try {
      const res = await axiosInstance.get(`/appointments/booked-slots?doctorId=${doctorId}&date=${date}`);
      return res.data.bookedSlots;
    } catch (error) {
      console.log("Error in getBookedSlots:", error);
      return [];
    }
  },

  bookAppointment: async (appointmentData) => {
    set({ isBooking: true });
    try {
      const res = await axiosInstance.post("/appointments", appointmentData);
      toast.success("Appointment booked successfully!");
      set({ isBooking: false });
      
      // Refresh appointments list
      get().getUserAppointments();
      
      return res.data;
    } catch (error) {
      console.log("Error in bookAppointment:", error);
      toast.error(error.response?.data?.message || "Failed to book appointment");
      set({ isBooking: false });
      throw error;
    }
  },

  getUserAppointments: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.page) params.append("page", filters.page);
      if (filters.limit) params.append("limit", filters.limit);

      const res = await axiosInstance.get(`/appointments?${params}`);
      set({ 
        appointments: res.data.appointments, 
        pagination: res.data.pagination,
        isLoading: false 
      });
    } catch (error) {
      console.log("Error in getUserAppointments:", error);
      toast.error("Failed to fetch appointments");
      set({ isLoading: false });
    }
  },

  getAppointmentById: async (id) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get(`/appointments/${id}`);
      set({ isLoading: false });
      return res.data;
    } catch (error) {
      console.log("Error in getAppointmentById:", error);
      toast.error("Failed to fetch appointment details");
      set({ isLoading: false });
      return null;
    }
  },

  cancelAppointment: async (id) => {
    try {
      await axiosInstance.patch(`/appointments/${id}/cancel`);
      toast.success("Appointment cancelled successfully");
      
      // Refresh appointments list
      get().getUserAppointments();
    } catch (error) {
      console.log("Error in cancelAppointment:", error);
      toast.error(error.response?.data?.message || "Failed to cancel appointment");
    }
  },

  rescheduleAppointment: async (id, newData) => {
    try {
      await axiosInstance.patch(`/appointments/${id}/reschedule`, newData);
      toast.success("Appointment rescheduled successfully");
      
      // Refresh appointments list
      get().getUserAppointments();
    } catch (error) {
      console.log("Error in rescheduleAppointment:", error);
      toast.error(error.response?.data?.message || "Failed to reschedule appointment");
      throw error;
    }
  },

  // Utility actions
  clearSelectedDoctor: () => set({ selectedDoctor: null }),
  clearAppointments: () => set({ appointments: [] }),
}));
