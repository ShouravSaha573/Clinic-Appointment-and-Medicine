import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

export const useOrderStore = create((set, get) => ({
  orders: [],
  currentOrder: null,
  isLoading: false,
  isCreating: false,
  pagination: {
    current: 1,
    pages: 1,
    total: 0,
    hasNext: false,
    hasPrev: false,
  },

  // Create new order
  createOrder: async (orderData) => {
    set({ isCreating: true });
    try {
      const response = await axiosInstance.post("/orders", orderData);
      set({ currentOrder: response.data.order });
      toast.success("Order placed successfully!");
      return { success: true, order: response.data.order };
    } catch (error) {
      const message = error.response?.data?.message || "Failed to place order";
      toast.error(message);
      return { success: false, error: message };
    } finally {
      set({ isCreating: false });
    }
  },

  // Fetch user orders
  fetchOrders: async (page = 1, status = "all") => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });

      if (status !== "all") {
        params.append("status", status);
      }

      const response = await axiosInstance.get(`/orders/my-orders?${params}`);
      set({
        orders: response.data.orders,
        pagination: response.data.pagination,
      });
    } catch (error) {
      toast.error("Failed to fetch orders");
      console.error("Fetch orders error:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch single order
  fetchOrderById: async (orderId) => {
    set({ isLoading: true });
    try {
      const response = await axiosInstance.get(`/orders/${orderId}`);
      set({ currentOrder: response.data });
    } catch (error) {
      toast.error("Failed to fetch order details");
      console.error("Fetch order error:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Cancel order
  cancelOrder: async (orderId, reason) => {
    try {
      const response = await axiosInstance.patch(`/orders/${orderId}/cancel`, {
        reason,
      });
      
      // Update the order in the list
      const { orders } = get();
      const updatedOrders = orders.map(order =>
        order._id === orderId ? response.data.order : order
      );
      set({ orders: updatedOrders });
      
      // Update current order if it's the same
      const { currentOrder } = get();
      if (currentOrder && currentOrder._id === orderId) {
        set({ currentOrder: response.data.order });
      }
      
      toast.success("Order cancelled successfully");
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Failed to cancel order";
      toast.error(message);
      return { success: false, error: message };
    }
  },

  // Clear current order
  clearCurrentOrder: () => set({ currentOrder: null }),

  // Get order status badge info
  getStatusBadge: (status) => {
    const statusConfig = {
      pending: { color: "warning", text: "Pending" },
      confirmed: { color: "info", text: "Confirmed" },
      preparing: { color: "info", text: "Preparing" },
      out_for_delivery: { color: "info", text: "Out for delivery" },
      delivered: { color: "success", text: "Delivered" },
    };
    return statusConfig[status] || { color: "default", text: status };
  },

  // Get payment status badge info
  getPaymentStatusBadge: (status) => {
    const statusConfig = {
      pending: { color: "warning", text: "Pending" },
      paid: { color: "success", text: "Paid" },
      failed: { color: "error", text: "Failed" },
      refunded: { color: "info", text: "Refunded" },
    };
    return statusConfig[status] || { color: "default", text: status };
  },
}));
