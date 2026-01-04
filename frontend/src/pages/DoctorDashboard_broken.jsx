import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import toast from "react-hot-toast";

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { doctorUser, logout, isLoggingOut, checkAuth, isCheckingAuth } = useDoctorAuthStore();
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
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    // Check authentication status when component mounts
    checkAuth();
  }, []);

  useEffect(() => {
    if (doctorUser) {
      try {
        fetchStats();
      } catch (error) {
        console.error("Error fetching stats:", error);
        toast.error("Failed to load dashboard data");
      }
    }
  }, [doctorUser]);

  useEffect(() => {
    if (doctorUser) {
      try {
        fetchAppointments(statusFilter);
      } catch (error) {
        console.error("Error fetching appointments:", error);
        toast.error("Failed to load appointments");
      }
    }
  }, [statusFilter, doctorUser]);

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

  const getStatusBadge = (status, doctorResponse) => {
    if (status === "completed") return <div className="badge badge-success">Completed</div>;
    if (status === "confirmed") return <div className="badge badge-info">Confirmed</div>;
    if (status === "rejected") return <div className="badge badge-error">Rejected</div>;
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

  // Ensure appointments is always an array to prevent map errors
  const safeAppointments = Array.isArray(appointments) ? appointments : [];

  console.log("Doctor Dashboard debug:", {
    doctorUser,
    appointments,
    safeAppointments,
    stats,
    statusFilter,
    isLoading
  });

  if (isCheckingAuth || isLoading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-gray-600">Loading doctor dashboard...</p>
        </div>
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
      {/* Simple Header with Logout */}
      <div className="bg-white shadow-md border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side */}
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-blue-600">Doctor Dashboard</h1>
              {doctorUser?.doctor && (
                <div className="hidden md:block">
                  <p className="text-sm text-gray-600">
                    Welcome, Dr. {doctorUser.doctor.name} | {doctorUser.doctor.specialization}
                  </p>
                </div>
              )}
            </div>
            
            {/* Right side - Logout */}
            <div className="flex items-center space-x-4">
              {doctorUser?.doctor?.fees && (
                <span className="text-sm text-gray-600 hidden md:block">
                  Fee: ৳{doctorUser.doctor.fees}
                </span>
              )}
              
              {/* Mobile Menu */}
              <div className="dropdown dropdown-end md:hidden">
                <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </div>
                <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
                  <li>
                    <button 
                      onClick={handleLogout} 
                      className="text-red-600 flex items-center gap-2"
                      disabled={isLoggingOut}
                    >
                      <LogOut className="size-4" />
                      {isLoggingOut ? "Logging out..." : "Logout"}
                    </button>
                  </li>
                </ul>
              </div>
              
              {/* Desktop Logout Button */}
              <button 
                onClick={handleLogout} 
                className="hidden md:flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 text-sm font-medium"
                disabled={isLoggingOut}
                title="Logout from doctor dashboard"
              >
                <LogOut className="size-4" />
                <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
              </button>
              
              {/* Always visible logout button for smaller screens */}
              <button 
                onClick={handleLogout} 
                className="md:hidden flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 text-sm"
                disabled={isLoggingOut}
                title="Logout"
              >
                <LogOut className="size-4" />
                <span className="sr-only">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="stat bg-base-100 rounded-lg shadow">
              <div className="stat-figure text-primary">
                <Calendar className="size-8" />
              </div>
              <div className="stat-title">Total Appointments</div>
              <div className="stat-value text-primary">{stats.total}</div>
            </div>
            
            <div className="stat bg-base-100 rounded-lg shadow">
              <div className="stat-figure text-warning">
                <Clock className="size-8" />
              </div>
              <div className="stat-title">Pending</div>
              <div className="stat-value text-warning">{stats.pending}</div>
            </div>
            
            <div className="stat bg-base-100 rounded-lg shadow">
              <div className="stat-figure text-info">
                <CheckCircle className="size-8" />
              </div>
              <div className="stat-title">Accepted</div>
              <div className="stat-value text-info">{stats.accepted}</div>
            </div>
            
            <div className="stat bg-base-100 rounded-lg shadow">
              <div className="stat-figure text-success">
                <Users className="size-8" />
              </div>
              <div className="stat-title">Completed</div>
              <div className="stat-value text-success">{stats.completed}</div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Filter className="size-5" />
            <select 
              className="select select-bordered"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Appointments</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Appointments List */}
        <div className="space-y-4">
          {safeAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="size-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
              <p className="text-gray-600">
                {statusFilter === "all" 
                  ? "You don't have any appointments yet." 
                  : `No ${statusFilter} appointments found.`
                }
              </p>
            </div>
          ) : (
            safeAppointments.map((appointment) => (
              <div key={appointment._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-lg font-semibold">
                        {appointment.patient?.fullName || appointment.guestPatient?.name || "Unknown Patient"}
                      </h3>
                        {getStatusBadge(appointment.status, appointment.doctorResponse)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="size-4 text-gray-500" />
                          <span>{formatDate(appointment.appointmentDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="size-4 text-gray-500" />
                          <span>{formatTime(appointment.appointmentTime)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="size-4 text-gray-500" />
                          <span>{appointment.patient?.email || appointment.guestPatient?.email || "No email"}</span>
                        </div>
                      </div>

                      {appointment.reason && (
                        <div className="mt-3">
                          <p className="text-gray-700">
                            <strong>Reason:</strong> {appointment.reason}
                          </p>
                        </div>
                      )}

                      {appointment.doctorNotes && (
                        <div className="mt-3">
                          <p className="text-gray-700">
                            <strong>Notes:</strong> {appointment.doctorNotes}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      {appointment.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRespond(appointment._id, "accepted")}
                            className="btn btn-success btn-sm"
                            disabled={isUpdating}
                          >
                            <CheckCircle className="size-4" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleRespond(appointment._id, "rejected")}
                            className="btn btn-error btn-sm"
                            disabled={isUpdating}
                          >
                            <XCircle className="size-4" />
                            Reject
                          </button>
                        </div>
                      )}

                      {appointment.status === "confirmed" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedAppointment(appointment._id);
                              setNotes(appointment.doctorNotes || "");
                            }}
                            className="btn btn-outline btn-sm"
                          >
                            <FileText className="size-4" />
                            Add Notes
                          </button>
                          <button
                            onClick={() => handleComplete(appointment._id)}
                            className="btn btn-primary btn-sm"
                            disabled={isUpdating}
                          >
                            Complete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Notes Modal */}
      {selectedAppointment && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Add Appointment Notes</h3>
            <textarea
              className="textarea textarea-bordered w-full h-32"
              placeholder="Enter your notes about this appointment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="modal-action">
              <button
                onClick={() => handleNotesUpdate(selectedAppointment)}
                className="btn btn-primary"
                disabled={isUpdating}
              >
                {isUpdating ? "Saving..." : "Save Notes"}
              </button>
              <button
                onClick={() => {
                  setSelectedAppointment(null);
                  setNotes("");
                }}
                className="btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
