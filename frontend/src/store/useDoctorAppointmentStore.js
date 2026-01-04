import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

export const useDoctorAppointmentStore = create((set, get) => ({
  appointments: [],
  pagination: null,
  stats: null,
  isLoading: false,
  isUpdating: false,

  fetchAppointments: async (status = "all") => {
    set({ isLoading: true });
    try {
      const response = await axiosInstance.get(`/doctor-appointments?status=${status}`);
      console.log("Fetch appointments response:", response.data);
      // Extract appointments array from the response object
      const appointmentsData = response.data.appointments || [];
      // Ensure we always set an array
      const safeAppointments = Array.isArray(appointmentsData) ? appointmentsData : [];
      set({ appointments: safeAppointments, pagination: response.data.pagination });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        (error?.response?.status ? `Request failed (${error.response.status})` : null) ||
        "Failed to fetch appointments";
      toast.error(message);
      console.error("Fetch appointments error:", error?.response?.data || error);
      // Set empty array on error
      set({ appointments: [], pagination: null });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchStats: async () => {
    try {
      const response = await axiosInstance.get("/doctor-appointments/stats");
      set({ stats: response.data });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        (error?.response?.status ? `Request failed (${error.response.status})` : null) ||
        "Failed to fetch stats";
      toast.error(message);
      console.error("Fetch stats error:", error?.response?.data || error);
      set({ stats: {} });
    }
  },

  respondToAppointment: async (appointmentId, status) => {
    set({ isUpdating: true });
    try {
      const result = await axiosInstance.patch(`/doctor-appointments/${appointmentId}/respond`, {
        status
      });
      
      // Update the appointment in the local state
      const { appointments } = get();
      const updatedAppointments = appointments.map(apt => 
        apt._id === appointmentId ? result.data.appointment : apt
      );
      set({ appointments: updatedAppointments });
      
      toast.success(`Appointment ${status}`);
      return { success: true };
    } catch (error) {
      toast.error("Failed to update appointment");
      return { success: false, error: error.response?.data?.message };
    } finally {
      set({ isUpdating: false });
    }
  },

  updateNotes: async (appointmentId, notes) => {
    set({ isUpdating: true });
    try {
      const result = await axiosInstance.patch(`/doctor-appointments/${appointmentId}/notes`, {
        notes
      });
      
      // Update the appointment in the local state
      const { appointments } = get();
      const updatedAppointments = appointments.map(apt => 
        apt._id === appointmentId ? result.data.appointment : apt
      );
      set({ appointments: updatedAppointments });
      
      toast.success("Notes updated successfully");
      return { success: true };
    } catch (error) {
      toast.error("Failed to update notes");
      return { success: false, error: error.response?.data?.message };
    } finally {
      set({ isUpdating: false });
    }
  },

  completeAppointment: async (appointmentId) => {
    set({ isUpdating: true });
    try {
      const result = await axiosInstance.patch(`/doctor-appointments/${appointmentId}/complete`, {});
      
      // Update the appointment in the local state
      const { appointments } = get();
      const updatedAppointments = appointments.map(apt => 
        apt._id === appointmentId ? result.data.appointment : apt
      );
      set({ appointments: updatedAppointments });
      
      toast.success("Appointment completed");
      return { success: true };
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        (error?.response?.status ? `Request failed (${error.response.status})` : null) ||
        "Failed to complete appointment";
      toast.error(message);
      return { success: false, error: message };
    } finally {
      set({ isUpdating: false });
    }
  },
}));
