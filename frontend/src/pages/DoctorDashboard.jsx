import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users, 
  FileText,
  LogOut,
  Filter
} from "lucide-react";
import { useDoctorAuthStore } from "../store/useDoctorAuthStore";
import { useDoctorAppointmentStore } from "../store/useDoctorAppointmentStore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import DoctorReviews from "../components/DoctorReviews";

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { doctorUser, doctorSession, logout, isLoggingOut, checkAuth, isCheckingAuth } = useDoctorAuthStore();
  const { 
    appointments, 
    stats, 
    isLoading, 
    isUpdating,
    fetchAppointments, 
    fetchStats,
    respondToAppointment,
    updateNotes,
    completeAppointment
  } = useDoctorAppointmentStore();

  const [statusFilter, setStatusFilter] = useState("all");
  const [appointmentDateFilter, setAppointmentDateFilter] = useState("");
  const [isDateFilterEnabled, setIsDateFilterEnabled] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [notes, setNotes] = useState("");
  const [now, setNow] = useState(() => new Date());

  const [medicineSuggestions, setMedicineSuggestions] = useState([]);
  const [isMedicineSuggestionsLoading, setIsMedicineSuggestionsLoading] = useState(false);
  const [medicineSuggestionSearch, setMedicineSuggestionSearch] = useState("");

  const [isSalaryBoxHidden, setIsSalaryBoxHidden] = useState(() => {
    try {
      return window?.localStorage?.getItem("doctorSalaryBoxHidden") === "1";
    } catch {
      return false;
    }
  });

  const [isReviewsBoxHidden, setIsReviewsBoxHidden] = useState(() => {
    try {
      return window?.localStorage?.getItem("doctorReviewsBoxHidden") === "1";
    } catch {
      return false;
    }
  });

  const getOptimizedAvatarSrc = (src) => {
    const raw = typeof src === "string" ? src.trim() : "";
    if (!raw) return "";

    // Optimize Cloudinary images for crisp avatar rendering.
    // (Keeps non-Cloudinary URLs and data URLs unchanged.)
    if (raw.startsWith("data:")) return raw;
    if (raw.includes("res.cloudinary.com") && raw.includes("/upload/")) {
      return raw.replace(
        "/upload/",
        "/upload/c_fill,w_256,h_256,g_face,q_auto,f_auto/"
      );
    }

    return raw;
  };

  const [activeSection, setActiveSection] = useState(() => {
    try {
      const v = window?.localStorage?.getItem("doctorDashboardActiveSection");
      if (v === "reviews" || v === "appointments" || v === "translator") return v;
      return "appointments";
    } catch {
      return "appointments";
    }
  });

  // Translator box state (Apertium via backend proxy)
  const [translatorInput, setTranslatorInput] = useState("");
  const [translatorOutput, setTranslatorOutput] = useState("");
  const [translatorSource, setTranslatorSource] = useState("en");
  const [translatorTarget, setTranslatorTarget] = useState("es");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatorError, setTranslatorError] = useState("");

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const fetchMedicineSuggestions = async () => {
      try {
        setIsMedicineSuggestionsLoading(true);
        const response = await axiosInstance.get("/medicines", {
          params: {
            page: 1,
            limit: 50,
            inStock: true,
            sortBy: "name",
            sortOrder: "asc",
          },
        });

        setMedicineSuggestions(Array.isArray(response.data?.medicines) ? response.data.medicines : []);
      } catch (error) {
        setMedicineSuggestions([]);
        toast.error("Failed to load medicine suggestions");
        console.error("Error fetching medicine suggestions:", error?.response?.data || error);
      } finally {
        setIsMedicineSuggestionsLoading(false);
      }
    };

    // Fetch once when the notes modal opens (and only if we don't already have cached suggestions)
    if (selectedAppointment && medicineSuggestions.length === 0 && !isMedicineSuggestionsLoading) {
      fetchMedicineSuggestions();
    }

    // Reset search when opening/closing modal
    if (!selectedAppointment) {
      setMedicineSuggestionSearch("");
    }
  }, [selectedAppointment]);

  const insertMedicineIntoNotes = (medicine) => {
    const name = medicine?.name || "";
    if (!name) return;

    setNotes((prev) => {
      const prefix = prev && prev.trim().length > 0 ? "\n" : "";
      return `${prev}${prefix}Medicine: ${name}`;
    });
  };

  const formatDuration = (totalSeconds = 0) => {
    const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const lastLoginText = (() => {
    const d = doctorSession?.lastLogin || doctorUser?.lastLogin;
    if (!d) return "—";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleString();
  })();

  const currentSessionSeconds = (() => {
    const startedAt = doctorSession?.currentSessionStartedAt;
    if (!startedAt) return 0;
    const start = new Date(startedAt);
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
    return Math.max(0, diff);
  })();

  const totalTodaySeconds = (() => {
    const base = Number(doctorSession?.todayTotalSeconds || 0);
    return base + currentSessionSeconds;
  })();

  const salaryValue = (() => {
    const s = doctorUser?.doctor?.salary;
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  })();

  const salaryMessage = String(doctorUser?.doctor?.salaryLastMessage || "").trim();
  const salaryUpdatedAt = doctorUser?.doctor?.salaryLastUpdatedAt || null;

  // Use a stable key so periodic auth refresh doesn't re-trigger full dashboard reloads
  const doctorAuthId = doctorUser?._id || null;

  useEffect(() => {
    if (doctorAuthId) {
      try {
        fetchStats();
      } catch (error) {
        console.error("Error fetching stats:", error);
        toast.error("Failed to load dashboard data");
      }
    }
  }, [doctorAuthId]);

  // Periodically refresh doctor auth so salary updates appear without reload
  useEffect(() => {
    if (!doctorAuthId) return;

    const intervalId = setInterval(() => {
      try {
        checkAuth();
      } catch {
        // ignore
      }
    }, 60000);

    return () => clearInterval(intervalId);
  }, [doctorAuthId, checkAuth]);

  useEffect(() => {
    if (doctorAuthId) {
      try {
        fetchAppointments(statusFilter);
      } catch (error) {
        console.error("Error fetching appointments:", error);
        toast.error("Failed to load appointments");
      }
    }
  }, [statusFilter, doctorAuthId]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate("/doctor/login");
    } catch (error) {
      toast.error("Failed to logout");
      console.error("Logout error:", error);
    }
  };

  const handleRespond = async (appointmentId, response) => {
    // Convert frontend response to backend expected status
    const status = response === "accepted" ? "confirmed" : "rejected";
    const result = await respondToAppointment(appointmentId, status);
    if (result.success) {
      fetchStats(); // Refresh stats
      fetchAppointments(statusFilter); // Refresh appointments list
    }
  };

  const handleNotesUpdate = async (appointmentId) => {
    if (!notes.trim()) {
      toast.error("Please enter notes");
      return;
    }
    
    const result = await updateNotes(appointmentId, notes);
    if (result.success) {
      setSelectedAppointment(null);
      setNotes("");
    }
  };

  const handleComplete = async (appointmentId) => {
    const result = await completeAppointment(appointmentId);
    if (result.success) {
      fetchStats(); // Refresh stats
    }
  };

  const handleTranslate = async () => {
    const text = String(translatorInput || "").trim();
    if (!text) {
      toast.error("Enter text to translate");
      return;
    }

    if (!translatorTarget) {
      toast.error("Select a target language");
      return;
    }

    if (translatorSource === translatorTarget) {
      toast.error("Source and target languages must be different");
      return;
    }

    try {
      setIsTranslating(true);
      setTranslatorError("");

      const response = await axiosInstance.post("/external/translate", {
        q: text,
        source: translatorSource,
        target: translatorTarget,
        format: "text",
      });

      setTranslatorOutput(String(response.data?.translatedText || ""));
    } catch (error) {
      console.error("Translate error:", error?.response?.data || error);
      setTranslatorOutput("");
      setTranslatorError(error?.response?.data?.message || "Translation is unavailable right now.");
    } finally {
      setIsTranslating(false);
    }
  };

  const getStatusBadge = (status, doctorResponse) => {
    if (status === "completed") return <div className="badge badge-success">Completed</div>;
    if (status === "confirmed") return <div className="badge badge-info">Confirmed</div>;
    if (status === "rejected") return <div className="badge badge-error">Rejected</div>;
    if (status === "cancelled") return <div className="badge badge-error">Cancelled</div>;
    if (status === "no-show") return <div className="badge badge-error">No-show</div>;
    return <div className="badge badge-warning">Pending</div>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getAppointmentStartMs = (dateString, timeString) => {
    const d = String(dateString || "");
    const t = String(timeString || "");
    if (!d || !t) return null;

    const dateOnly = d.includes("T") ? d.slice(0, 10) : d;
    const dt = new Date(`${dateOnly}T${t}`);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.getTime();
  };

  const isAppointmentOverdue = (appointment) => {
    const status = String(appointment?.status || "").toLowerCase();
    if (["completed", "cancelled", "rejected", "no-show"].includes(status)) return false;

    const startMs = getAppointmentStartMs(appointment?.appointmentDate, appointment?.appointmentTime);
    if (!startMs) return false;

    return now.getTime() > startMs + 60 * 60 * 1000;
  };

  // Ensure appointments is always an array to prevent map errors
  const safeAppointments = Array.isArray(appointments) ? appointments : [];

  const filteredAppointments = safeAppointments.filter((appointment) => {
    if (!isDateFilterEnabled) return true;
    if (!appointmentDateFilter) return true;
    const d = String(appointment?.appointmentDate || "");
    if (!d) return false;
    const dateOnly = d.includes("T") ? d.slice(0, 10) : d.slice(0, 10);
    return dateOnly === appointmentDateFilter;
  });

  if (import.meta?.env?.DEV) {
    console.log("Doctor Dashboard debug:", {
      doctorUser,
      appointments,
      safeAppointments,
      stats,
      statusFilter,
      isLoading,
    });
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
        <span className="ml-4">Checking authentication...</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
        <span className="ml-4">Loading dashboard...</span>
      </div>
    );
  }

  if (!doctorUser) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Access Denied</h2>
          <p className="text-gray-600 mb-6">Please log in to access the doctor dashboard</p>
          <button 
            onClick={() => navigate("/doctor/login")} 
            className="btn btn-primary"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SIMPLE HEADER WITH PROMINENT LOGOUT */}
      <header className="bg-white shadow sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 min-h-[80px]">
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-widest truncate">
                Doctor Dashboard
              </div>

              {doctorUser?.doctor ? (
                <>
                  <div className="mt-1 flex items-center gap-4 min-w-0">
                    <div className="avatar flex-shrink-0">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 bg-white shadow-sm ring-2 ring-gray-100 ring-offset-2 ring-offset-white">
                        {doctorUser.doctor.profileImage ? (
                          <img
                            src={getOptimizedAvatarSrc(doctorUser.doctor.profileImage)}
                            alt={doctorUser.doctor.name ? `Dr. ${doctorUser.doctor.name} profile` : "Doctor profile"}
                            className="w-full h-full object-cover"
                            decoding="async"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-700 font-extrabold text-xl">
                            {String(doctorUser.doctor.name || "D").trim().slice(0, 1).toUpperCase() || "D"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-wide truncate">
                        Dr. {doctorUser.doctor.name}
                      </div>
                      <div className="text-base sm:text-xl font-bold text-gray-700 tracking-wide truncate">
                        {doctorUser.doctor.specialization}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-1 text-xl sm:text-2xl font-extrabold text-gray-900 tracking-wide truncate">
                  Doctor
                </div>
              )}
            </div>
            <div className="flex-shrink-0 ml-4 flex items-center gap-3">
              {/* Live Clock (top-right) */}
              <div className="hidden sm:flex items-center gap-3 px-5 py-3 border-2 border-gray-200 rounded-xl bg-white shadow-sm">
                <Clock
                  className="size-5 text-gray-500 transition-transform duration-200 ease-out"
                  style={{ transform: `rotate(${(now?.getSeconds?.() || 0) * 6}deg)` }}
                />
                <div className="font-mono text-base font-bold text-gray-900 tabular-nums">
                  {now.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </div>
              </div>

              {/* Session Info */}
              <div className="hidden md:flex flex-col px-4 py-2 border border-gray-200 rounded-lg bg-white min-w-[280px]">
                <div className="flex items-center justify-between gap-4 text-xs text-gray-500">
                  <span>Last login</span>
                  <span className="text-gray-900 font-medium truncate">{lastLoginText}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-xs text-gray-500 mt-1">
                  <span>Session</span>
                  <span className="font-mono text-gray-900">{formatDuration(currentSessionSeconds)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-xs text-gray-500 mt-1">
                  <span>Today total</span>
                  <span className="font-mono text-gray-900">{formatDuration(totalTodaySeconds)}</span>
                </div>
              </div>

              <div className="sm:hidden flex items-center gap-2 px-4 py-2 border-2 border-gray-200 rounded-xl bg-white shadow-sm">
                <Clock
                  className="size-5 text-gray-500 transition-transform duration-200 ease-out"
                  style={{ transform: `rotate(${(now?.getSeconds?.() || 0) * 6}deg)` }}
                />
                <div className="font-mono text-sm font-bold text-gray-900 tabular-nums">
                  {now.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              <Link
                to="/doctor/profile"
                className="bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3 px-5 rounded-lg border border-gray-200 transition-colors whitespace-nowrap"
              >
                Profile
              </Link>
              
              <button 
                onClick={handleLogout} 
                className="hidden sm:flex bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg items-center space-x-2 transition-colors whitespace-nowrap"
                disabled={isLoggingOut}
              >
                <LogOut className="size-5 flex-shrink-0" />
                <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
              </button>
              
              {/* Mobile Logout Button - Compact */}
              <button 
                onClick={handleLogout} 
                className="sm:hidden bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg flex items-center transition-colors"
                disabled={isLoggingOut}
                title="Logout"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Salary Info (fixed on large screens) */}
      <div className="hidden lg:block">
        {isSalaryBoxHidden ? (
          <button
            className="btn btn-sm btn-outline fixed right-6 top-36 z-40"
            onClick={() => {
              setIsSalaryBoxHidden(false);
              try {
                window?.localStorage?.setItem("doctorSalaryBoxHidden", "0");
              } catch {}
            }}
          >
            Show Salary
          </button>
        ) : (
          <div className="fixed right-6 top-36 z-40 w-80">
            <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-600">Salary</div>
                    <div className="text-2xl font-extrabold text-gray-900 mt-1">
                      {salaryValue.toLocaleString()}
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      setIsSalaryBoxHidden(true);
                      try {
                        window?.localStorage?.setItem("doctorSalaryBoxHidden", "1");
                      } catch {}
                    }}
                  >
                    Hide
                  </button>
                </div>

                {salaryMessage ? (
                  <div className="mt-2 text-sm text-gray-700">{salaryMessage}</div>
                ) : (
                  <div className="mt-2 text-sm text-gray-500">No salary updates yet.</div>
                )}

                {salaryUpdatedAt ? (
                  <div className="mt-2 text-xs text-gray-500">
                    Updated: {new Date(salaryUpdatedAt).toLocaleString()}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Salary Info (right side, hideable) */}
          <div className="lg:hidden flex justify-end mb-6">
            {isSalaryBoxHidden ? (
              <button
                className="btn btn-sm btn-outline"
                onClick={() => {
                  setIsSalaryBoxHidden(false);
                  try {
                    window?.localStorage?.setItem("doctorSalaryBoxHidden", "0");
                  } catch {}
                }}
              >
                Show Salary
              </button>
            ) : (
              <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 w-full sm:w-96">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-600">Salary</div>
                      <div className="text-2xl font-extrabold text-gray-900 mt-1">
                        {salaryValue.toLocaleString()}
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => {
                        setIsSalaryBoxHidden(true);
                        try {
                          window?.localStorage?.setItem("doctorSalaryBoxHidden", "1");
                        } catch {}
                      }}
                    >
                      Hide
                    </button>
                  </div>

                  {salaryMessage ? (
                    <div className="mt-2 text-sm text-gray-700">{salaryMessage}</div>
                  ) : (
                    <div className="mt-2 text-sm text-gray-500">No salary updates yet.</div>
                  )}

                  {salaryUpdatedAt ? (
                    <div className="mt-2 text-xs text-gray-500">
                      Updated: {new Date(salaryUpdatedAt).toLocaleString()}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Top section toggle */}
          <div className="mb-6 flex items-center justify-end">
            <div className="inline-flex rounded-lg border border-gray-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setActiveSection("appointments");
                  try {
                    window?.localStorage?.setItem("doctorDashboardActiveSection", "appointments");
                  } catch {
                    // ignore
                  }
                }}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${
                  activeSection === "appointments"
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Appointments
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSection("translator");
                  try {
                    window?.localStorage?.setItem("doctorDashboardActiveSection", "translator");
                  } catch {
                    // ignore
                  }
                }}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${
                  activeSection === "translator"
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Translator
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSection("reviews");
                  try {
                    window?.localStorage?.setItem("doctorDashboardActiveSection", "reviews");
                  } catch {
                    // ignore
                  }
                }}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${
                  activeSection === "reviews"
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Reviews & Feedback
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Calendar className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Appointments
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.total || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Clock className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Pending
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.pending || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Today
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.today || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Completed
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.completed || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "appointments" ? (
            <>
              {/* Filter */}
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Filter className="h-5 w-5 mr-2 text-gray-400" />
                <select
                  className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Appointments</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>

                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={isDateFilterEnabled}
                      onChange={(e) => setIsDateFilterEnabled(e.target.checked)}
                    />
                    Selected date
                  </label>
                  <input
                    type="date"
                    value={appointmentDateFilter}
                    onChange={(e) => setAppointmentDateFilter(e.target.value)}
                    disabled={!isDateFilterEnabled}
                    className="block w-48 pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  />
                </div>
              </div>

              {/* Appointments List */}
              <div className="space-y-4">
                {filteredAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {statusFilter === "all"
                        ? "You don't have any appointments yet."
                        : `No ${statusFilter} appointments found.`}
                    </p>
                  </div>
                ) : (
                  filteredAppointments.map((appointment) => (
                    <div key={appointment._id} className="bg-white shadow rounded-lg p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900">
                              {appointment.patient?.fullName || appointment.guestPatient?.name || "Unknown Patient"}
                            </h3>
                            <div className="flex items-center gap-2">
                              {isAppointmentOverdue(appointment) &&
                              String(appointment?.status || "").toLowerCase() === "pending" ? null : (
                                getStatusBadge(appointment.status, appointment.doctorResponse)
                              )}
                              {isAppointmentOverdue(appointment) && (
                                <div className="badge badge-error">Overdue</div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center text-gray-500">
                              <Calendar className="h-4 w-4 mr-1" />
                              <span>{formatDate(appointment.appointmentDate)}</span>
                            </div>
                            <div className="flex items-center text-gray-500">
                              <Clock className="h-4 w-4 mr-1" />
                              <span>{formatTime(appointment.appointmentTime)}</span>
                            </div>
                            <div className="flex items-center text-gray-500">
                              <Users className="h-4 w-4 mr-1" />
                              <span>{appointment.patient?.email || appointment.guestPatient?.email || "No email"}</span>
                            </div>
                          </div>

                          {appointment.reason && (
                            <div className="mt-3">
                              <p className="text-sm text-gray-700">
                                <strong>Reason:</strong> {appointment.reason}
                              </p>
                            </div>
                          )}

                          {appointment.notes && (
                            <div className="mt-3">
                              <p className="text-sm text-gray-700">
                                <strong>Notes:</strong> {appointment.notes}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="ml-6 flex flex-col space-y-2">
                          {appointment.status === "pending" && !isAppointmentOverdue(appointment) && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleRespond(appointment._id, "accepted")}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                disabled={isUpdating}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Accept
                              </button>
                              <button
                                onClick={() => handleRespond(appointment._id, "rejected")}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                disabled={isUpdating}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </button>
                            </div>
                          )}

                          {appointment.status === "confirmed" && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedAppointment(appointment._id);
                                  setNotes(appointment.notes || "");
                                }}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Add Notes
                              </button>
                              <button
                                onClick={() => handleComplete(appointment._id)}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                disabled={isUpdating}
                              >
                                Complete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : activeSection === "translator" ? (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Translator</h2>
                  <p className="text-sm text-gray-600">Powered by Apertium (via backend proxy)</p>
                  <p className="text-xs text-gray-500 mt-1">Note: Apertium public API supports limited language pairs (Bangla is not available).</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTranslatorInput("");
                    setTranslatorOutput("");
                    setTranslatorError("");
                  }}
                  className="btn btn-sm btn-ghost"
                >
                  Clear
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Input</label>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="7"
                    placeholder="Type text to translate..."
                    value={translatorInput}
                    onChange={(e) => setTranslatorInput(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Output</label>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 focus:outline-none"
                    rows="7"
                    value={translatorOutput}
                    readOnly
                    placeholder="Translation will appear here..."
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="block">
                    <div className="text-xs font-semibold text-gray-600 mb-1">From</div>
                    <select
                      className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      value={translatorSource}
                      onChange={(e) => setTranslatorSource(e.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                    </select>
                  </label>

                  <label className="block">
                    <div className="text-xs font-semibold text-gray-600 mb-1">To</div>
                    <select
                      className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      value={translatorTarget}
                      onChange={(e) => setTranslatorTarget(e.target.value)}
                    >
                      <option value="es">Spanish</option>
                      <option value="en">English</option>
                    </select>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  className="btn btn-primary sm:ml-auto"
                >
                  {isTranslating ? "Translating..." : "Translate"}
                </button>
              </div>

              {translatorError ? (
                <div className="mt-3 text-sm text-red-600">{translatorError}</div>
              ) : null}
            </div>
          ) : (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Reviews & Feedback</h2>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isReviewsBoxHidden;
                    setIsReviewsBoxHidden(next);
                    try {
                      window?.localStorage?.setItem("doctorReviewsBoxHidden", next ? "1" : "0");
                    } catch {
                      // ignore
                    }
                  }}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  {isReviewsBoxHidden ? "Show" : "Hide"}
                </button>
              </div>

              {isReviewsBoxHidden ? (
                <div className="bg-white shadow rounded-lg p-6 text-sm text-gray-600">
                  Reviews & Feedback is hidden.
                </div>
              ) : doctorUser?.doctor?._id ? (
                <DoctorReviews doctorId={doctorUser.doctor._id} showHelpfulButton={false} />
              ) : (
                <div className="bg-white shadow rounded-lg p-6 text-sm text-gray-600">
                  Doctor profile not found.
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Notes Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Appointment Notes</h3>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="4"
                placeholder="Enter your notes about this appointment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <div className="mt-4">
                <div className="text-sm font-semibold text-gray-900">Medicine Suggestions</div>
                <input
                  type="text"
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search medicines..."
                  value={medicineSuggestionSearch}
                  onChange={(e) => setMedicineSuggestionSearch(e.target.value)}
                />

                <div className="mt-2 max-h-40 overflow-auto border border-gray-200 rounded-md">
                  {isMedicineSuggestionsLoading ? (
                    <div className="p-3 text-sm text-gray-600">Loading suggestions...</div>
                  ) : (
                    (() => {
                      const q = medicineSuggestionSearch.trim().toLowerCase();
                      const filtered = (Array.isArray(medicineSuggestions) ? medicineSuggestions : [])
                        .filter((m) => {
                          if (!q) return true;
                          const name = String(m?.name || "").toLowerCase();
                          const brand = String(m?.brand || "").toLowerCase();
                          const generic = String(m?.genericName || "").toLowerCase();
                          return name.includes(q) || brand.includes(q) || generic.includes(q);
                        })
                        .slice(0, 10);

                      if (filtered.length === 0) {
                        return <div className="p-3 text-sm text-gray-600">No medicines found</div>;
                      }

                      return filtered.map((m) => (
                        <button
                          key={m._id}
                          type="button"
                          onClick={() => insertMedicineIntoNotes(m)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          title="Click to add to notes"
                        >
                          <div className="font-medium text-gray-900 truncate">{m.name}</div>
                          {(m.genericName || m.brand) && (
                            <div className="text-xs text-gray-600 truncate">
                              {m.genericName ? `Generic: ${m.genericName}` : m.brand ? `Brand: ${m.brand}` : ""}
                            </div>
                          )}
                        </button>
                      ));
                    })()
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => {
                    setSelectedAppointment(null);
                    setNotes("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleNotesUpdate(selectedAppointment)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={isUpdating}
                >
                  {isUpdating ? "Saving..." : "Save Notes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
