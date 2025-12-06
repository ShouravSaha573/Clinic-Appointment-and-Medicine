import {create} from "zustand"
import { axiosInstance } from "../lib/axios"
import toast from "react-hot-toast";

export const useAuthStore = create((set) =>({
    authUser:null,
    onlineUsers: [],
    isCheckingAuth:true,
    checkAuth: async()=>{
        try {
            const res = await axiosInstance.get("/auth/check");
            set({authUser:res.data});
        } catch (error) {
            console.log("Error in check auth ",error)
            set({authUser:null});
        }finally{
            set({isCheckingAuth:false});
        }
    },

    isSigningUp :false,
    signup: async(data) =>{
        set({isSigningUp:true })
        try {
            const res = await axiosInstance.post("/auth/signup",data);
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
            toast.success("Logout successfully");   
        } catch (error) {
            console.log("Error in logout auth",error)
            toast.error(error.response?.data?.message || "Network error. Please check if the server is running.")
        }
        
    },
    updateProfile: async (data) => {
        set({ isUpdatingProfile: true });
        try {
          const res = await axiosInstance.put("/auth/update-profile", data);
          set({ authUser: res.data });
          toast.success("Profile updated successfully");
        } catch (error) {
          console.log("error in update profile:", error);
          toast.error(error.response?.data?.message || "Network error. Please check if the server is running.");
        } finally {
          set({ isUpdatingProfile: false });
        }
      },

}))