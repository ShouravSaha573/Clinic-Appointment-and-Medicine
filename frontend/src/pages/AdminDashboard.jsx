import { Fragment, useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense } from "react";
import { 
  Users, 
  Stethoscope, 
  UserCheck, 
  UserX, 
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  BarChart3,
  Copy,
  Check,
  FlaskConical,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  BookOpen,
  FileText,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Pill,
  ShoppingBag
} from "lucide-react";
import DoctorCreatedModal from "../components/DoctorCreatedModal";
import CreateLabReportModal from "../components/CreateLabReportModal";
import AddMedicineModal from "../components/AddMedicineModal";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAdminStore } from "../store/useAdminStore";
import { useAuthStore } from "../store/useAuthStore";

// Lazy load Chart component for better initial load time
const Chart = lazy(() => import("react-apexcharts"));

// Loading spinner for chart placeholder
const ChartLoadingPlaceholder = () => (
  <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// Custom debounce hook for search inputs
const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// Simple in-memory cache for API responses
const apiCache = new Map();
const CACHE_TTL = 300000; // 5 minutes for smooth experience

const getCachedData = (key) => {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  apiCache.set(key, { data, timestamp: Date.now() });
};

// Request deduplication map
const pendingRequests = new Map();

const fetchWithDedup = async (key, fetchFn) => {
  // Return cached data immediately
  const cached = getCachedData(key);
  if (cached) return cached;
  
  // Deduplicate concurrent requests
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }
  
  const promise = fetchFn().then(data => {
    setCachedData(key, data);
    pendingRequests.delete(key);
    return data;
  }).catch(err => {
    pendingRequests.delete(key);
    throw err;
  });
  
  pendingRequests.set(key, promise);
  return promise;
};

const AdminDashboard = () => {
  const getCurrentMonthKey = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  const parseMonthKeySafe = (monthKey) => {
    const raw = typeof monthKey === "string" ? monthKey.trim() : "";
    const match = raw.match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
    return { year, month };
  };

  const { authUser, isCheckingAuth } = useAuthStore();
  const { 
    doctors, 
    stats, 
    isLoading, 
    isUpdating,
    fetchStats,
    fetchDoctors,
    addDoctor,
    updateDoctor,
    toggleDoctorStatus,
    deleteDoctor
  } = useAdminStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdDoctor, setCreatedDoctor] = useState(null);

  // Debounced search terms for performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const debouncedMedicineSearchTerm = useDebounce("", 300);
  const debouncedUserSearchTerm = useDebounce("", 300);

  // Track which tabs have been loaded to avoid duplicate fetches
  const loadedTabsRef = useRef(new Set());

  // Tab and Lab Booking states
  const [activeTab, setActiveTab] = useState("doctors");
  const [labBookings, setLabBookings] = useState([]);
  const [isLabBookingsLoading, setIsLabBookingsLoading] = useState(false);
  const [labReports, setLabReports] = useState([]);
  const [isLabReportsLoading, setIsLabReportsLoading] = useState(false);
  const [showCreateReportModal, setShowCreateReportModal] = useState(false);
  const [articles, setArticles] = useState([]);
  const [isArticlesLoading, setIsArticlesLoading] = useState(false);
  const [isDiseaseStatsVisible, setIsDiseaseStatsVisible] = useState(false);
  const [isDiseaseStatsVisibilityLoading, setIsDiseaseStatsVisibilityLoading] = useState(false);
  const [isDiseaseStatsVisibilitySaving, setIsDiseaseStatsVisibilitySaving] = useState(false);
  const [adminDiseaseStats, setAdminDiseaseStats] = useState(null);
  const [isAdminDiseaseStatsLoading, setIsAdminDiseaseStatsLoading] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [isMedicinesLoading, setIsMedicinesLoading] = useState(false);
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [medicineSearchTerm, setMedicineSearchTerm] = useState("");
  const [medicineCategoryFilter, setMedicineCategoryFilter] = useState("all");
  const [orders, setOrders] = useState([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");

  const [doctorDailySessions, setDoctorDailySessions] = useState({});
  const [isDoctorDailySessionsLoading, setIsDoctorDailySessionsLoading] = useState(false);

  const [expandedDoctorId, setExpandedDoctorId] = useState(null);
  const [doctorSessionsHistory, setDoctorSessionsHistory] = useState({});
  const [doctorSessionsHistoryLoading, setDoctorSessionsHistoryLoading] = useState({});

  const [doctorMonthlyOutcome, setDoctorMonthlyOutcome] = useState([]);
  const [isDoctorMonthlyOutcomeLoading, setIsDoctorMonthlyOutcomeLoading] = useState(false);
  const [doctorMonthlyOutcomeMeta, setDoctorMonthlyOutcomeMeta] = useState({ month: "", commissionRate: 0.15 });
  const initialOutcomeMonthKey = getCurrentMonthKey();
  const initialOutcomeParsed = parseMonthKeySafe(initialOutcomeMonthKey);
  const [selectedOutcomeYear, setSelectedOutcomeYear] = useState(
    Number(initialOutcomeParsed?.year || new Date().getFullYear())
  );
  const [selectedOutcomeMonthNumber, setSelectedOutcomeMonthNumber] = useState(
    Number(initialOutcomeParsed?.month || new Date().getMonth() + 1)
  );
  const selectedOutcomeMonthKey = `${selectedOutcomeYear}-${String(selectedOutcomeMonthNumber).padStart(2, "0")}`;

  const [doctorMonthlyOutcomeSummary, setDoctorMonthlyOutcomeSummary] = useState({
    totalOutcome: 0,
    totalCommission: 0,
    outcome: 0,
    expense: 0,
  });

  const [outcomeView, setOutcomeView] = useState("doctor"); // "doctor" | "medicine"
  const [medicineSoldOutcomeItems, setMedicineSoldOutcomeItems] = useState([]);
  const [medicineSoldOutcomeTotals, setMedicineSoldOutcomeTotals] = useState({
    totalOrders: 0,
    totalSoldAmount: 0,
    totalSoldQuantity: 0,
    profit: 0,
  });
  const [medicineSoldOutcomeMeta, setMedicineSoldOutcomeMeta] = useState({ profitRate: 0.03, limit: 5000 });
  const [isMedicineSoldOutcomeLoading, setIsMedicineSoldOutcomeLoading] = useState(false);
  const [medicineOutcomeChartMode, setMedicineOutcomeChartMode] = useState("sold"); // "sold" | "all"
  const [medicineOutcomeMetric, setMedicineOutcomeMetric] = useState("amount"); // "amount" | "quantity"

  const [doctorSalaryDrafts, setDoctorSalaryDrafts] = useState({});
  const [doctorSalarySaving, setDoctorSalarySaving] = useState({});

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);

  const [selectedLabReport, setSelectedLabReport] = useState(null);
  const [showLabReportDetailsModal, setShowLabReportDetailsModal] = useState(false);

  const [showEditLabReportModal, setShowEditLabReportModal] = useState(false);
  const [isUpdatingLabReport, setIsUpdatingLabReport] = useState(false);
  const [labReportEditForm, setLabReportEditForm] = useState({
    overallStatus: "normal",
    isReportReady: false,
    additionalNotes: "",
    testedByName: "",
    testedByDesignation: "",
    verifiedByName: "",
    verifiedByDesignation: "",
    testResults: [],
  });

  // Users tab state
  const [users, setUsers] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("");

  const doctorOutcomeChart = useMemo(() => {
    const doctorsList = Array.isArray(doctors) ? doctors : [];
    const outcomeRows = Array.isArray(doctorMonthlyOutcome) ? doctorMonthlyOutcome : [];

    const categories = doctorsList.map((d) => d?.name || "").filter(Boolean);

    const commissionRate = Number(doctorMonthlyOutcomeMeta?.commissionRate || 0.15);

    const seriesOutcome = doctorsList.map((doctor) => {
      const row = outcomeRows.find((r) => String(r?.doctorId) === String(doctor?._id));
      const totalOutcome = Number(row?.totalOutcome || 0);
      const commission =
        row?.commission !== undefined && row?.commission !== null
          ? Number(row.commission || 0)
          : totalOutcome * commissionRate;
      return Math.max(0, totalOutcome - commission);
    });

    const seriesTotalPay = doctorsList.map((doctor) => {
      const row = outcomeRows.find((r) => String(r?.doctorId) === String(doctor?._id));
      const totalOutcome = Number(row?.totalOutcome || 0);
      const salary = Number(row?.salary || doctor?.salary || 0);
      const commission =
        row?.commission !== undefined && row?.commission !== null
          ? Number(row.commission || 0)
          : totalOutcome * commissionRate;
      return salary + commission;
    });

    const series = [
      { name: "Hospital's Outcome", data: seriesOutcome },
      { name: "Total (Salary + Commission)", data: seriesTotalPay },
    ];

    const options = {
      chart: { type: "bar", toolbar: { show: false } },
      plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "70%" } },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 1, colors: ["transparent"] },
      xaxis: {
        categories,
        labels: {
          formatter: (val) => {
            const n = Number(val);
            if (!Number.isFinite(n)) return String(val);
            return n.toLocaleString();
          },
        },
      },
      tooltip: {
        y: {
          formatter: (val) => {
            const n = Number(val);
            if (!Number.isFinite(n)) return String(val);
            return `${n.toLocaleString()} BDT`;
          },
        },
      },
      legend: { position: "bottom" },
      grid: { strokeDashArray: 4 },
    };

    return { options, series, hasData: categories.length > 0 };
  }, [doctors, doctorMonthlyOutcome, doctorMonthlyOutcomeMeta]);

  const medicineOutcomeChart = useMemo(() => {
    const items = Array.isArray(medicineSoldOutcomeItems) ? medicineSoldOutcomeItems : [];

    const soldByKey = new Map();
    for (const item of items) {
      const medicineId = item?.medicineId ? String(item.medicineId) : "";
      const medicineName = typeof item?.medicineName === "string" ? item.medicineName : "";
      const key = medicineId || medicineName;
      if (!key) continue;

      const prev = soldByKey.get(key) || {
        key,
        id: medicineId || key,
        name: medicineName || key,
        amount: 0,
        quantity: 0,
      };

      soldByKey.set(key, {
        ...prev,
        amount: prev.amount + Number(item?.lineTotal || 0),
        quantity: prev.quantity + Number(item?.quantity || 0),
      });
    }

    const allMedicinesList = Array.isArray(medicines) ? medicines : [];

    const metricKey = medicineOutcomeMetric === "quantity" ? "quantity" : "amount";

    const rows =
      medicineOutcomeChartMode === "all"
        ? allMedicinesList
            .map((m) => {
              const id = String(m?._id || "");
              const name = typeof m?.name === "string" ? m.name : "";
              const sold = soldByKey.get(id) || soldByKey.get(name) || null;
              return {
                key: id || name,
                id: id || name,
                name: name || id,
                amount: Number(sold?.amount || 0),
                quantity: Number(sold?.quantity || 0),
              };
            })
            .filter((r) => r.name)
            .sort((a, b) => Number(b?.[metricKey] || 0) - Number(a?.[metricKey] || 0) || a.name.localeCompare(b.name))
        : Array.from(soldByKey.values())
            .filter((r) => Number(r.amount || 0) > 0)
            .sort((a, b) => Number(b?.[metricKey] || 0) - Number(a?.[metricKey] || 0) || String(a.name).localeCompare(String(b.name)));

    const categories = rows.map((r) => r.name);
    const series = [
      {
        name: medicineOutcomeMetric === "quantity" ? "Sold Quantity" : "Sold Amount (BDT)",
        data: rows.map((r) => Number(r?.[metricKey] || 0)),
      },
    ];

    const chartHeight = Math.max(320, categories.length * 28 + 120);

    const options = {
      chart: { type: "bar", toolbar: { show: false } },
      plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "70%" } },
      dataLabels: { enabled: false },
      xaxis: {
        categories,
        labels: {
          formatter: (val) => {
            const n = Number(val);
            if (!Number.isFinite(n)) return String(val);
            return n.toLocaleString();
          },
        },
      },
      yaxis: {
        labels: {
          trim: true,
        },
      },
      tooltip: {
        y: {
          formatter: (val) => {
            const n = Number(val);
            if (!Number.isFinite(n)) return String(val);
            return medicineOutcomeMetric === "quantity"
              ? `${n.toLocaleString()} items`
              : `${n.toLocaleString()} BDT`;
          },
        },
      },
      legend: { show: false },
      grid: { strokeDashArray: 4 },
    };

    return {
      options,
      series,
      hasData: categories.length > 0,
      chartHeight,
      totalMedicinesInChart: categories.length,
      totalMedicinesAll: medicineOutcomeChartMode === "all" ? allMedicinesList.length : soldByKey.size,
    };
  }, [medicineSoldOutcomeItems, medicines, medicineOutcomeChartMode, medicineOutcomeMetric]);

  const medicineCategoriesForFilter = useMemo(() => {
    const list = Array.isArray(medicines) ? medicines : [];
    const set = new Set(
      list
        .map((m) => (typeof m?.category === "string" ? m.category.trim() : ""))
        .filter(Boolean)
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [medicines]);

  const filteredMedicines = useMemo(() => {
    const list = Array.isArray(medicines) ? medicines : [];
    const q = String(medicineSearchTerm || "").trim().toLowerCase();
    const category = String(medicineCategoryFilter || "all");

    return list.filter((m) => {
      if (category !== "all" && String(m?.category || "") !== category) {
        return false;
      }

      if (!q) return true;

      const parts = [
        m?._id,
        m?.name,
        m?.genericName,
        m?.brand,
        m?.category,
        m?.form,
        m?.strength,
        m?.manufacturer,
        m?.batchNumber,
      ]
        .filter((v) => typeof v === "string" || typeof v === "number")
        .map((v) => String(v).toLowerCase());

      return parts.some((p) => p.includes(q));
    });
  }, [medicines, medicineSearchTerm, medicineCategoryFilter]);

  const medicineStockPieChart = useMemo(() => {
    const list = Array.isArray(filteredMedicines) ? filteredMedicines : [];

    const rows = list
      .map((m) => ({
        name: typeof m?.name === "string" ? m.name : "",
        stock: Number(m?.stock ?? 0),
      }))
      .filter((r) => r.name && Number.isFinite(r.stock) && r.stock > 0);

    const labels = rows.map((r) => r.name);
    const series = rows.map((r) => r.stock);

    const options = {
      chart: { type: "pie" },
      labels,
      legend: { position: "bottom" },
      dataLabels: { enabled: false },
      tooltip: {
        y: {
          formatter: (val) => {
            const n = Number(val);
            if (!Number.isFinite(n)) return String(val);
            return `${n.toLocaleString()} in stock`;
          },
        },
      },
    };

    return { options, series, hasData: series.length > 0 };
  }, [filteredMedicines]);

  const [doctorForm, setDoctorForm] = useState({
    name: "",
    specialization: "",
    qualification: "",
    experience: "",
    phone: "",
    email: "",
    bio: "",
    consultationFee: "",
    profileImage: "",
  });

  const specializations = [
    "General Medicine",
    "Cardiology",
    "Dermatology",
    "Pediatrics",
    "Orthopedics",
    "Neurology",
    "Psychiatry",
    "Ophthalmology",
    "ENT",
    "Gynecology",
    "Urology",
    "Oncology",
    "Endocrinology",
    "Gastroenterology",
    "Pulmonology",
  ];

  useEffect(() => {
    if (isCheckingAuth) return;
    if (!authUser?.isAdmin) return;
    fetchStats();
    fetchDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const resetForm = () => {
    setDoctorForm({
      name: "",
      specialization: "",
      qualification: "",
      experience: "",
      phone: "",
      email: "",
      bio: "",
      consultationFee: "",
      profileImage: "",
    });
    setEditingDoctor(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!doctorForm.name || !doctorForm.specialization || !doctorForm.qualification || 
        !doctorForm.experience || !doctorForm.phone || !doctorForm.email || !doctorForm.consultationFee) {
      toast.error("Please fill in all required fields");
      return;
    }

    const result = editingDoctor
      ? await updateDoctor(editingDoctor._id, doctorForm)
      : await addDoctor(doctorForm);

    if (result.success) {
      setShowAddModal(false);
      resetForm();
      fetchStats(); // Refresh stats
      
      // Show success modal for new doctors
      if (!editingDoctor && result.doctor) {
        setCreatedDoctor(result.doctor);
        setShowSuccessModal(true);
      }
    }
  };

  const handleDoctorProfileImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setDoctorForm((prev) => ({
        ...(prev || {}),
        profileImage: result,
      }));
    };
    reader.onerror = () => {
      toast.error("Failed to read image file");
    };
    reader.readAsDataURL(file);
  };

  const handleEdit = (doctor) => {
    setDoctorForm({
      name: doctor.name,
      specialization: doctor.specialization,
      qualification: doctor.qualification,
      experience: doctor.experience.toString(),
      phone: doctor.phone,
      email: doctor.email,
      bio: doctor.bio || "",
      consultationFee: doctor.consultationFee.toString(),
      profileImage: doctor.profileImage || "",
    });
    setEditingDoctor(doctor);
    setShowAddModal(true);
  };

  const handleToggleStatus = async (doctorId) => {
    await toggleDoctorStatus(doctorId);
    fetchStats(); // Refresh stats
  };


  const copyDoctorId = async (doctorId) => {
    try {
      await navigator.clipboard.writeText(doctorId);
      setCopiedId(doctorId);
      toast.success("Doctor ID copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error("Failed to copy Doctor ID");
    }
  };

  const copyUserId = async (userId) => {
    try {
      await navigator.clipboard.writeText(userId);
      setCopiedId(userId);
      toast.success("User ID copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error("Failed to copy User ID");
    }
  };

  // Users Functions
  const fetchUsers = useCallback(async (forceRefresh = false) => {
    const cacheKey = "admin-users";
    if (!forceRefresh) {
      const cached = getCachedData(cacheKey);
      if (cached) {
        setUsers(cached);
        return;
      }
    }
    try {
      setIsUsersLoading(true);
      const response = await axiosInstance.get("/admin/users");
      const usersData = response.data.users || [];
      setUsers(usersData);
      setCachedData(cacheKey, usersData);
    } catch (error) {
      toast.error("Failed to fetch users");
      console.error("Error fetching users:", error);
    } finally {
      setIsUsersLoading(false);
    }
  }, []);

  const handleToggleUserStatus = async (userId) => {
    try {
      const response = await axiosInstance.patch(`/admin/users/${userId}/toggle-status`);
      const updatedUser = response.data.user;
      setUsers((prev) => prev.map((u) => (u._id === userId ? updatedUser : u)));
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to toggle user status");
      console.error("Error toggling user status:", error);
    }
  };

  // Lab Booking Functions
  const fetchLabBookings = useCallback(async (forceRefresh = false) => {
    const cacheKey = "admin-lab-bookings";
    if (!forceRefresh) {
      const cached = getCachedData(cacheKey);
      if (cached) {
        setLabBookings(cached);
        return;
      }
    }
    try {
      setIsLabBookingsLoading(true);
      const response = await axiosInstance.get("/lab-bookings/admin/all");
      const bookingsData = response.data.bookings || [];
      setLabBookings(bookingsData);
      setCachedData(cacheKey, bookingsData);
    } catch (error) {
      toast.error("Failed to fetch lab bookings");
      console.error("Error fetching lab bookings:", error);
    } finally {
      setIsLabBookingsLoading(false);
    }
  }, []);

  const handleAcceptLabBooking = async (bookingId) => {
    try {
      await axiosInstance.put(`/lab-bookings/admin/${bookingId}/accept`, {
        notes: "Booking approved by admin"
      });
      
      toast.success("Lab booking accepted successfully!");
      fetchLabBookings(); // Refresh the list
    } catch (error) {
      toast.error("Failed to accept lab booking");
      console.error("Error accepting lab booking:", error);
    }
  };

  const handleRejectLabBooking = async (bookingId) => {
    try {
      await axiosInstance.put(`/lab-bookings/admin/${bookingId}/reject`, {
        reason: "Rejected by admin"
      });
      
      toast.success("Lab booking rejected successfully!");
      fetchLabBookings(); // Refresh the list
    } catch (error) {
      toast.error("Failed to reject lab booking");
      console.error("Error rejecting lab booking:", error);
    }
  };

  const handleMarkLabBookingDone = async (bookingId) => {
    try {
      await axiosInstance.put(`/lab-bookings/admin/${bookingId}/status`, {
        status: "completed",
        notes: "Marked done by admin",
      });

      toast.success("Lab booking marked as done!");
      fetchLabBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to mark booking as done");
      console.error("Error marking lab booking done:", error);
    }
  };

  const parseSlotMinutes = (timeStr) => {
    const s = String(timeStr || "").trim();
    const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ampm = m[3].toUpperCase();
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return h * 60 + min;
  };

  const getSlotEndMinutes = (slot) => {
    const parts = String(slot || "").split("-").map((p) => p.trim());
    if (parts.length < 2) return null;
    return parseSlotMinutes(parts[1]);
  };

  const isLabBookingOverdue = (booking) => {
    if (!booking?.appointmentDate || !booking?.timeSlot) return false;
    const status = String(booking?.status || "").toLowerCase();
    if (status !== "pending" && status !== "confirmed") return false;

    const endMinutes = getSlotEndMinutes(booking.timeSlot);
    if (endMinutes === null) return false;

    const d = new Date(booking.appointmentDate);
    if (Number.isNaN(d.getTime())) return false;

    const endTime = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      Math.floor(endMinutes / 60),
      endMinutes % 60,
      0,
      0
    );

    return Date.now() > endTime.getTime();
  };

  // Lab Reports Functions
  const fetchLabReports = useCallback(async (forceRefresh = false) => {
    const cacheKey = "admin-lab-reports";
    if (!forceRefresh) {
      const cached = getCachedData(cacheKey);
      if (cached) {
        setLabReports(cached);
        return;
      }
    }
    try {
      setIsLabReportsLoading(true);
      const response = await axiosInstance.get("/lab-reports/admin/all");
      const reportsData = response.data.reports || [];
      setLabReports(reportsData);
      setCachedData(cacheKey, reportsData);
    } catch (error) {
      toast.error("Failed to fetch lab reports");
      console.error("Error fetching lab reports:", error);
    } finally {
      setIsLabReportsLoading(false);
    }
  }, []);

  const handleCreateReportSuccess = () => {
    // Invalidate cache and refresh
    apiCache.delete("admin-lab-reports");
    apiCache.delete("admin-lab-bookings");
    fetchLabReports(true);
    fetchLabBookings(true);
    setShowCreateReportModal(false);
  };

  // Medicines Functions
  const fetchMedicines = useCallback(async (forceRefresh = false) => {
    const cacheKey = "admin-medicines";
    if (!forceRefresh) {
      const cached = getCachedData(cacheKey);
      if (cached) {
        setMedicines(cached);
        return;
      }
    }
    try {
      setIsMedicinesLoading(true);
      const response = await axiosInstance.get("/medicines/admin/all", {
        params: { page: 1, limit: 5000 },
      });
      const medicinesData = response.data.medicines || [];
      setMedicines(medicinesData);
      setCachedData(cacheKey, medicinesData);
    } catch (error) {
      // Only show error for non-auth issues (auth errors redirect user)
      if (error?.response?.status !== 401 && error?.response?.status !== 403) {
        toast.error("Failed to load medicines");
      }
    } finally {
      setIsMedicinesLoading(false);
    }
  }, []);

  const toggleMedicineActive = async (medicine) => {
    try {
      const response = await axiosInstance.put(`/medicines/${medicine._id}`, {
        isActive: !medicine.isActive,
      });
      if (response.data?.medicine) {
        // Update local state immediately for instant UI feedback
        setMedicines((prev) =>
          prev.map((m) =>
            m._id === medicine._id ? { ...m, isActive: !medicine.isActive } : m
          )
        );
        toast.success(`Medicine ${medicine.isActive ? "deactivated" : "activated"} successfully`);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update medicine status");
    }
  };

  const deleteMedicine = async (medicineId) => {
    try {
      const response = await axiosInstance.delete(`/medicines/${medicineId}`);

      const deletedId = response.data?.deletedId || response.data?.medicine?._id || medicineId;
      setMedicines((prev) => prev.filter((m) => m._id !== deletedId));

      toast.success(response.data?.message || "Medicine deleted successfully");
      fetchMedicines(); // Refresh the medicines list
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete medicine");
      console.error("Error deleting medicine:", error?.response?.data || error);
    }
  };

  const handleCreateMedicineSuccess = () => {
    // Invalidate cache and refresh
    apiCache.delete("admin-medicines");
    fetchMedicines(true);
    setShowAddMedicineModal(false);
    setEditingMedicine(null);
  };

  const openEditLabReport = (report) => {
    setSelectedLabReport(report);
    setLabReportEditForm({
      overallStatus: report?.overallStatus || "normal",
      isReportReady: !!report?.isReportReady,
      additionalNotes: report?.additionalNotes || "",
      testedByName: report?.testedBy?.name || "",
      testedByDesignation: report?.testedBy?.designation || "",
      verifiedByName: report?.verifiedBy?.name || "",
      verifiedByDesignation: report?.verifiedBy?.designation || "",
      testResults: Array.isArray(report?.testResults) ? report.testResults : [],
    });
    setShowEditLabReportModal(true);
  };

  const handleSaveLabReportEdits = async () => {
    if (!selectedLabReport?._id) return;
    try {
      setIsUpdatingLabReport(true);
      const payload = {
        overallStatus: labReportEditForm.overallStatus,
        isReportReady: labReportEditForm.isReportReady,
        additionalNotes: labReportEditForm.additionalNotes,
        testedBy: {
          name: labReportEditForm.testedByName,
          designation: labReportEditForm.testedByDesignation || "Lab Technician",
        },
        verifiedBy: {
          name: labReportEditForm.verifiedByName,
          designation: labReportEditForm.verifiedByDesignation || "Pathologist",
        },
        testResults: labReportEditForm.testResults,
      };

      const response = await axiosInstance.put(`/lab-reports/admin/${selectedLabReport._id}`, payload);
      const updated = response.data?.report;
      if (updated && updated._id) {
        setLabReports((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
        setSelectedLabReport(updated);
      }

      toast.success(response.data?.message || "Lab report updated successfully");
      setShowEditLabReportModal(false);
      fetchLabReports();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update lab report");
      console.error("Error updating lab report:", error?.response?.data || error);
    } finally {
      setIsUpdatingLabReport(false);
    }
  };

  // Orders Functions
  const fetchOrders = useCallback(async () => {
    try {
      setIsOrdersLoading(true);
      const params = new URLSearchParams({ page: 1, limit: 50 });
      if (orderStatusFilter !== "all") {
        params.append("status", orderStatusFilter);
      }
      // Cache-bust without adding custom headers (custom headers can trigger CORS preflight).
      params.append("_t", String(Date.now()));
      const response = await axiosInstance.get(`/orders/admin/all?${params}`);
      setOrders(response.data.orders || []);
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to fetch orders";
      toast.error(message);
      console.error("Error fetching orders:", error?.response?.data || error);
    } finally {
      setIsOrdersLoading(false);
    }
  }, [orderStatusFilter]);

  const updateOrderStatus = async (orderId, newStatus, note = "") => {
    // Optimistic UI update (only touch the targeted order)
    const currentOrder = Array.isArray(orders) ? orders.find((o) => o?._id === orderId) : null;
    const previousStatus = currentOrder?.orderStatus;
    const previousPaymentStatus = currentOrder?.paymentStatus;

    setOrders((current) =>
      (Array.isArray(current) ? current : []).map((order) =>
        order._id === orderId ? { ...order, orderStatus: newStatus } : order
      )
    );
    try {
      const response = await axiosInstance.patch(`/orders/admin/${orderId}/status`, {
        status: newStatus,
        note: note || `Order status updated to ${newStatus}`
      });

      // Merge canonical backend response (may update fields like paymentStatus/actualDelivery)
      const updated = response.data?.order;
      if (updated && updated._id) {
        setOrders((current) =>
          (Array.isArray(current) ? current : []).map((o) => (o._id === updated._id ? { ...o, ...updated } : o))
        );
      }

      toast.success("Order status updated successfully");
      fetchOrders(); // Refresh the orders list
    } catch (error) {
      // Revert on error (only the targeted order)
      setOrders((current) =>
        (Array.isArray(current) ? current : []).map((order) =>
          order._id === orderId
            ? {
                ...order,
                orderStatus: previousStatus ?? order.orderStatus,
                paymentStatus: previousPaymentStatus ?? order.paymentStatus,
              }
            : order
        )
      );
      toast.error("Failed to update order status");
      console.error("Error updating order status:", error);
    }
  };

  const updateOrderPaymentStatus = async (orderId, paymentStatus) => {
    try {
      await axiosInstance.patch(`/orders/admin/${orderId}/payment`, {
        paymentStatus,
      });
      toast.success("Payment status updated");
      fetchOrders();
    } catch (error) {
      toast.error("Failed to update payment status");
      console.error("Error updating payment status:", error);
    }
  };

  // Fetch data when tab changes (only activeTab as dependency to avoid loops)
  // Use loadedTabsRef to avoid re-fetching data that's already loaded
  useEffect(() => {
    const loadTabData = async () => {
      // Skip if already loading or tab already loaded (for tabs without filters)
      const staticTabs = ["lab-bookings", "lab-reports", "users", "articles", "doctor-sessions"];
      
      if (activeTab === "lab-bookings") {
        if (!loadedTabsRef.current.has("lab-bookings") || labBookings.length === 0) {
          await fetchLabBookings();
          loadedTabsRef.current.add("lab-bookings");
        }
      }
      else if (activeTab === "lab-reports") {
        if (!loadedTabsRef.current.has("lab-reports") || labReports.length === 0) {
          await Promise.all([fetchLabReports(), fetchLabBookings()]);
          loadedTabsRef.current.add("lab-reports");
        }
      }
      else if (activeTab === "users") {
        if (!loadedTabsRef.current.has("users") || users.length === 0) {
          await fetchUsers();
          loadedTabsRef.current.add("users");
        }
      }
      else if (activeTab === "medicines") {
        if (!loadedTabsRef.current.has("medicines") || medicines.length === 0) {
          await fetchMedicines();
          loadedTabsRef.current.add("medicines");
        }
      }
      else if (activeTab === "orders") {
        // Orders refresh on filter change, so always fetch
        await fetchOrders();
      }
      else if (activeTab === "articles") {
        if (!loadedTabsRef.current.has("articles") || articles.length === 0) {
          await Promise.all([
            fetchArticles(),
            fetchDiseaseStatsVisibilityForAdmin(),
            fetchAdminDiseaseStats()
          ]);
          loadedTabsRef.current.add("articles");
        }
      }
      else if (activeTab === "doctor-sessions") {
        if (!loadedTabsRef.current.has("doctor-sessions")) {
          await fetchDoctorDailySessions();
          loadedTabsRef.current.add("doctor-sessions");
        }
      }
      else if (activeTab === "doctor-salary") {
        // Always fetch doctors for salary as it may need latest data
        await fetchDoctors();
      }
      else if (activeTab === "doctor-monthly-outcome") {
        fetchDoctorMonthlyOutcome(selectedOutcomeMonthKey);
      }
    };
    
    loadTabData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Orders: refetch when filter changes (only on Orders tab)
  useEffect(() => {
    if (activeTab !== "orders") return;
    fetchOrders();
  }, [activeTab, orderStatusFilter]);

  // Orders: auto-refresh while the tab is open (so new user orders appear)
  useEffect(() => {
    if (activeTab !== "orders") return;

    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      fetchOrders();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [activeTab, fetchOrders]);

  // Doctor monthly outcome: refetch when month/view changes (only on that tab)
  useEffect(() => {
    if (activeTab !== "doctor-monthly-outcome") return;
    if (outcomeView === "medicine") {
      fetchMedicineSoldOutcome(selectedOutcomeMonthKey);
    } else {
      fetchDoctorMonthlyOutcome(selectedOutcomeMonthKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOutcomeMonthKey, outcomeView]);

  useEffect(() => {
    if (activeTab !== "doctor-salary") return;
    const list = Array.isArray(doctors) ? doctors : [];
    const nextDrafts = {};
    for (const d of list) {
      nextDrafts[d._id] =
        d?.salary !== undefined && d?.salary !== null
          ? String(d.salary)
          : "";
    }
    setDoctorSalaryDrafts(nextDrafts);
  }, [activeTab, doctors]);

  const formatDuration = (totalSeconds) => {
    const s = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const fetchDoctorDailySessions = async () => {
    try {
      setIsDoctorDailySessionsLoading(true);

      // Ensure we have doctors
      let list = Array.isArray(doctors) ? doctors : [];
      if (list.length === 0) {
        const data = await fetchDoctors();
        list = Array.isArray(data?.doctors) ? data.doctors : [];
      }

      const results = await Promise.allSettled(
        list.map(async (doctor) => {
          const res = await axiosInstance.get(`/admin/doctors/${doctor._id}/daily-session`);
          return { doctorId: doctor._id, data: res.data };
        })
      );

      const nextMap = {};
      for (const r of results) {
        if (r.status === "fulfilled") {
          nextMap[r.value.doctorId] = r.value.data;
        }
      }
      setDoctorDailySessions(nextMap);
    } catch (error) {
      toast.error("Failed to fetch doctor sessions");
      console.error("Error fetching doctor sessions:", error);
    } finally {
      setIsDoctorDailySessionsLoading(false);
    }
  };

  const fetchDoctorDailySessionForDoctor = async (doctorId) => {
    try {
      const res = await axiosInstance.get(`/admin/doctors/${doctorId}/daily-session`);
      const daily = res.data;
      setDoctorDailySessions((prev) => ({
        ...(prev || {}),
        [doctorId]: daily,
      }));

      // If the expanded history is visible, also update today's row to reflect live seconds.
      const dateKey = typeof daily?.dateKey === "string" ? daily.dateKey : "";
      if (dateKey) {
        setDoctorSessionsHistory((prev) => {
          const current = prev?.[doctorId];
          const list = Array.isArray(current) ? current : [];

          // "Last Updated" in the expanded view should reflect the moment we refreshed,
          // not just the last DB write time.
          const refreshedAt = new Date().toISOString();

          const nextRow = {
            dateKey,
            totalSeconds: Number(daily?.totalSeconds || 0),
            lastUpdatedAt: refreshedAt,
          };

          const idx = list.findIndex((h) => String(h?.dateKey) === dateKey);
          if (idx >= 0) {
            const nextList = list.slice();
            nextList[idx] = { ...nextList[idx], ...nextRow };
            return { ...(prev || {}), [doctorId]: nextList };
          }

          // If today isn't present yet, add it at the top.
          return { ...(prev || {}), [doctorId]: [nextRow, ...list] };
        });
      }
    } catch (error) {
      toast.error("Failed to refresh today session");
      console.error("Error refreshing doctor daily session:", error);
    }
  };

  const refreshDoctorSessionsExpanded = async (doctorId) => {
    // Important: do this sequentially.
    // If done in parallel, the slower request can overwrite the merged "today" row,
    // making the UI flip back to an older total on subsequent refreshes.
    await fetchDoctorSessionsHistory(doctorId);
    await fetchDoctorDailySessionForDoctor(doctorId);
  };

  const fetchDoctorSessionsHistory = async (doctorId) => {
    try {
      setDoctorSessionsHistoryLoading((prev) => ({ ...prev, [doctorId]: true }));
      const res = await axiosInstance.get(`/admin/doctors/${doctorId}/sessions`);
      const sessions = Array.isArray(res.data?.sessions) ? res.data.sessions : [];
      setDoctorSessionsHistory((prev) => ({ ...prev, [doctorId]: sessions }));
    } catch (error) {
      toast.error("Failed to fetch session history");
      console.error("Error fetching session history:", error);
    } finally {
      setDoctorSessionsHistoryLoading((prev) => ({ ...prev, [doctorId]: false }));
    }
  };

  const fetchDoctorMonthlyOutcome = async (month) => {
    try {
      setIsDoctorMonthlyOutcomeLoading(true);

      const monthKey = typeof month === "string" ? month.trim() : "";
      const res = await axiosInstance.get("/admin/doctors/monthly-outcome", {
        params: monthKey ? { month: monthKey } : {},
      });

      const rows = Array.isArray(res.data?.doctors) ? res.data.doctors : [];
      setDoctorMonthlyOutcome(rows);
      setDoctorMonthlyOutcomeMeta({
        month: typeof res.data?.month === "string" ? res.data.month : "",
        commissionRate: typeof res.data?.commissionRate === "number" ? res.data.commissionRate : 0.15,
      });

      if (res.data?.summary && typeof res.data.summary === "object") {
        setDoctorMonthlyOutcomeSummary({
          totalOutcome: Number(res.data.summary?.totalOutcome || 0),
          totalCommission: Number(res.data.summary?.totalCommission || 0),
          outcome: Number(res.data.summary?.outcome || 0),
          expense: Number(res.data.summary?.expense || 0),
        });
      } else {
        const commissionRate = typeof res.data?.commissionRate === "number" ? res.data.commissionRate : 0.15;
        const totals = (rows || []).reduce(
          (acc, r) => {
            const totalOutcome = Number(r?.totalOutcome || 0);
            const salary = Number(r?.salary || 0);
            const commission =
              r?.commission !== undefined && r?.commission !== null
                ? Number(r.commission || 0)
                : totalOutcome * commissionRate;
            acc.totalOutcome += totalOutcome;
            acc.totalCommission += commission;
            acc.totalSalary += salary;
            return acc;
          },
          { totalOutcome: 0, totalCommission: 0, totalSalary: 0 }
        );

        setDoctorMonthlyOutcomeSummary({
          totalOutcome: totals.totalOutcome,
          totalCommission: totals.totalCommission,
          outcome: totals.totalOutcome - totals.totalCommission,
          expense: totals.totalSalary,
        });
      }
    } catch (error) {
      toast.error("Failed to fetch monthly outcome");
      console.error("Error fetching monthly outcome:", error);
    } finally {
      setIsDoctorMonthlyOutcomeLoading(false);
    }
  };

  const fetchMedicineSoldOutcome = async (month) => {
    try {
      setIsMedicineSoldOutcomeLoading(true);

      const monthKey = typeof month === "string" ? month.trim() : "";
      const res = await axiosInstance.get("/admin/medicine-sold-outcome", {
        params: monthKey ? { month: monthKey } : {},
      });

      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      const totals = res.data?.totals || {};

      setMedicineSoldOutcomeItems(items);
      setMedicineSoldOutcomeTotals({
        totalOrders: Number(totals?.totalOrders || 0),
        totalSoldAmount: Number(totals?.totalSoldAmount || 0),
        totalSoldQuantity: Number(totals?.totalSoldQuantity || 0),
        profit: Number(totals?.profit || 0),
      });
      setMedicineSoldOutcomeMeta({
        profitRate: Number(res.data?.profitRate ?? 0.03),
        limit: Number(res.data?.limit ?? 5000),
      });
    } catch (error) {
      toast.error("Failed to fetch medicine sold outcome");
      console.error("Error fetching medicine sold outcome:", error);
    } finally {
      setIsMedicineSoldOutcomeLoading(false);
    }
  };

  const saveDoctorSalary = async (doctorId) => {
    try {
      const raw = doctorSalaryDrafts?.[doctorId];
      const salaryNumber = Number(raw);
      if (!Number.isFinite(salaryNumber) || salaryNumber < 0) {
        toast.error("Salary must be a non-negative number");
        return;
      }

      setDoctorSalarySaving((prev) => ({ ...prev, [doctorId]: true }));
      await axiosInstance.patch(`/admin/doctors/${doctorId}/salary`, { salary: salaryNumber });
      toast.success("Salary updated");
      // Force refresh: admin doctors list is cached (stale-while-revalidate).
      // Without force refresh, the UI can keep showing the old salary.
      await fetchDoctors({}, true);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update salary");
      console.error("Error updating salary:", error);
    } finally {
      setDoctorSalarySaving((prev) => ({ ...prev, [doctorId]: false }));
    }
  };

  const fetchArticles = useCallback(async (forceRefresh = false) => {
    const cacheKey = "admin-articles";
    if (!forceRefresh) {
      const cached = getCachedData(cacheKey);
      if (cached) {
        setArticles(cached);
        return;
      }
    }
    try {
      setIsArticlesLoading(true);
      const response = await axiosInstance.get("/articles/admin/all");
      const articlesData = response.data.articles || [];
      setArticles(articlesData);
      setCachedData(cacheKey, articlesData);
    } catch (error) {
      toast.error("Failed to fetch articles");
      console.error("Error fetching articles:", error);
    } finally {
      setIsArticlesLoading(false);
    }
  }, []);

  const fetchDiseaseStatsVisibilityForAdmin = async () => {
    try {
      setIsDiseaseStatsVisibilityLoading(true);
      const response = await axiosInstance.get("/articles/admin/awareness/visibility");
      setIsDiseaseStatsVisible(Boolean(response.data?.enabled));
    } catch (error) {
      toast.error("Failed to fetch Disease Stats visibility");
      console.error("Error fetching Disease Stats visibility:", error);
    } finally {
      setIsDiseaseStatsVisibilityLoading(false);
    }
  };

  const toggleDiseaseStatsVisibilityForUsers = async () => {
    const nextEnabled = !isDiseaseStatsVisible;
    try {
      setIsDiseaseStatsVisibilitySaving(true);
      await axiosInstance.put("/articles/admin/awareness/visibility", { enabled: nextEnabled });
      setIsDiseaseStatsVisible(nextEnabled);
      toast.success(nextEnabled ? "Disease Stats shown to users" : "Disease Stats hidden from users");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update Disease Stats visibility");
      console.error("Error updating Disease Stats visibility:", error);
    } finally {
      setIsDiseaseStatsVisibilitySaving(false);
    }
  };

  const fetchAdminDiseaseStats = async () => {
    try {
      setIsAdminDiseaseStatsLoading(true);
      const response = await axiosInstance.get("/external/disease-stats");
      let nextStats = response.data || null;

      const looksLegacyCovidOnly =
        nextStats &&
        typeof nextStats === "object" &&
        !Object.prototype.hasOwnProperty.call(nextStats, "covid") &&
        !Object.prototype.hasOwnProperty.call(nextStats, "malariaBangladesh") &&
        (Object.prototype.hasOwnProperty.call(nextStats, "cases") ||
          Object.prototype.hasOwnProperty.call(nextStats, "deaths") ||
          Object.prototype.hasOwnProperty.call(nextStats, "updated"));

      if (looksLegacyCovidOnly) {
        const response2 = await axiosInstance.get("/external/disease-stats");
        nextStats = response2.data || nextStats;
      }

      setAdminDiseaseStats(nextStats);
    } catch (error) {
      setAdminDiseaseStats(null);
      console.error("Error fetching Disease Stats:", error);
    } finally {
      setIsAdminDiseaseStatsLoading(false);
    }
  };

  const handleApproveArticle = async (articleId) => {
    try {
      await axiosInstance.put(`/articles/admin/${articleId}/approve`);
      toast.success("Article approved successfully!");
      fetchArticles(); // Refresh the list
    } catch (error) {
      toast.error("Failed to approve article");
      console.error("Error approving article:", error);
    }
  };

  const handleRejectArticle = async (articleId) => {
    try {
      const reason = prompt("Enter reason for rejection:");
      if (reason === null) return; // User cancelled
      
      await axiosInstance.put(`/articles/admin/${articleId}/reject`, {
        rejectionReason: reason || "Article rejected by admin"
      });
      
      toast.success("Article rejected successfully!");
      fetchArticles(); // Refresh the list
    } catch (error) {
      toast.error("Failed to reject article");
      console.error("Error rejecting article:", error);
    }
  };

  const handleDeleteArticle = async (articleId) => {
    if (!confirm("Are you sure you want to delete this article? This action cannot be undone.")) {
      return;
    }
    
    try {
      await axiosInstance.delete(`/articles/${articleId}`);
      toast.success("Article deleted successfully!");
      fetchArticles(); // Refresh the list
    } catch (error) {
      toast.error("Failed to delete article");
      console.error("Error deleting article:", error);
    }
  };

  // Safety checks to ensure we have valid data
  const safeDoctors = Array.isArray(doctors) ? doctors : [];
  const filteredDoctors = useMemo(() => {
    return safeDoctors.filter((d) => {
      // search (name/email) - use debounced value
      const q = debouncedSearchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        String(d?.name || "").toLowerCase().includes(q) ||
        String(d?.email || "").toLowerCase().includes(q);

      // specialization dropdown
      const matchesSpec =
        !specializationFilter || d?.specialization === specializationFilter;

      // status dropdown (statusFilter is "", "true", "false")
      const matchesStatus =
        !statusFilter || d?.isActive === (statusFilter === "true");

      return matchesSearch && matchesSpec && matchesStatus;
    });
  }, [safeDoctors, debouncedSearchTerm, specializationFilter, statusFilter]);

  const safeLabBookings = Array.isArray(labBookings) ? labBookings : [];
  const safeArticles = Array.isArray(articles) ? articles : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeStats = stats || {};
  const safeSpecializations = Array.isArray(specializations) ? specializations : [];

  const filteredUsers = safeUsers.filter((u) => {
    const term = userSearchTerm.trim().toLowerCase();
    const matchesSearch = !term
      ? true
      : String(u.fullName || "").toLowerCase().includes(term) || String(u.email || "").toLowerCase().includes(term);

    const isActive = u.isActive !== false;
    const matchesStatus =
      userStatusFilter === ""
        ? true
        : userStatusFilter === "true"
          ? isActive
          : !isActive;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome, {authUser?.fullName}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed w-fit mt-6">
          <button 
            className={`tab ${activeTab === "doctors" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("doctors")}
          >
            <Stethoscope className="size-4 mr-2" />
            Doctors
          </button>
          <button 
            className={`tab ${activeTab === "users" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <Users className="size-4 mr-2" />
            Users
          </button>
          <button 
            className={`tab ${activeTab === "lab-bookings" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("lab-bookings")}
          >
            <FlaskConical className="size-4 mr-2" />
            Lab Bookings
          </button>
          <button 
            className={`tab ${activeTab === "lab-reports" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("lab-reports")}
          >
            <FileText className="size-4 mr-2" />
            Lab Reports
          </button>
          <button 
            className={`tab ${activeTab === "medicines" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("medicines")}
          >
            <Pill className="size-4 mr-2" />
            Medicines
          </button>
          <button 
            className={`tab ${activeTab === "orders" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            <ShoppingBag className="size-4 mr-2" />
            Orders
          </button>
          <button 
            className={`tab ${activeTab === "articles" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("articles")}
          >
            <BookOpen className="size-4 mr-2" />
            Articles
          </button>
          <button 
            className={`tab ${activeTab === "doctor-sessions" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("doctor-sessions")}
          >
            <Clock className="size-4 mr-2" />
            Sessions
          </button>
          <button 
            className={`tab ${activeTab === "doctor-monthly-outcome" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("doctor-monthly-outcome")}
          >
            <BarChart3 className="size-4 mr-2" />
            Outcome
          </button>
          <button 
            className={`tab ${activeTab === "doctor-salary" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("doctor-salary")}
          >
            <UserCheck className="size-4 mr-2" />
            Salary
          </button>
        </div>
      </div>

      {/* Doctors Tab Content */}
      {activeTab === "doctors" && (
        <>
          {/* Add Doctor Button Section */}
          <div className="bg-base-100 rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Doctor Management</h2>
                <p className="text-gray-600 text-sm mt-1">Add, edit, and manage doctors in the system</p>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="btn btn-primary btn-lg gap-3 shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 border-none text-white font-semibold px-8"
              >
                <Plus className="size-5" />
                Add New Doctor
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          {safeStats && Object.keys(safeStats).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="stat bg-base-100 rounded-lg shadow">
                <div className="stat-figure text-primary">
                  <Stethoscope className="size-8" />
                </div>
                <div className="stat-title">Total Doctors</div>
                <div className="stat-value text-primary">{safeStats.doctors?.total || 0}</div>
                <div className="stat-desc">Active: {safeStats.doctors?.active || 0}</div>
              </div>
              
              <div className="stat bg-base-100 rounded-lg shadow">
                <div className="stat-figure text-success">
                  <UserCheck className="size-8" />
                </div>
                <div className="stat-title">Active Doctors</div>
                <div className="stat-value text-success">{safeStats.doctors?.active || 0}</div>
              </div>
              
              <div className="stat bg-base-100 rounded-lg shadow">
                <div className="stat-figure text-error">
                  <UserX className="size-8" />
                </div>
                <div className="stat-title">Inactive Doctors</div>
                <div className="stat-value text-error">{safeStats.doctors?.inactive || 0}</div>
              </div>
              
              <div className="stat bg-base-100 rounded-lg shadow">
                <div className="stat-figure text-info">
                  <Users className="size-8" />
                </div>
                <div className="stat-title">Total Users</div>
                <div className="stat-value text-info">{safeStats.users?.total || 0}</div>
                <div className="stat-desc">Admins: {safeStats.users?.admins || 0}</div>
              </div>
            </div>
          )}

      {/* Filters */}
      <div className="bg-base-100 rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Search</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search doctors..."
                className="input input-bordered w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="size-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Specialization</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={specializationFilter}
              onChange={(e) => setSpecializationFilter(e.target.value)}
            >
              <option value="">All Specializations</option>
              {safeSpecializations.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Status</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Doctors Table */}
      <div className="bg-base-100 rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Doctor ID</th>
                <th>Specialization</th>
                <th>Experience</th>
                <th>Fee (BDT)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDoctors.map((doctor) => (
                <tr key={doctor._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar">
                        <div className="mask mask-squircle w-12 h-12">
                          <img
                            src={doctor.profileImage || "/api/placeholder/48/48"}
                            alt={doctor.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="font-bold">{doctor.name}</div>
                        <div className="text-sm opacity-50">{doctor.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-base-200 px-2 py-1 rounded">
                        {doctor._id.slice(-8)}...
                      </code>
                      <button
                        onClick={() => copyDoctorId(doctor._id)}
                        className="btn btn-xs btn-ghost"
                        title="Copy full Doctor ID"
                      >
                        {copiedId === doctor._id ? (
                          <Check className="size-3 text-success" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td>{doctor.specialization}</td>
                  <td>{doctor.experience} years</td>
                  <td>৳{doctor.consultationFee}</td>
                  <td>
                    <div className={`badge ${doctor.isActive ? 'badge-success' : 'badge-error'}`}>
                      {doctor.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(doctor)}
                          className="btn btn-sm btn-outline"
                          disabled={isUpdating}
                        >
                          <Edit className="size-4" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(doctor._id)}
                          className="btn btn-sm btn-outline"
                          disabled={isUpdating}
                        >
                          {doctor.isActive ? (
                            <ToggleRight className="size-4" />
                          ) : (
                            <ToggleLeft className="size-4" />
                          )}
                        </button>
                      </div>
                    </td>                           
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Doctor Modal */}
      {showAddModal && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              {editingDoctor ? "Edit Doctor" : "Add New Doctor"}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Name *</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={doctorForm.name}
                    onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Email *</span>
                  </label>
                  <input
                    type="email"
                    className="input input-bordered"
                    value={doctorForm.email}
                    onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Specialization *</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={doctorForm.specialization}
                    onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                    required
                  >
                    <option value="">Select Specialization</option>
                    {safeSpecializations.map((spec) => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Qualification *</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={doctorForm.qualification}
                    onChange={(e) => setDoctorForm({ ...doctorForm, qualification: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Experience (years) *</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={doctorForm.experience}
                    onChange={(e) => setDoctorForm({ ...doctorForm, experience: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Phone *</span>
                  </label>
                  <input
                    type="tel"
                    className="input input-bordered"
                    value={doctorForm.phone}
                    onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Consultation Fee (BDT) *</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={doctorForm.consultationFee}
                    onChange={(e) => setDoctorForm({ ...doctorForm, consultationFee: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Profile Picture</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="file-input file-input-bordered w-full"
                    onChange={handleDoctorProfileImageFileChange}
                  />

                  {doctorForm.profileImage ? (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="avatar">
                        <div className="w-12 h-12 rounded-full">
                          <img
                            src={doctorForm.profileImage}
                            alt="Doctor profile preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500">Preview</div>
                        <input
                          type="url"
                          className="input input-bordered input-sm w-full"
                          value={doctorForm.profileImage}
                          onChange={(e) => setDoctorForm({ ...doctorForm, profileImage: e.target.value })}
                          placeholder="Or paste an image URL / data URL"
                        />
                      </div>
                    </div>
                  ) : (
                    <input
                      type="url"
                      className="input input-bordered"
                      value={doctorForm.profileImage}
                      onChange={(e) => setDoctorForm({ ...doctorForm, profileImage: e.target.value })}
                      placeholder="Optional: paste an image URL"
                    />
                  )}
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Bio</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-24"
                  value={doctorForm.bio}
                  onChange={(e) => setDoctorForm({ ...doctorForm, bio: e.target.value })}
                  placeholder="Doctor's biography..."
                />
              </div>

              <div className="modal-action">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUpdating}
                >
                  {isUpdating ? "Saving..." : editingDoctor ? "Update" : "Add"} Doctor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="btn"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}

      {/* Users Tab Content */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="bg-base-100 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">User Management</h2>
            <p className="text-gray-600">Manage users (admins are excluded)</p>
          </div>

          <div className="bg-base-100 rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Search</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="input input-bordered w-full pl-10"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                  />
                  <Search className="size-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Status</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {isUsersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="loading loading-spinner loading-lg"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-base-100 rounded-lg shadow p-12 text-center">
              <Users className="size-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Users Found</h3>
              <p className="text-gray-600">Try changing your filters.</p>
            </div>
          ) : (
            <div className="bg-base-100 rounded-lg shadow">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>User ID</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isActive = u.isActive !== false;
                      return (
                        <tr key={u._id}>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="avatar">
                                <div className="relative bg-neutral text-neutral-content rounded-full w-10 h-10 flex items-center justify-center overflow-hidden">
                                  <span className="text-sm">{u.fullName?.charAt(0) || "?"}</span>
                                  {u.profilePic ? (
                                    <img
                                      src={u.profilePic}
                                      alt={u.fullName ? `${u.fullName} profile` : "User profile"}
                                      className="absolute inset-0 w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                      }}
                                    />
                                  ) : null}
                                </div>
                              </div>
                              <div>
                                <div className="font-bold">{u.fullName}</div>
                                <div className="text-sm opacity-50">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-base-200 px-2 py-1 rounded">
                                {u._id.slice(-8)}...
                              </code>
                              <button
                                onClick={() => copyUserId(u._id)}
                                className="btn btn-xs btn-ghost"
                                title="Copy full User ID"
                              >
                                {copiedId === u._id ? (
                                  <Check className="size-3 text-success" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td>
                            <div className={`badge ${isActive ? "badge-success" : "badge-error"}`}>
                              {isActive ? "Active" : "Inactive"}
                            </div>
                          </td>
                          <td>
                            <button
                              onClick={() => handleToggleUserStatus(u._id)}
                              className="btn btn-sm btn-outline"
                              disabled={isUpdating}
                              title={isActive ? "Deactivate user" : "Activate user"}
                            >
                              {isActive ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lab Bookings Tab Content */}
      {activeTab === "lab-bookings" && (
        <div className="space-y-6">
          {/* Lab Bookings Header */}
          <div className="bg-base-100 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Lab Test Bookings</h2>
            <p className="text-gray-600">Manage lab test bookings and their status</p>
          </div>

          {/* Lab Bookings List */}
          {isLabBookingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="loading loading-spinner loading-lg"></div>
            </div>
          ) : safeLabBookings.length === 0 ? (
            <div className="bg-base-100 rounded-lg shadow p-12 text-center">
              <FlaskConical className="size-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Lab Bookings Found</h3>
              <p className="text-gray-600">No lab test bookings have been made yet.</p>
            </div>
          ) : (
            <div className="bg-base-100 rounded-lg shadow">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Tests</th>
                      <th>Appointment Date</th>
                      <th>Time Slot</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeLabBookings.map((booking) => (
                      (() => {
                        const isOverdue = isLabBookingOverdue(booking);
                        return (
                      <tr key={booking._id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="avatar">
                              <div className="relative bg-neutral text-neutral-content rounded-full w-12 h-12 flex items-center justify-center overflow-hidden">
                                <span className="text-xl">
                                  {booking.userId?.fullName?.charAt(0) || "?"}
                                </span>
                                {booking.userId?.profilePic ? (
                                  <img
                                    src={booking.userId.profilePic}
                                    alt={booking.userId?.fullName ? `${booking.userId.fullName} profile` : "Patient profile"}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                ) : null}
                              </div>
                            </div>
                            <div>
                              <div className="font-bold">{booking.userId?.fullName || "Unknown Patient"}</div>
                              <div className="text-sm opacity-50">{booking.userId?.email || "No email"}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="space-y-1">
                            {booking.tests?.map((test, index) => (
                              <div key={index} className="badge badge-outline badge-sm">
                                {test.name}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Calendar className="size-4 text-gray-400" />
                            {new Date(booking.appointmentDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Clock className="size-4 text-gray-400" />
                            {booking.timeSlot}
                          </div>
                        </td>
                        <td>{booking.phoneNumber}</td>
                        <td>
                          <div className={`badge ${
                            isOverdue ? "badge-error" :
                            booking.status === "pending" ? "badge-warning" :
                            booking.status === "confirmed" ? "badge-success" :
                            booking.status === "sample_collected" ? "badge-info" :
                            booking.status === "processing" ? "badge-info" :
                            booking.status === "completed" ? "badge-success" :
                            booking.status === "cancelled" ? "badge-error" : "badge-ghost"
                          }`}>
                            {isOverdue ? "OVERDUE" : String(booking.status || "").replace(/_/g, " ").toUpperCase()}
                          </div>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            {isOverdue ? (
                              <span className="text-sm text-gray-500">Overdue</span>
                            ) : booking.status === "pending" ? (
                              <>
                                <button
                                  onClick={() => handleAcceptLabBooking(booking._id)}
                                  className="btn btn-sm btn-success gap-1"
                                  title="Approve Booking"
                                >
                                  <CheckCircle className="size-4" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectLabBooking(booking._id)}
                                  className="btn btn-sm btn-error gap-1"
                                  title="Decline Booking"
                                >
                                  <XCircle className="size-4" />
                                  Decline
                                </button>
                              </>
                            ) : booking.status !== "pending" && booking.status !== "cancelled" && booking.status !== "completed" ? (
                              <button
                                onClick={() => handleMarkLabBookingDone(booking._id)}
                                className="btn btn-sm btn-primary gap-1"
                                title="Mark booking as done"
                                disabled={isOverdue}
                              >
                                Done
                              </button>
                            ) : (booking.status === "cancelled" || booking.status === "completed") ? (
                              <span className="text-sm text-gray-500">
                                {booking.status === "cancelled" ? "Cancelled" : "Done"}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                        );
                      })()
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lab Reports Tab Content */}
      {activeTab === "lab-reports" && (
        <div className="bg-base-100 rounded-lg shadow p-6">
          {/* Lab Reports Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Lab Reports Management</h2>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                Total Reports: {labReports.length}
              </div>
              <button
                onClick={() => setShowCreateReportModal(true)}
                className="btn btn-primary gap-2"
                disabled={labBookings.length === 0}
              >
                <Plus className="size-4" />
                Create Report
              </button>
            </div>
          </div>

          {/* Lab Reports List */}
          {isLabReportsLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : labReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="size-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Lab Reports Found</h3>
              <p className="text-gray-600 mb-6">
                {labBookings.length === 0 
                  ? "No lab bookings available to create reports for."
                  : "No lab reports have been created yet. Create the first report!"
                }
              </p>
              {labBookings.length > 0 && (
                <button
                  onClick={() => setShowCreateReportModal(true)}
                  className="btn btn-primary gap-2"
                >
                  <Plus className="size-4" />
                  Create First Report
                </button>
              )}
            </div>
          ) : (
            <div className="bg-base-100 rounded-lg shadow">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Report Number</th>
                      <th>Patient</th>
                      <th>Booking</th>
                      <th>Report Date</th>
                      <th>Status</th>
                      <th>Tested By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labReports.map((report) => (
                      <tr key={report._id}>
                        <td>
                          <div className="font-mono text-sm">
                            {report.reportNumber}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="avatar">
                              <div className="relative bg-neutral text-neutral-content rounded-full w-12 h-12 flex items-center justify-center overflow-hidden">
                                <span className="text-xl">
                                  {report.patient?.fullName?.charAt(0) || "?"}
                                </span>
                                {report.patient?.profilePic ? (
                                  <img
                                    src={report.patient.profilePic}
                                    alt={report.patient?.fullName ? `${report.patient.fullName} profile` : "Patient profile"}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                ) : null}
                              </div>
                            </div>
                            <div>
                              <div className="font-bold">{report.patient?.fullName || "Unknown Patient"}</div>
                              <div className="text-sm opacity-50">{report.patient?.email || "No email"}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="text-sm">
                            <div className="font-medium">#{report.labBooking?.bookingNumber}</div>
                            <div className="text-gray-500">
                              {new Date(report.labBooking?.appointmentDate).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="text-sm">
                            {new Date(report.reportDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td>
                          <div className={`badge ${
                            report.overallStatus === "normal" ? "badge-success" :
                            report.overallStatus === "abnormal" ? "badge-error" :
                            "badge-warning"
                          }`}>
                            {report.overallStatus?.toUpperCase()}
                          </div>
                        </td>
                        <td>
                          <div className="text-sm">
                            <div className="font-medium">{report.testedBy?.name}</div>
                            <div className="text-gray-500">{report.testedBy?.designation}</div>
                          </div>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedLabReport(report);
                                setShowLabReportDetailsModal(true);
                              }}
                              className="btn btn-sm btn-outline gap-1"
                              title="View Report"
                            >
                              <Eye className="size-4" />
                              View
                            </button>
                            <button
                              className="btn btn-sm btn-outline gap-1"
                              title="Edit Report"
                              onClick={() => openEditLabReport(report)}
                            >
                              <Edit className="size-4" />
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Medicines Tab Content */}
      {activeTab === "medicines" && (
        <div className="bg-base-100 rounded-lg shadow p-6">
          {/* Medicines Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Medicines Management</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAddMedicineModal(true)}
                className="btn btn-primary btn-lg gap-2 shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 border-none text-white font-semibold"
              >
                <Plus className="size-5" />
                Add Medicine
              </button>
            </div>
          </div>

          {/* Medicines Search */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
            <label className="input input-bordered flex items-center gap-2 w-full md:max-w-md">
              <Search className="size-4 opacity-60" />
              <input
                type="text"
                className="grow"
                placeholder="Search medicines (name, generic, brand, category)"
                value={medicineSearchTerm}
                onChange={(e) => setMedicineSearchTerm(e.target.value)}
              />
              {medicineSearchTerm ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => setMedicineSearchTerm("")}
                  title="Clear search"
                >
                  ✕
                </button>
              ) : null}
            </label>

            <select
              value={medicineCategoryFilter}
              onChange={(e) => setMedicineCategoryFilter(e.target.value)}
              className="select select-bordered w-full md:w-64"
              title="Filter by category"
            >
              <option value="all">All categories</option>
              {medicineCategoriesForFilter.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {(medicineSearchTerm || medicineCategoryFilter !== "all") ? (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setMedicineSearchTerm("");
                  setMedicineCategoryFilter("all");
                }}
              >
                Reset
              </button>
            ) : null}

            <div className="text-sm text-gray-500">
              {(medicineSearchTerm || medicineCategoryFilter !== "all")
                ? `Showing ${filteredMedicines.length} of ${medicines.length}`
                : `Total Medicines: ${medicines.length}`}
            </div>
          </div>

          {/* Medicine Stock Pie Chart */}
          {filteredMedicines.length > 0 && medicineStockPieChart.hasData && (
            <div className="bg-base-100 rounded-lg shadow mb-6">
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-3">Medicine Stock Distribution</h3>
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[320px]">
                    <Suspense fallback={<ChartLoadingPlaceholder />}>
                      <Chart
                        options={medicineStockPieChart.options}
                        series={medicineStockPieChart.series}
                        type="pie"
                        height={360}
                      />
                    </Suspense>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Medicines List */}
          {isMedicinesLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : medicines.length === 0 ? (
            <div className="text-center py-12">
              <Pill className="size-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Medicines Found</h3>
              <p className="text-gray-600 mb-6">
                No medicines have been added yet. Add the first medicine to get started!
              </p>
              <button
                onClick={() => setShowAddMedicineModal(true)}
                className="btn btn-primary btn-lg gap-3 shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-green-500 to-green-600 border-none text-white font-semibold px-8 py-4"
              >
                <Plus className="size-6" />
                Add First Medicine
              </button>
            </div>
          ) : filteredMedicines.length === 0 ? (
            <div className="text-center py-12">
              <Pill className="size-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Results Found</h3>
              <p className="text-gray-600 mb-6">
                No medicines match “{medicineSearchTerm}”. Try a different search.
              </p>
              <button
                onClick={() => setMedicineSearchTerm("")}
                className="btn btn-outline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="bg-base-100 rounded-lg shadow">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Medicine</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Status</th>
                      <th>Expiry</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMedicines.map((medicine, idx) => (
                      <tr key={medicine._id}>
                        <td className="text-sm text-gray-500 font-medium">{idx + 1}</td>
                        <td>
                          <div className="flex items-center gap-3">
                            {medicine.image ? (
                              <div className="avatar">
                                <div className="mask mask-squircle w-12 h-12">
                                  <img 
                                    src={medicine.image} 
                                    alt={medicine.name}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                  <div className="avatar placeholder w-12 h-12" style={{display: 'none'}}>
                                    <div className="bg-neutral text-neutral-content rounded-xl">
                                      <span className="text-xl">
                                        <Pill className="size-6" />
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="avatar placeholder">
                                <div className="bg-neutral text-neutral-content rounded-xl w-12">
                                  <span className="text-xl">
                                    <Pill className="size-6" />
                                  </span>
                                </div>
                              </div>
                            )}
                            <div>
                              <div className="font-bold">{medicine.name}</div>
                              <div className="text-sm opacity-50">{medicine.genericName}</div>
                              <div className="text-xs text-gray-500">{medicine.brand} • {medicine.strength}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="badge badge-outline">{medicine.category}</div>
                          <div className="text-xs text-gray-500 mt-1">{medicine.form}</div>
                        </td>
                        <td>
                          <div className="font-semibold">৳{medicine.price}</div>
                          {medicine.discountPrice && medicine.discountPrice < medicine.price && (
                            <div className="text-sm text-success">৳{medicine.discountPrice} (Sale)</div>
                          )}
                        </td>
                        <td>
                          <div className={`font-semibold ${
                            medicine.stock <= medicine.minStock ? 'text-error' : 
                            medicine.stock <= medicine.minStock * 2 ? 'text-warning' : 'text-success'
                          }`}>
                            {medicine.stock}
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col gap-1">
                            <div className={`badge ${medicine.isActive ? 'badge-success' : 'badge-error'}`}>
                              {medicine.isActive ? 'Active' : 'Inactive'}
                            </div>
                            {medicine.prescriptionRequired && (
                              <div className="badge badge-warning badge-sm">Rx Required</div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className={`text-sm ${
                            new Date(medicine.expiryDate) < new Date() ? 'text-error font-semibold' :
                            new Date(medicine.expiryDate) < new Date(Date.now() + 30*24*60*60*1000) ? 'text-warning' : 'text-gray-600'
                          }`}>
                            {new Date(medicine.expiryDate).toLocaleDateString()}
                          </div>
                          {new Date(medicine.expiryDate) < new Date() && (
                            <div className="text-xs text-error">EXPIRED</div>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleMedicineActive(medicine)}
                              className={`btn btn-sm gap-1 ${medicine.isActive ? "btn-warning" : "btn-success"}`}
                              title={medicine.isActive ? "Deactivate Medicine" : "Activate Medicine"}
                            >
                              {medicine.isActive ? (
                                <ToggleLeft className="size-4" />
                              ) : (
                                <ToggleRight className="size-4" />
                              )}
                              {medicine.isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => {
                                setEditingMedicine(medicine);
                                setShowAddMedicineModal(true);
                              }}
                              className="btn btn-sm btn-outline gap-1"
                              title="Edit Medicine"
                            >
                              <Edit className="size-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => deleteMedicine(medicine._id)}
                              className="btn btn-sm btn-error gap-1"
                              title="Delete Medicine"
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Orders Tab Content */}
      {activeTab === "orders" && (
        <div className="bg-base-100 rounded-lg shadow p-6">
          {/* Orders Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Orders Management</h2>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                Total Orders: {orders.length}
              </div>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="select select-bordered select-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>

          {/* Orders List */}
          {isOrdersLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="size-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Orders Found</h3>
              <p className="text-gray-600 mb-6">
                {orderStatusFilter === "all" 
                  ? "No orders have been placed yet."
                  : `No ${orderStatusFilter} orders found.`
                }
              </p>
            </div>
          ) : (
            <div className="bg-base-100 rounded-lg shadow">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order._id}>
                        <td>
                          <div className="font-mono text-sm">
                            #{order.orderNumber || order._id.slice(-8).toUpperCase()}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="avatar">
                              <div className="relative bg-neutral text-neutral-content rounded-full w-10 h-10 flex items-center justify-center overflow-hidden">
                                <span className="text-sm">
                                  {order.user?.fullName?.charAt(0) || "?"}
                                </span>
                                {order.user?.profilePic ? (
                                  <img
                                    src={order.user.profilePic}
                                    alt={order.user?.fullName ? `${order.user.fullName} profile` : "Customer profile"}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                ) : null}
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{order.user?.fullName || "Unknown"}</div>
                              <div className="text-xs opacity-50">{order.user?.email || "No email"}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="text-sm">
                            <div className="font-medium">{order.items?.length || 0} items</div>
                            <div className="text-xs text-gray-500">
                              {order.items?.slice(0, 2).map((item) => item?.name || item?.medicine?.name || "Unknown").join(", ")}
                              {order.items?.length > 2 && `... +${order.items.length - 2} more`}
                            </div>
                          </div>
                        </td>
                        <td>
                          {(() => {
                            const items = Array.isArray(order?.items) ? order.items : [];
                            const itemsSubtotal = items.reduce((sum, it) => {
                              const qty = Number(it?.quantity || 0);
                              const unitPrice = Number(it?.price ?? it?.medicine?.discountPrice ?? it?.medicine?.price ?? 0);
                              const safeUnitPrice = Number.isFinite(unitPrice) ? unitPrice : 0;
                              return sum + qty * safeUnitPrice;
                            }, 0);

                            const subtotal = Number.isFinite(Number(order?.subtotal))
                              ? Number(order.subtotal)
                              : itemsSubtotal;
                            const deliveryFee = Number(order?.deliveryFee || 0);
                            const discount = Number(order?.discount || 0);
                            const computedTotal = subtotal + deliveryFee - discount;

                            return (
                              <>
                                <div className="font-semibold">৳{computedTotal.toFixed(2)}</div>
                                {(deliveryFee > 0 || discount > 0) && (
                                  <div className="text-xs text-gray-500">
                                    {deliveryFee > 0 ? `+ ৳${deliveryFee.toFixed(2)} delivery` : ""}
                                    {deliveryFee > 0 && discount > 0 ? " " : ""}
                                    {discount > 0 ? `- ৳${discount.toFixed(2)} discount` : ""}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </td>
                        <td>
                          <select
                            value={order.orderStatus || "pending"}
                            onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                            className={`select select-bordered select-sm ${
                              order.orderStatus === "delivered" ? "select-success" :
                              order.orderStatus === "cancelled" ? "select-error" :
                              order.orderStatus === "pending" ? "select-warning" :
                              "select-info"
                            }`}
                            disabled={order.orderStatus === "delivered" || order.orderStatus === "cancelled"}
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="preparing">Preparing</option>
                            <option value="out_for_delivery">Out for Delivery</option>
                            <option value="delivered">Delivered</option>
                          </select>

                          {order.orderStatus === "delivered" && (
                            <div className="mt-2">
                              <div className="text-xs text-gray-500 mb-1">Payment</div>
                              <select
                                value={order.paymentStatus || "pending"}
                                onChange={(e) => updateOrderPaymentStatus(order._id, e.target.value)}
                                className={`select select-bordered select-xs w-full ${
                                  order.paymentStatus === "paid" ? "select-success" : "select-warning"
                                }`}
                                disabled={order.paymentStatus === "paid"}
                              >
                                <option value="pending">Payment pending</option>
                                <option value="paid">Paid</option>
                              </select>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="text-sm">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              className="btn btn-sm btn-outline gap-1"
                              title="View Order Details"
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowOrderDetailsModal(true);
                              }}
                            >
                              <Eye className="size-4" />
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lab Report Details Modal */}
      {showLabReportDetailsModal && selectedLabReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-xl font-bold">Lab Report Details</h3>
                <div className="text-sm text-gray-500 font-mono">
                  {selectedLabReport.reportNumber || selectedLabReport._id}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowLabReportDetailsModal(false);
                  setSelectedLabReport(null);
                }}
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-base-200 rounded-lg p-4">
                  <div className="text-sm text-gray-500">Patient</div>
                  <div className="font-semibold">{selectedLabReport.patient?.fullName || "Unknown"}</div>
                  <div className="text-sm text-gray-600">{selectedLabReport.patient?.email || ""}</div>
                  <div className="text-sm text-gray-600">{selectedLabReport.patient?.phone || ""}</div>
                </div>
                <div className="bg-base-200 rounded-lg p-4">
                  <div className="text-sm text-gray-500">Booking</div>
                  <div className="font-semibold">#{selectedLabReport.labBooking?.bookingNumber || "N/A"}</div>
                  <div className="text-sm text-gray-600">
                    {selectedLabReport.labBooking?.appointmentDate
                      ? new Date(selectedLabReport.labBooking.appointmentDate).toLocaleString()
                      : ""}
                  </div>
                </div>
                <div className="bg-base-200 rounded-lg p-4">
                  <div className="text-sm text-gray-500">Report Date</div>
                  <div className="font-semibold">
                    {selectedLabReport.reportDate ? new Date(selectedLabReport.reportDate).toLocaleString() : ""}
                  </div>
                </div>
                <div className="bg-base-200 rounded-lg p-4">
                  <div className="text-sm text-gray-500">Status</div>
                  <div className="font-semibold">{String(selectedLabReport.overallStatus || "").toUpperCase()}</div>
                </div>
              </div>

              <div>
                <div className="font-semibold mb-2">Test Results</div>
                {Array.isArray(selectedLabReport.testResults) && selectedLabReport.testResults.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra">
                      <thead>
                        <tr>
                          <th>Test</th>
                          <th>Result</th>
                          <th>Unit</th>
                          <th>Range</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedLabReport.testResults.map((tr, idx) => (
                          <tr key={idx}>
                            <td>
                              <div className="font-medium">{tr.testName}</div>
                              <div className="text-xs text-gray-500">{tr.testCode}</div>
                            </td>
                            <td>{tr.result}</td>
                            <td>{tr.unit || "-"}</td>
                            <td>{tr.normalRange || "-"}</td>
                            <td>{String(tr.status || "").toUpperCase()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No test results available.</div>
                )}
              </div>

              {(selectedLabReport.additionalNotes || selectedLabReport.testedBy || selectedLabReport.verifiedBy) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-base-200 rounded-lg p-4">
                    <div className="text-sm text-gray-500">Tested By</div>
                    <div className="font-semibold">{selectedLabReport.testedBy?.name || ""}</div>
                    <div className="text-sm text-gray-600">{selectedLabReport.testedBy?.designation || ""}</div>
                  </div>
                  <div className="bg-base-200 rounded-lg p-4">
                    <div className="text-sm text-gray-500">Verified By</div>
                    <div className="font-semibold">{selectedLabReport.verifiedBy?.name || ""}</div>
                    <div className="text-sm text-gray-600">{selectedLabReport.verifiedBy?.designation || ""}</div>
                  </div>
                </div>
              )}

              {selectedLabReport.additionalNotes && (
                <div>
                  <div className="font-semibold mb-2">Additional Notes</div>
                  <div className="bg-base-200 rounded-lg p-4 text-sm whitespace-pre-wrap">
                    {selectedLabReport.additionalNotes}
                  </div>
                </div>
              )}

              {Array.isArray(selectedLabReport.reportFiles) && selectedLabReport.reportFiles.length > 0 && (
                <div>
                  <div className="font-semibold mb-2">Files</div>
                  <div className="space-y-2">
                    {selectedLabReport.reportFiles.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-base-200 rounded-lg p-3">
                        <div>
                          <div className="font-medium text-sm">{f.fileName || `File ${idx + 1}`}</div>
                          <div className="text-xs text-gray-500">{String(f.fileType || "").toUpperCase()}</div>
                        </div>
                        {f.fileUrl ? (
                          <a
                            href={f.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline"
                          >
                            Open
                          </a>
                        ) : (
                          <span className="text-xs text-gray-500">No URL</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Lab Report Modal */}
      {showEditLabReportModal && selectedLabReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-xl font-bold">Edit Lab Report</h3>
                <div className="text-sm text-gray-500 font-mono">
                  {selectedLabReport.reportNumber || selectedLabReport._id}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEditLabReportModal(false);
                }}
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="Close"
                disabled={isUpdatingLabReport}
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text font-medium">Overall Status</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={labReportEditForm.overallStatus}
                    onChange={(e) =>
                      setLabReportEditForm((p) => ({ ...p, overallStatus: e.target.value }))
                    }
                  >
                    <option value="normal">NORMAL</option>
                    <option value="abnormal">ABNORMAL</option>
                    <option value="pending_review">PENDING_REVIEW</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="label cursor-pointer gap-3">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={labReportEditForm.isReportReady}
                      onChange={(e) =>
                        setLabReportEditForm((p) => ({ ...p, isReportReady: e.target.checked }))
                      }
                    />
                    <span className="label-text font-medium">Report Ready</span>
                  </label>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text font-medium">Tested By (Name)</span>
                  </label>
                  <input
                    className="input input-bordered w-full"
                    value={labReportEditForm.testedByName}
                    onChange={(e) =>
                      setLabReportEditForm((p) => ({ ...p, testedByName: e.target.value }))
                    }
                    placeholder="Lab Technician"
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text font-medium">Tested By (Designation)</span>
                  </label>
                  <input
                    className="input input-bordered w-full"
                    value={labReportEditForm.testedByDesignation}
                    onChange={(e) =>
                      setLabReportEditForm((p) => ({ ...p, testedByDesignation: e.target.value }))
                    }
                    placeholder="Lab Technician"
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text font-medium">Verified By (Name)</span>
                  </label>
                  <input
                    className="input input-bordered w-full"
                    value={labReportEditForm.verifiedByName}
                    onChange={(e) =>
                      setLabReportEditForm((p) => ({ ...p, verifiedByName: e.target.value }))
                    }
                    placeholder="Pathologist"
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text font-medium">Verified By (Designation)</span>
                  </label>
                  <input
                    className="input input-bordered w-full"
                    value={labReportEditForm.verifiedByDesignation}
                    onChange={(e) =>
                      setLabReportEditForm((p) => ({ ...p, verifiedByDesignation: e.target.value }))
                    }
                    placeholder="Pathologist"
                  />
                </div>
              </div>

              <div>
                <label className="label">
                  <span className="label-text font-medium">Additional Notes</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full min-h-[120px]"
                  value={labReportEditForm.additionalNotes}
                  onChange={(e) =>
                    setLabReportEditForm((p) => ({ ...p, additionalNotes: e.target.value }))
                  }
                  placeholder="Add notes..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">Test Results</div>
                  <div className="text-xs text-gray-500">Edit result/unit/range/status/remarks</div>
                </div>
                {Array.isArray(labReportEditForm.testResults) && labReportEditForm.testResults.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra">
                      <thead>
                        <tr>
                          <th>Test</th>
                          <th>Result</th>
                          <th>Unit</th>
                          <th>Range</th>
                          <th>Status</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {labReportEditForm.testResults.map((tr, idx) => (
                          <tr key={idx}>
                            <td>
                              <div className="font-medium">{tr.testName}</div>
                              <div className="text-xs text-gray-500">{tr.testCode}</div>
                            </td>
                            <td>
                              <input
                                className="input input-bordered input-sm w-full"
                                value={tr.result || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setLabReportEditForm((p) => {
                                    const next = [...p.testResults];
                                    next[idx] = { ...next[idx], result: value };
                                    return { ...p, testResults: next };
                                  });
                                }}
                              />
                            </td>
                            <td>
                              <input
                                className="input input-bordered input-sm w-full"
                                value={tr.unit || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setLabReportEditForm((p) => {
                                    const next = [...p.testResults];
                                    next[idx] = { ...next[idx], unit: value };
                                    return { ...p, testResults: next };
                                  });
                                }}
                              />
                            </td>
                            <td>
                              <input
                                className="input input-bordered input-sm w-full"
                                value={tr.normalRange || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setLabReportEditForm((p) => {
                                    const next = [...p.testResults];
                                    next[idx] = { ...next[idx], normalRange: value };
                                    return { ...p, testResults: next };
                                  });
                                }}
                              />
                            </td>
                            <td>
                              <select
                                className="select select-bordered select-sm w-full"
                                value={tr.status || "normal"}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setLabReportEditForm((p) => {
                                    const next = [...p.testResults];
                                    next[idx] = { ...next[idx], status: value };
                                    return { ...p, testResults: next };
                                  });
                                }}
                              >
                                <option value="normal">NORMAL</option>
                                <option value="abnormal">ABNORMAL</option>
                                <option value="borderline">BORDERLINE</option>
                                <option value="critical">CRITICAL</option>
                              </select>
                            </td>
                            <td>
                              <input
                                className="input input-bordered input-sm w-full"
                                value={tr.remarks || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setLabReportEditForm((p) => {
                                    const next = [...p.testResults];
                                    next[idx] = { ...next[idx], remarks: value };
                                    return { ...p, testResults: next };
                                  });
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No test results to edit.</div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowEditLabReportModal(false)}
                  disabled={isUpdatingLabReport}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveLabReportEdits}
                  disabled={isUpdatingLabReport}
                >
                  {isUpdatingLabReport ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 text-base-content rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-xl font-bold">Order Details</h3>
                <div className="text-sm text-gray-500 font-mono">
                  #{selectedOrder.orderNumber || selectedOrder._id}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowOrderDetailsModal(false);
                  setSelectedOrder(null);
                }}
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-base-200 rounded-lg p-4">
                  <div className="text-sm text-gray-500">Customer</div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="avatar">
                      <div className="relative bg-neutral text-neutral-content rounded-full w-10 h-10 flex items-center justify-center overflow-hidden">
                        <span className="text-sm">
                          {selectedOrder.user?.fullName?.charAt(0) || "?"}
                        </span>
                        {selectedOrder.user?.profilePic ? (
                          <img
                            src={selectedOrder.user.profilePic}
                            alt={selectedOrder.user?.fullName ? `${selectedOrder.user.fullName} profile` : "Customer profile"}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold">{selectedOrder.user?.fullName || "Unknown"}</div>
                      <div className="text-sm text-gray-600">{selectedOrder.user?.email || ""}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-base-200 rounded-lg p-4">
                  <div className="text-sm text-gray-500">Status</div>
                  <div className="font-semibold">{String(selectedOrder.orderStatus || "pending").toUpperCase()}</div>
                  <div className="text-sm text-gray-600">
                    {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : ""}
                  </div>
                </div>
                <div className="bg-base-200 rounded-lg p-4">
                  <div className="text-sm text-gray-500">Payment</div>
                  <div className="font-semibold">{String(selectedOrder.paymentMethod || "").replace(/_/g, " ")}</div>
                  <div className="text-sm text-gray-600">{String(selectedOrder.paymentStatus || "pending").toUpperCase()}</div>

                  {(selectedOrder.orderStatus === "delivered") && (
                    <div className="mt-2">
                      <select
                        value={selectedOrder.paymentStatus || "pending"}
                        onChange={(e) => {
                          const next = e.target.value;
                          updateOrderPaymentStatus(selectedOrder._id, next);
                          setSelectedOrder((prev) => (prev ? { ...prev, paymentStatus: next } : prev));
                        }}
                        className={`select select-bordered select-sm w-full ${
                          selectedOrder.paymentStatus === "paid" ? "select-success" : "select-warning"
                        }`}
                        disabled={selectedOrder.paymentStatus === "paid"}
                      >
                        <option value="pending">Payment pending</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="bg-base-200 rounded-lg p-4">
                  <div className="text-sm text-gray-500">Total</div>
                  {(() => {
                    const items = Array.isArray(selectedOrder?.items) ? selectedOrder.items : [];
                    const itemsSubtotal = items.reduce((sum, it) => {
                      const qty = Number(it?.quantity || 0);
                      const unitPrice = Number(it?.price ?? it?.medicine?.discountPrice ?? it?.medicine?.price ?? 0);
                      const safeUnitPrice = Number.isFinite(unitPrice) ? unitPrice : 0;
                      return sum + qty * safeUnitPrice;
                    }, 0);

                    const subtotal = Number.isFinite(Number(selectedOrder?.subtotal))
                      ? Number(selectedOrder.subtotal)
                      : itemsSubtotal;
                    const deliveryFee = Number(selectedOrder?.deliveryFee || 0);
                    const discount = Number(selectedOrder?.discount || 0);
                    const computedTotal = subtotal + deliveryFee - discount;

                    return (
                      <>
                        <div className="font-semibold">৳{computedTotal.toFixed(2)}</div>
                        <div className="text-sm text-gray-600">
                          Subtotal: ৳{subtotal.toFixed(2)}
                          {deliveryFee ? ` + ৳${deliveryFee.toFixed(2)} delivery` : ""}
                          {discount ? ` - ৳${discount.toFixed(2)} discount` : ""}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {selectedOrder.deliveryAddress && (
                <div>
                  <div className="font-semibold mb-2">Delivery Address</div>
                  <div className="bg-base-200 rounded-lg p-4 text-sm">
                    <div className="font-medium">{selectedOrder.deliveryAddress.fullName}</div>
                    <div>{selectedOrder.deliveryAddress.phone}</div>
                    <div>{selectedOrder.deliveryAddress.address}</div>
                    <div>
                      {selectedOrder.deliveryAddress.city}{selectedOrder.deliveryAddress.state ? `, ${selectedOrder.deliveryAddress.state}` : ""} {selectedOrder.deliveryAddress.zipCode || ""}
                    </div>
                    {selectedOrder.deliveryAddress.landmark && (
                      <div className="text-gray-600">Landmark: {selectedOrder.deliveryAddress.landmark}</div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <div className="font-semibold mb-2">Items</div>
                {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra">
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Qty</th>
                          <th>Price</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.map((it, idx) => (
                          <tr key={idx}>
                            <td>
                              <div className="font-medium">{it.name || it.medicine?.name || "Unknown"}</div>
                              {it.medicine?.brand && <div className="text-xs text-gray-500">{it.medicine.brand}</div>}
                            </td>
                            <td>{Number(it?.quantity || 0)}</td>
                            <td>
                              {(() => {
                                const unitPrice = Number(it?.price ?? it?.medicine?.discountPrice ?? it?.medicine?.price ?? 0);
                                const safeUnitPrice = Number.isFinite(unitPrice) ? unitPrice : 0;
                                return `৳${safeUnitPrice.toFixed(2)}`;
                              })()}
                            </td>
                            <td>
                              {(() => {
                                const qty = Number(it?.quantity || 0);
                                const unitPrice = Number(it?.price ?? it?.medicine?.discountPrice ?? it?.medicine?.price ?? 0);
                                const safeUnitPrice = Number.isFinite(unitPrice) ? unitPrice : 0;
                                const total = qty * safeUnitPrice;
                                return `৳${total.toFixed(2)}`;
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No items.</div>
                )}
              </div>

              {selectedOrder.notes && (
                <div>
                  <div className="font-semibold mb-2">Notes</div>
                  <div className="bg-base-200 rounded-lg p-4 text-sm whitespace-pre-wrap">{selectedOrder.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Articles Tab Content */}
      {activeTab === "articles" && (
        <div className="bg-base-100 rounded-lg shadow p-6">
          {/* Articles Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Articles Management</h2>
            <div className="flex items-center gap-3">
              <button
                className={`btn btn-outline btn-sm ${isDiseaseStatsVisibilitySaving ? "loading" : ""}`}
                onClick={toggleDiseaseStatsVisibilityForUsers}
                disabled={isDiseaseStatsVisibilityLoading || isDiseaseStatsVisibilitySaving}
                type="button"
                title="Controls whether Disease Stats appear on the user Articles page"
              >
                {isDiseaseStatsVisible ? (
                  <>
                    <ToggleRight className="size-4" />
                    Hide Disease Stats
                  </>
                ) : (
                  <>
                    <ToggleLeft className="size-4" />
                    Show Disease Stats
                  </>
                )}
              </button>

              <div className="text-sm text-gray-500">Total Articles: {safeArticles.length}</div>
            </div>
          </div>

          {/* Disease Stats (Admin View) */}
          <div className="mb-6">
            <div className="card bg-base-200">
              <div className="card-body">
                {(() => {
                  const covidStats = adminDiseaseStats?.covid || adminDiseaseStats;
                  const malariaBDStats = adminDiseaseStats?.malariaBangladesh || null;
                  const measlesBDStats = adminDiseaseStats?.measlesBangladesh || null;
                  const rabiesBDDeathsStats = adminDiseaseStats?.rabiesBangladeshDeaths || null;

                  return (
                    <>
                <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="card-title flex items-center gap-2">
                        <span>COVID-19 Stats (Disease.sh)</span>
                        <span className="badge badge-info badge-sm">Global</span>
                      </h3>
                      <p className="text-sm text-base-content/70">Awareness info preview</p>
                    </div>
                  {covidStats?.updated ? (
                    <div className="text-xs text-base-content/60">
                      Updated: {new Date(covidStats.updated).toLocaleString("en-US")}
                    </div>
                  ) : null}
                </div>

                {isAdminDiseaseStatsLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="loading loading-spinner loading-sm"></span>
                    <span className="text-sm text-base-content/70">Loading stats...</span>
                  </div>
                ) : covidStats ? (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <div className="stat bg-base-100 rounded-lg">
                      <div className="stat-title">Cases</div>
                      <div className="stat-value text-xl">{Number(covidStats.cases || 0).toLocaleString("en-US")}</div>
                      <div className="stat-desc">Today: {Number(covidStats.todayCases || 0).toLocaleString("en-US")}</div>
                    </div>
                    <div className="stat bg-base-100 rounded-lg">
                      <div className="stat-title">Deaths</div>
                      <div className="stat-value text-xl">{Number(covidStats.deaths || 0).toLocaleString("en-US")}</div>
                      <div className="stat-desc">Today: {Number(covidStats.todayDeaths || 0).toLocaleString("en-US")}</div>
                    </div>
                    <div className="stat bg-base-100 rounded-lg">
                      <div className="stat-title">Recovered</div>
                      <div className="stat-value text-xl">{Number(covidStats.recovered || 0).toLocaleString("en-US")}</div>
                      <div className="stat-desc">Today: {Number(covidStats.todayRecovered || 0).toLocaleString("en-US")}</div>
                    </div>
                    <div className="stat bg-base-100 rounded-lg">
                      <div className="stat-title">Active</div>
                      <div className="stat-value text-xl">{Number(covidStats.active || 0).toLocaleString("en-US")}</div>
                      <div className="stat-desc">Critical: {Number(covidStats.critical || 0).toLocaleString("en-US")}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-base-content/70">Stats unavailable right now.</div>
                )}

                <div className="divider"></div>

                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">Bangladesh Disease Stats (WHO GHO)</h3>
                        <span className="badge badge-success badge-sm">Bangladesh</span>
                      </div>
                      <p className="text-sm text-base-content/70">Latest available (often annual)</p>
                    </div>
                  </div>

                  {isAdminDiseaseStatsLoading ? (
                    <div className="flex items-center gap-2">
                      <span className="loading loading-spinner loading-sm"></span>
                      <span className="text-sm text-base-content/70">Loading stats...</span>
                    </div>
                  ) : malariaBDStats || measlesBDStats || rabiesBDDeathsStats ? (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      {malariaBDStats ? (
                        <div className="stat bg-base-100 rounded-lg">
                          <div className="stat-title">Malaria cases</div>
                          <div className="stat-value text-xl">{Number(malariaBDStats.cases || 0).toLocaleString("en-US")}</div>
                          <div className="stat-desc">Year: {malariaBDStats.year ?? "—"}</div>
                        </div>
                      ) : null}

                      {measlesBDStats ? (
                        <div className="stat bg-base-100 rounded-lg">
                          <div className="stat-title">Measles cases</div>
                          <div className="stat-value text-xl">{Number(measlesBDStats.cases || 0).toLocaleString("en-US")}</div>
                          <div className="stat-desc">Year: {measlesBDStats.year ?? "—"}</div>
                        </div>
                      ) : null}

                      {rabiesBDDeathsStats ? (
                        <div className="stat bg-base-100 rounded-lg">
                          <div className="stat-title">Rabies deaths</div>
                          <div className="stat-value text-xl">{Number(rabiesBDDeathsStats.deaths || 0).toLocaleString("en-US")}</div>
                          <div className="stat-desc">Year: {rabiesBDDeathsStats.year ?? "—"}</div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-sm text-base-content/70">Stats unavailable right now.</div>
                  )}
                </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Articles List */}
          {isArticlesLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : safeArticles.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="size-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Articles Found</h3>
              <p className="text-gray-600">No articles have been submitted yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {safeArticles.map((article) => (
                    <tr key={article._id}>
                      <td>
                        <div className="max-w-xs">
                          <div className="font-semibold truncate">{article.title}</div>
                          <div className="text-sm text-gray-500 truncate">
                            {article.excerpt || (article.content ? `${article.content.substring(0, 80)}...` : "")}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="avatar placeholder">
                            <div className="bg-neutral text-neutral-content rounded-full w-8">
                              <span className="text-xs">
                                {article.authorModel === 'Doctor' 
                                  ? `Dr. ${article.authorDetails?.firstName?.[0] || 'D'}`
                                  : article.authorDetails?.fullName?.[0] || 'A'
                                }
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-sm">
                              {article.authorModel === 'Doctor' 
                                ? `Dr. ${article.authorDetails?.firstName} ${article.authorDetails?.lastName}`
                                : article.authorDetails?.fullName
                              }
                            </div>
                            <div className="text-xs text-gray-500">{article.authorModel}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm">
                          {new Date(article.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          {/* View Article */}
                          <a
                            href={`/articles/${article._id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-ghost gap-1"
                            title="View Article"
                          >
                            <Eye className="size-4" />
                          </a>

                          {/* Approve/Reject buttons for pending articles */}
                          {article.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleApproveArticle(article._id)}
                                className="btn btn-sm btn-success gap-1"
                                title="Approve Article"
                              >
                                <ThumbsUp className="size-4" />
                              </button>
                              <button
                                onClick={() => handleRejectArticle(article._id)}
                                className="btn btn-sm btn-error gap-1"
                                title="Reject Article"
                              >
                                <ThumbsDown className="size-4" />
                              </button>
                            </>
                          )}

                          {/* Delete button for all articles */}
                          <button
                            onClick={() => handleDeleteArticle(article._id)}
                            className="btn btn-sm btn-error gap-1"
                            title="Delete Article"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Doctor Sessions Tab Content */}
      {activeTab === "doctor-sessions" && (
        <div className="bg-base-100 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Doctor Login Sessions</h2>
            <div className="text-sm text-gray-500">Daily totals</div>
          </div>

          {isDoctorDailySessionsLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : safeDoctors.length === 0 ? (
            <div className="text-center py-12">
              <Stethoscope className="size-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Doctors Found</h3>
              <p className="text-gray-600">Add doctors to see sessions.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Specialization</th>
                    <th>Today Total</th>
                    <th>Status</th>
                    <th>Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {safeDoctors.map((doctor) => {
                    const session = doctorDailySessions?.[doctor._id];
                    const totalSeconds = Number(session?.totalSeconds || 0);
                    const isLoggedIn = !!session?.isCurrentlyLoggedIn;
                    const isExpanded = expandedDoctorId === doctor._id;
                    const historyLoading = !!doctorSessionsHistoryLoading?.[doctor._id];
                    const history = doctorSessionsHistory?.[doctor._id];

                    return (
                      <Fragment key={doctor._id}>
                        <tr key={doctor._id}>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="avatar">
                                <div className="mask mask-squircle w-10 h-10">
                                  <img
                                    src={doctor.profileImage || "/api/placeholder/40/40"}
                                    alt={doctor.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </div>
                              <div>
                                <div className="font-bold">{doctor.name}</div>
                                <div className="text-sm opacity-50">{doctor.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>{doctor.specialization}</td>
                          <td>
                            <div className="font-semibold">{formatDuration(totalSeconds)}</div>
                            {session?.dateKey && (
                              <div className="text-xs text-gray-500">{session.dateKey}</div>
                            )}
                          </td>
                          <td>
                            <div className={`badge ${isLoggedIn ? "badge-success" : "badge-ghost"}`}>
                              {isLoggedIn ? "Logged In" : "Logged Out"}
                            </div>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={async () => {
                                const next = isExpanded ? null : doctor._id;
                                setExpandedDoctorId(next);
                                if (!isExpanded && !Array.isArray(doctorSessionsHistory?.[doctor._id])) {
                                  await refreshDoctorSessionsExpanded(doctor._id);
                                }
                                if (!isExpanded) {
                                  await fetchDoctorDailySessionForDoctor(doctor._id);
                                }
                              }}
                            >
                              {isExpanded ? "Hide" : "View"}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr key={`${doctor._id}-expanded`}>
                            <td colSpan={5}>
                              <div className="bg-base-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="font-semibold">Sessions by day</div>
                                  <button
                                    className="btn btn-xs btn-ghost"
                                    onClick={async () => {
                                      await refreshDoctorSessionsExpanded(doctor._id);
                                    }}
                                  >
                                    Refresh
                                  </button>
                                </div>

                                {historyLoading ? (
                                  <div className="flex justify-center py-4">
                                    <span className="loading loading-spinner loading-md"></span>
                                  </div>
                                ) : Array.isArray(history) && history.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="table table-compact w-full">
                                      <thead>
                                        <tr>
                                          <th>Date</th>
                                          <th>Total</th>
                                          <th>Last Updated</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {history.map((h) => (
                                          <tr key={`${doctor._id}-${h._id || h.dateKey}`}
                                            className="bg-base-100"
                                          >
                                            <td>{h.dateKey}</td>
                                            <td className="font-semibold">{formatDuration(Number(h.totalSeconds || 0))}</td>
                                            <td className="text-sm text-gray-500">
                                              {h.lastUpdatedAt ? new Date(h.lastUpdatedAt).toLocaleString() : ""}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-600">No saved sessions yet for this doctor.</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Doctor Monthly Outcome Tab Content */}
      {activeTab === "doctor-monthly-outcome" && (
        <div className="bg-base-100 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">Outcome</h2>
              {outcomeView === "medicine" ? (
                <div className="text-sm text-gray-500">
                  Sold medicine history, totals, and profit ({Math.round(Number(medicineSoldOutcomeMeta?.profitRate || 0.03) * 100)}%)
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Completed patients, fees, outcome, and 15% commission
                  {doctorMonthlyOutcomeMeta?.month ? ` (${doctorMonthlyOutcomeMeta.month})` : ""}
                </div>
              )}
            </div>
            <div className="flex items-end gap-3">
              <div className="join">
                <button
                  type="button"
                  className={`btn btn-sm join-item ${outcomeView === "doctor" ? "btn-active" : ""}`}
                  onClick={() => setOutcomeView("doctor")}
                >
                  Doctor Monthly Outcome
                </button>
                <button
                  type="button"
                  className={`btn btn-sm join-item ${outcomeView === "medicine" ? "btn-active" : ""}`}
                  onClick={() => setOutcomeView("medicine")}
                >
                  Medicine sold outcome
                </button>
              </div>

              {outcomeView === "doctor" && (
                <div className="flex items-end gap-2">
                  <label className="form-control w-fit">
                    <div className="label py-0">
                      <span className="label-text text-sm text-gray-600">Month</span>
                    </div>
                    <select
                      className="select select-bordered select-sm"
                      value={selectedOutcomeMonthNumber}
                      onChange={(e) => setSelectedOutcomeMonthNumber(Number(e.target.value))}
                    >
                      <option value={1}>January</option>
                      <option value={2}>February</option>
                      <option value={3}>March</option>
                      <option value={4}>April</option>
                      <option value={5}>May</option>
                      <option value={6}>June</option>
                      <option value={7}>July</option>
                      <option value={8}>August</option>
                      <option value={9}>September</option>
                      <option value={10}>October</option>
                      <option value={11}>November</option>
                      <option value={12}>December</option>
                    </select>
                  </label>
                  <label className="form-control w-fit">
                    <div className="label py-0">
                      <span className="label-text text-sm text-gray-600">Year</span>
                    </div>
                    <select
                      className="select select-bordered select-sm"
                      value={selectedOutcomeYear}
                      onChange={(e) => setSelectedOutcomeYear(Number(e.target.value))}
                    >
                      {Array.from({ length: 7 }).map((_, idx) => {
                        const baseYear = new Date().getFullYear();
                        const y = baseYear - 5 + idx;
                        return (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>
              )}

              {outcomeView === "medicine" && (
                <div className="flex items-end gap-2">
                  <label className="form-control w-fit">
                    <div className="label py-0">
                      <span className="label-text text-sm text-gray-600">Month</span>
                    </div>
                    <select
                      className="select select-bordered select-sm"
                      value={selectedOutcomeMonthNumber}
                      onChange={(e) => setSelectedOutcomeMonthNumber(Number(e.target.value))}
                    >
                      <option value={1}>January</option>
                      <option value={2}>February</option>
                      <option value={3}>March</option>
                      <option value={4}>April</option>
                      <option value={5}>May</option>
                      <option value={6}>June</option>
                      <option value={7}>July</option>
                      <option value={8}>August</option>
                      <option value={9}>September</option>
                      <option value={10}>October</option>
                      <option value={11}>November</option>
                      <option value={12}>December</option>
                    </select>
                  </label>

                  <label className="form-control w-fit">
                    <div className="label py-0">
                      <span className="label-text text-sm text-gray-600">Metric</span>
                    </div>
                    <select
                      className="select select-bordered select-sm"
                      value={medicineOutcomeMetric}
                      onChange={(e) => setMedicineOutcomeMetric(e.target.value)}
                    >
                      <option value="amount">Sold amount (BDT)</option>
                      <option value="quantity">Sold quantity</option>
                    </select>
                  </label>
                  <label className="form-control w-fit">
                    <div className="label py-0">
                      <span className="label-text text-sm text-gray-600">Year</span>
                    </div>
                    <select
                      className="select select-bordered select-sm"
                      value={selectedOutcomeYear}
                      onChange={(e) => setSelectedOutcomeYear(Number(e.target.value))}
                    >
                      {Array.from({ length: 7 }).map((_, idx) => {
                        const baseYear = new Date().getFullYear();
                        const y = baseYear - 5 + idx;
                        return (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        );
                      })}
                    </select>
                  </label>

                  <div className="join">
                    <button
                      type="button"
                      className={`btn btn-sm join-item ${medicineOutcomeChartMode === "sold" ? "btn-active" : ""}`}
                      onClick={() => setMedicineOutcomeChartMode("sold")}
                    >
                      Sold only
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm join-item ${medicineOutcomeChartMode === "all" ? "btn-active" : ""}`}
                      onClick={() => setMedicineOutcomeChartMode("all")}
                    >
                      All medicines
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {outcomeView === "medicine" ? (
            isMedicineSoldOutcomeLoading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : (
              <>
                {medicineOutcomeChart.hasData && (
                  <div className="bg-base-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">
                        {medicineOutcomeChartMode === "all" ? "All medicines (sold amount)" : "Sold medicines"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {medicineOutcomeChart.totalMedicinesInChart} of {medicineOutcomeChart.totalMedicinesAll}
                      </div>
                    </div>
                    <div className="max-h-[650px] overflow-y-auto">
                      <Suspense fallback={<ChartLoadingPlaceholder />}>
                        <Chart
                          options={medicineOutcomeChart.options}
                          series={medicineOutcomeChart.series}
                          type="bar"
                          height={medicineOutcomeChart.chartHeight}
                        />
                      </Suspense>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="bg-base-200 rounded-lg p-4">
                    <div className="text-sm text-gray-500">Total sold (BDT)</div>
                    <div className="text-xl font-bold">
                      {Number(medicineSoldOutcomeTotals?.totalSoldAmount || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-base-200 rounded-lg p-4">
                    <div className="text-sm text-gray-500">
                      Profit ({Math.round(Number(medicineSoldOutcomeMeta?.profitRate || 0.03) * 100)}%)
                    </div>
                    <div className="text-xl font-bold">
                      {Number(medicineSoldOutcomeTotals?.profit || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-base-200 rounded-lg p-4">
                    <div className="text-sm text-gray-500">Total items sold</div>
                    <div className="text-xl font-bold">
                      {Number(medicineSoldOutcomeTotals?.totalSoldQuantity || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {Array.isArray(medicineSoldOutcomeItems) && medicineSoldOutcomeItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Date</th>
                          <th>Customer</th>
                          <th>Medicine</th>
                          <th>Qty</th>
                          <th>Price</th>
                          <th>Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {medicineSoldOutcomeItems.map((row, idx) => (
                          <tr key={`${row?.orderId || ""}-${row?.medicineId || ""}-${idx}`}>
                            <td className="font-medium">{row?.orderNumber || "—"}</td>
                            <td className="text-sm text-gray-600">
                              {row?.orderDate ? new Date(row.orderDate).toLocaleString() : ""}
                            </td>
                            <td>
                              <div className="text-sm font-medium">{row?.customer?.fullName || ""}</div>
                              <div className="text-xs text-gray-500">{row?.customer?.email || ""}</div>
                            </td>
                            <td className="font-medium">{row?.medicineName || ""}</td>
                            <td className="font-semibold">{Number(row?.quantity || 0)}</td>
                            <td className="font-semibold">{Number(row?.price || 0).toLocaleString()}</td>
                            <td className="font-semibold">{Number(row?.lineTotal || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">No sold medicine history found.</div>
                )}
              </>
            )
          ) : (
            isDoctorMonthlyOutcomeLoading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : safeDoctors.length === 0 ? (
              <div className="text-center py-12">
                <Stethoscope className="size-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Doctors Found</h3>
                <p className="text-gray-600">Add doctors to see monthly outcome.</p>
              </div>
            ) : (
              <>
                {doctorOutcomeChart.hasData && (
                  <div className="bg-base-200 rounded-lg p-4 mb-4">
                    <div className="font-semibold mb-2">Doctor outcome overview</div>
                    <Suspense fallback={<ChartLoadingPlaceholder />}>
                      <Chart
                        options={doctorOutcomeChart.options}
                        series={doctorOutcomeChart.series}
                        type="bar"
                        height={320}
                      />
                    </Suspense>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="bg-base-200 rounded-lg p-4">
                    <div className="text-sm text-gray-500">Total Hospital's Outcome</div>
                    <div className="text-xl font-bold">
                      {Number(doctorMonthlyOutcomeSummary?.outcome || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      ({Number(doctorMonthlyOutcomeSummary?.totalOutcome || 0).toLocaleString()} - {Number(
                        doctorMonthlyOutcomeSummary?.totalCommission || 0
                      ).toLocaleString()})
                    </div>
                    <div className="text-xs text-gray-500">(outcome - commission)</div>
                  </div>
                  <div className="bg-base-200 rounded-lg p-4">
                    <div className="text-sm text-gray-500">Expense</div>
                    <div className="text-xl font-bold">
                      {Number(doctorMonthlyOutcomeSummary?.expense || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="table table-zebra w-full">
                    <thead>
                      <tr>
                        <th>Doctor</th>
                        <th>Completed (month)</th>
                        <th>Fee</th>
                        <th>Outcome</th>
                        <th>Commission (15%)</th>
                        <th>Salary</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {safeDoctors.map((doctor) => {
                        const row = (doctorMonthlyOutcome || []).find(
                          (r) => String(r?.doctorId) === String(doctor._id)
                        );

                        const completedCount = Number(row?.completedCount || 0);
                        const fee = Number(row?.fee ?? doctor?.consultationFee ?? 0);
                        const totalOutcome = Number(row?.totalOutcome ?? completedCount * fee);
                        const commissionRate = Number(doctorMonthlyOutcomeMeta?.commissionRate || 0.15);
                        const commission = Number(row?.commission ?? totalOutcome * commissionRate);
                        const salary = Number(row?.salary ?? doctor?.salary ?? 0);
                        const totalSalaryForDoctor = salary + commission;

                        return (
                          <tr key={doctor._id}>
                            <td>
                              <div className="flex items-center gap-3">
                                <div className="avatar">
                                  <div className="mask mask-squircle w-10 h-10">
                                    <img
                                      src={doctor.profileImage || "/api/placeholder/40/40"}
                                      alt={doctor.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <div className="font-bold">{doctor.name}</div>
                                  <div className="text-sm opacity-50">{doctor.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="font-semibold">{completedCount}</td>
                            <td className="font-semibold">{fee.toLocaleString()}</td>
                            <td className="font-semibold">{totalOutcome.toLocaleString()}</td>
                            <td className="font-semibold">{commission.toLocaleString()}</td>
                            <td className="font-semibold">{salary.toLocaleString()}</td>
                            <td className="font-semibold">{totalSalaryForDoctor.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )
          )}
        </div>
      )}

      {/* Doctor Salary Tab Content */}
      {activeTab === "doctor-salary" && (
        <div className="bg-base-100 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">Doctor Salary</h2>
              <div className="text-sm text-gray-500">Set or edit salary for each doctor</div>
            </div>
          </div>

          {safeDoctors.length === 0 ? (
            <div className="text-center py-12">
              <Stethoscope className="size-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Doctors Found</h3>
              <p className="text-gray-600">Add doctors to set salaries.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Current Salary</th>
                    <th>Set / Edit Salary</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {safeDoctors.map((doctor) => {
                    const saving = !!doctorSalarySaving?.[doctor._id];
                    const currentSalary =
                      doctor?.salary !== undefined && doctor?.salary !== null
                        ? Number(doctor.salary)
                        : 0;

                    return (
                      <tr key={doctor._id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="avatar">
                              <div className="mask mask-squircle w-10 h-10">
                                <img
                                  src={doctor.profileImage || "/api/placeholder/40/40"}
                                  alt={doctor.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                            <div>
                              <div className="font-bold">{doctor.name}</div>
                              <div className="text-sm opacity-50">{doctor.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="font-semibold">{currentSalary.toLocaleString()}</td>

                        <td>
                          <input
                            type="number"
                            min={0}
                            className="input input-bordered input-sm w-40"
                            value={doctorSalaryDrafts?.[doctor._id] ?? ""}
                            onChange={(e) =>
                              setDoctorSalaryDrafts((prev) => ({
                                ...prev,
                                [doctor._id]: e.target.value,
                              }))
                            }
                          />
                        </td>

                        <td>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => saveDoctorSalary(doctor._id)}
                            disabled={saving}
                          >
                            {saving ? "Saving..." : "Save"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Lab Report Modal */}
      <CreateLabReportModal
        isOpen={showCreateReportModal}
        onClose={() => setShowCreateReportModal(false)}
        labBookings={labBookings}
        onSuccess={() => {
          setShowCreateReportModal(false);
          fetchLabReports(); // Refresh the reports list
        }}
      />

      {/* Add Medicine Modal */}
      <AddMedicineModal
        isOpen={showAddMedicineModal}
        onClose={() => {
          setShowAddMedicineModal(false);
          setEditingMedicine(null);
        }}
        medicine={editingMedicine}
        onMedicineCreated={handleCreateMedicineSuccess}
      />

      {/* Doctor Created Success Modal */}
      <DoctorCreatedModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setCreatedDoctor(null);
        }}
        doctor={createdDoctor}
      />
    </div>
  );
};

export default AdminDashboard;
