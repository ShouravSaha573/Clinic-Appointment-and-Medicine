import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

export const useCartStore = create((set, get) => ({
  cart: {
    items: [],
    totalItems: 0,
    totalAmount: 0,
  },
  isLoading: false,
  isUpdating: false,

  // Fetch cart
  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const response = await axiosInstance.get("/cart");
      set({ cart: response.data });
    } catch (error) {
      console.error("Fetch cart error:", error);
      set({ cart: { items: [], totalItems: 0, totalAmount: 0 } });
    } finally {
      set({ isLoading: false });
    }
  },

  // Add item to cart
  addToCart: async (medicineId, quantity = 1) => {
    set({ isUpdating: true });
    try {
      const response = await axiosInstance.post("/cart/add", {
        medicineId,
        quantity,
      });
      set({ cart: response.data.cart });
      toast.success("Item added to cart");
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Failed to add item to cart";
      toast.error(message);
      return { success: false, error: message };
    } finally {
      set({ isUpdating: false });
    }
  },

  // Update cart item quantity
  updateCartItem: async (medicineId, quantity) => {
    set({ isUpdating: true });
    try {
      const response = await axiosInstance.put("/cart/update", {
        medicineId,
        quantity,
      });
      set({ cart: response.data.cart });
      toast.success("Cart updated");
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Failed to update cart";
      toast.error(message);
      return { success: false, error: message };
    } finally {
      set({ isUpdating: false });
    }
  },

  // Remove item from cart
  removeFromCart: async (medicineId) => {
    set({ isUpdating: true });
    try {
      const response = await axiosInstance.delete(`/cart/remove/${medicineId}`);
      set({ cart: response.data.cart });
      toast.success("Item removed from cart");
      return { success: true };
    } catch (error) {
      toast.error("Failed to remove item");
      return { success: false };
    } finally {
      set({ isUpdating: false });
    }
  },

  // Clear cart
  clearCart: async () => {
    set({ isUpdating: true });
    try {
      const response = await axiosInstance.delete("/cart/clear");
      set({ cart: response.data.cart });
      toast.success("Cart cleared");
      return { success: true };
    } catch (error) {
      toast.error("Failed to clear cart");
      return { success: false };
    } finally {
      set({ isUpdating: false });
    }
  },

  // Get cart count
  getCartCount: async () => {
    try {
      const response = await axiosInstance.get("/cart/count");
      return response.data.count;
    } catch (error) {
      console.error("Get cart count error:", error);
      return 0;
    }
  },

  // Local cart operations (optimistic updates)
  increaseQuantity: (medicineId) => {
    const { cart } = get();
    const updatedItems = cart.items.map(item => {
      if (item.medicine._id === medicineId) {
        const newQuantity = item.quantity + 1;
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    
    const newCart = {
      ...cart,
      items: updatedItems,
      totalItems: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    };
    
    set({ cart: newCart });
  },

  decreaseQuantity: (medicineId) => {
    const { cart } = get();
    const updatedItems = cart.items.map(item => {
      if (item.medicine._id === medicineId && item.quantity > 1) {
        const newQuantity = item.quantity - 1;
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    
    const newCart = {
      ...cart,
      items: updatedItems,
      totalItems: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    };
    
    set({ cart: newCart });
  },
}));
