import {create} from "zustand"
import { axiosInstance } from "../lib/axios"
import toast from "react-hot-toast";

let isCheckingAuthInProgress = false;

export const useAuthStore = create((set, get) =>({
    authUser:null,
        authToken: (typeof window !== "undefined" ? window.localStorage?.getItem("auth_token") : null) || null,
    onlineUsers: [],
    isCheckingAuth:true,
    isUpdatingProfile: false,
    checkAuth: async()=>{
        // Prevent duplicate calls
        if (isCheckingAuthInProgress) return;
        isCheckingAuthInProgress = true;
        
        try {
            const res = await axiosInstance.get("/auth/check");
                        const user = res.data;
                        const token = user?.token;
                        if (token) {
                            try { window.localStorage?.setItem("auth_token", token); } catch {}
                            set({ authToken: token });
                        }
                        set({authUser:user});
        } catch (error) {
                        set({authUser:null});
        }finally{
            set({isCheckingAuth:false});
            isCheckingAuthInProgress = false;
        }
    },

    isSigningUp :false,
    signup: async(data) =>{
        set({isSigningUp:true })
        try {
            const res = await axiosInstance.post("/auth/signup",data);
                        const token = res.data?.token;
                        if (token) {
                            try { window.localStorage?.setItem("auth_token", token); } catch {}
                            set({ authToken: token });
                        }
                        set({authUser:res.data})
            toast.success("Account created successfully")     
        } catch (error) {
            console.log("Error in signup auth",error)
            toast.error(error.response?.data?.message || "Network error. Please check if the server is running.")
        }finally {
            set({ isSigningUp: false });
          }


    },
    isLoggingIn:false,
    login: async(data)=>{
        set({isLoggingIn:true});
        try {
            const res = await axiosInstance.post("/auth/login",data)
            const token = res.data?.token;
            if (token) {
              try { window.localStorage?.setItem("auth_token", token); } catch {}
              set({ authToken: token });
            }
            set({authUser:res.data})
            toast.success("Logged in successfully");
        } catch (error) {
        toast.error(error.response?.data?.message || "Network error. Please check if the server is running.")
        }finally{
            set({isLoggingIn:false});
        }
       
    },
    logout: async() =>{
        try {
            const res = await axiosInstance.post("/auth/logout");
            set({authUser:null});
            try { window.localStorage?.removeItem("auth_token"); } catch {}
            set({ authToken: null });
            toast.success("Logout successfully");   
        } catch (error) {
            console.log("Error in logout auth",error)
            toast.error(error.response?.data?.message || "Network error. Please check if the server is running.")
        }
        
    },
        updateProfile: async (data) => {
                set({ isUpdatingProfile: true });

                const previousUser = get().authUser;

                // Optimistic UI update so avatar/name updates immediately across the app.
                if (previousUser && data && typeof data === "object") {
                    const optimisticUpdates = {};
                    if (typeof data.profilePic === "string") optimisticUpdates.profilePic = data.profilePic;
                    if (typeof data.fullName === "string") optimisticUpdates.fullName = data.fullName;
                    if (typeof data.email === "string") optimisticUpdates.email = data.email;

                    if (Object.keys(optimisticUpdates).length > 0) {
                        set({ authUser: { ...previousUser, ...optimisticUpdates } });
                    }
                }

                try {
                    const res = await axiosInstance.put("/auth/update-profile", data);
                    set({ authUser: res.data });
                    const isPasswordChange =
                      !!(data && typeof data === "object" && ("newPassword" in data || "currentPassword" in data));
                    toast.success(isPasswordChange ? "Password changed successfully" : "Profile updated successfully");
                    return { success: true };
                } catch (error) {
                    console.log("error in update profile:", error);
                    // Rollback optimistic update on failure
                    if (previousUser) {
                        set({ authUser: previousUser });
                    }
                    const message = error.response?.data?.message || "Network error. Please check if the server is running.";
                    toast.error(message);
                    return { success: false, error: message };
                } finally {
                    set({ isUpdatingProfile: false });
                }
            },
}))