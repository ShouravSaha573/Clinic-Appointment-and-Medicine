import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

// Aggressive in-memory cache for medicines - persists across navigations
let medicinesCache = { data: null, params: null, timestamp: 0 };
let categoriesCache = { data: null, timestamp: 0 };
const CACHE_TTL = 300000; // 5 minutes cache
const STALE_TTL = 86400000; // 24 hours - show stale data while revalidating

// Request deduplication
let fetchMedicinesPromise = null;
let fetchCategoriesPromise = null;

// Preload on app start
let hasPreloaded = false;

const getCacheKey = (params) => JSON.stringify(params);

// Preload function - call this early in app lifecycle
export const preloadMedicines = () => {
  if (hasPreloaded) return;
  hasPreloaded = true;
  // Trigger a background fetch
  fetch(`http://${window.location.hostname}:5000/api/medicines?page=1&limit=24`, {
    credentials: 'include'
  }).then(r => r.json()).then(data => {
    if (data?.medicines) {
      const visible = data.medicines.filter(m => m?.isActive !== false);
      medicinesCache = {
        data: { medicines: visible, pagination: data.pagination },
        params: getCacheKey({ page: 1 }),
        timestamp: Date.now(),
      };
    }
  }).catch(() => {});
};

export const useMedicineStore = create((set, get) => ({
  medicines: medicinesCache.data?.medicines || [],
  categories: categoriesCache.data || [],
  featuredMedicines: [],
  currentMedicine: null,
  isLoading: false,
  searchResults: [],
  filters: {
    category: "all",
    minPrice: "",
    maxPrice: "",
    prescriptionRequired: "",
    sortBy: "name",
    sortOrder: "asc",
  },
  pagination: medicinesCache.data?.pagination || {
    current: 1,
    pages: 1,
    total: 0,
    hasNext: false,
    hasPrev: false,
  },

  selectedCategory: "all",
  setSelectedCategory: (cat) => set({ selectedCategory: cat }),

  // Fetch medicines - stale-while-revalidate pattern
  fetchMedicines: async (page = 1, filters = {}, forceRefresh = false) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "24");

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      if (typeof value === "number" && Number.isNaN(value)) return;
      if (key === "category" && value === "all") return;
      params.set(key, String(value));
    });

    const cacheKey = getCacheKey({ page, ...filters });
    const now = Date.now();
    const cacheAge = now - medicinesCache.timestamp;
    const hasValidCache = medicinesCache.data && medicinesCache.params === cacheKey;
    
    // INSTANT: Show cached data immediately (even if stale)
    if (hasValidCache) {
      set({
        medicines: medicinesCache.data.medicines,
        pagination: medicinesCache.data.pagination,
        isLoading: false,
      });
      
      // If cache is still fresh, don't refetch
      if (cacheAge < CACHE_TTL && !forceRefresh) {
        return;
      }
    }

    // Deduplicate concurrent requests
    if (fetchMedicinesPromise && !forceRefresh) {
      return fetchMedicinesPromise;
    }

    // Only show loading if no cached data
    if (!hasValidCache) {
      set({ isLoading: true });
    }
    
    fetchMedicinesPromise = (async () => {
      try {
        const response = await axiosInstance.get(`/medicines?${params.toString()}`);

        const list = Array.isArray(response.data?.medicines) ? response.data.medicines : [];
        const visible = list.filter((m) => {
          const v = m?.isActive;
          if (v === false) return false;
          const s = String(v).toLowerCase();
          if (s === "false" || s === "0") return false;
          return true;
        });

        // Update cache
        medicinesCache = {
          data: { medicines: visible, pagination: response.data.pagination },
          params: cacheKey,
          timestamp: Date.now(),
        };

        set({
          medicines: visible,
          pagination: response.data.pagination,
        });
      } catch (error) {
        // Silent fail - don't spam console or show repeated toasts
      } finally {
        set({ isLoading: false });
        fetchMedicinesPromise = null;
      }
    })();

    return fetchMedicinesPromise;
  },



  // Fetch single medicine
  fetchMedicineById: async (id) => {
    set({ isLoading: true });
    try {
      const response = await axiosInstance.get(`/medicines/${id}`);
      set({ currentMedicine: response.data });
    } catch (error) {
      toast.error("Failed to fetch medicine details");
      console.error("Fetch medicine error:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch categories with caching and deduplication
  fetchCategories: async () => {
    // Return cached categories if still valid
    if (categoriesCache.data && Date.now() - categoriesCache.timestamp < CACHE_TTL * 5) {
      set({ categories: categoriesCache.data });
      return;
    }
    
    // Deduplicate concurrent requests
    if (fetchCategoriesPromise) {
      return fetchCategoriesPromise;
    }
    
    fetchCategoriesPromise = (async () => {
      try {
        const response = await axiosInstance.get("/medicines/categories");
        categoriesCache = { data: response.data, timestamp: Date.now() };
        set({ categories: response.data });
      } catch (error) {
        console.error("Fetch categories error:", error);
      } finally {
        fetchCategoriesPromise = null;
      }
    })();
    
    return fetchCategoriesPromise;
  },

  // Fetch featured medicines
  fetchFeaturedMedicines: async () => {
    try {
      const response = await axiosInstance.get("/medicines/featured");
      set({ featuredMedicines: response.data });
    } catch (error) {
      console.error("Fetch featured medicines error:", error);
    }
  },

  // Search medicines
  searchMedicines: async (query) => {
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }

    try {
      const response = await axiosInstance.get(`/medicines/search?q=${encodeURIComponent(query)}`);
      set({ searchResults: response.data });
    } catch (error) {
      console.error("Search medicines error:", error);
      set({ searchResults: [] });
    }
  },

  // Update filters
  updateFilters: (newFilters) => {
    const currentFilters = get().filters;
    const updatedFilters = { ...currentFilters, ...newFilters };
    set({ filters: updatedFilters });
    
    // Fetch medicines with new filters
    get().fetchMedicines(1, updatedFilters);
  },

  // Clear search results
  clearSearchResults: () => set({ searchResults: [] }),

  // Clear current medicine
  clearCurrentMedicine: () => set({ currentMedicine: null }),
}));
