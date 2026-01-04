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
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
              {doctorUser?.doctor && (
                <p className="mt-1 text-sm text-gray-600">
                  Welcome, Dr. {doctorUser.doctor.name} • {doctorUser.doctor.specialization}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {/* Logout Button - Very Prominent */}
              <button 
                onClick={handleLogout} 
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg flex items-center space-x-2 transition-colors"
                disabled={isLoggingOut}
              >
                <LogOut className="size-5" />
                <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
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

          {/* Filter */}
          <div className="mb-6 flex items-center">
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
          </div>

          {/* Appointments List */}
          <div className="space-y-4">
            {safeAppointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {statusFilter === "all" 
                    ? "You don't have any appointments yet." 
                    : `No ${statusFilter} appointments found.`
                  }
                </p>
              </div>
            ) : (
              safeAppointments.map((appointment) => (
                <div key={appointment._id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          {appointment.patient?.fullName || appointment.guestPatient?.name || "Unknown Patient"}
                        </h3>
                        {getStatusBadge(appointment.status, appointment.doctorResponse)}
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
                      {appointment.status === "pending" && (
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
