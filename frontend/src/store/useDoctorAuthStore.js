import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";

export const useDoctorAuthStore = create((set, get) => ({
  doctorUser: null,
  doctorSession: null,
  isCheckingAuth: true,
  isUpdatingProfile: false,
  isSigningUp: false,
  isLoggingIn: false,
  isLoggingOut: false,

  checkAuth: async () => {
    try {
      const response = await axiosInstance.get("/doctor-auth/check");
      const data = response.data || null;
      set({
        doctorUser: data,
        doctorSession: data?.session || null,
      });
    } catch (error) {
      const status = error?.response?.status;
      if (status !== 401) {
        console.log("Doctor auth check error:", error);
      }
      set({ doctorUser: null, doctorSession: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const response = await axiosInstance.post("/doctor-auth/signup", data);
      set({ doctorUser: response.data, doctorSession: response.data?.session || null });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || "Failed to sign up" };
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const response = await axiosInstance.post("/doctor-auth/login", data);
      console.log("Doctor login response:", response.data);
      set({ doctorUser: response.data, doctorSession: response.data?.session || null });
      return { success: true };
    } catch (error) {
      console.log("Doctor login error:", error);
      return { success: false, error: error.response?.data?.message || "Failed to login" };
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    set({ isLoggingOut: true });
    try {
      await axiosInstance.post("/doctor-auth/logout");
      set({ doctorUser: null, doctorSession: null });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      set({ isLoggingOut: false });
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });

    const previousDoctorUser = get().doctorUser;

    // Optimistic update (mainly for avatar)
    if (previousDoctorUser && data && typeof data === "object") {
      const nextEmail = typeof data.email === "string" ? data.email : null;
      const nextName =
        typeof data.fullName === "string" ? data.fullName :
        typeof data.name === "string" ? data.name :
        null;

      const nextConsultationFee =
        data.consultationFee !== undefined && data.consultationFee !== null
          ? Number(data.consultationFee)
          : null;

      const nextDoctor = {
        ...(previousDoctorUser.doctor || {}),
        ...(typeof data.profileImage === "string" ? { profileImage: data.profileImage } : null),
        ...(typeof data.profilePic === "string" ? { profileImage: data.profilePic } : null),
        ...(typeof nextName === "string" ? { name: nextName } : null),
        ...(Number.isFinite(nextConsultationFee) ? { consultationFee: nextConsultationFee } : null),
      };

      set({
        doctorUser: {
          ...previousDoctorUser,
          ...(typeof nextEmail === "string" ? { email: nextEmail } : null),
          doctor: nextDoctor,
        },
      });
    }

    try {
      const response = await axiosInstance.put("/doctor-auth/update-profile", data);
      set({ doctorUser: response.data, doctorSession: response.data?.session || get().doctorSession || null });
      return { success: true };
    } catch (error) {
      if (previousDoctorUser) {
        set({ doctorUser: previousDoctorUser });
      }
      return { success: false, error: error.response?.data?.message || "Failed to update profile" };
    } finally {
      set({ isUpdatingProfile: false });
    }
  },
}));
