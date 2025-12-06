import { useEffect, useState } from "react";
import { useAppointmentStore } from "../store/useAppointmentStore";
import { 
  Calendar, 
  Clock, 
  User, 
  Stethoscope, 
  MapPin, 
  Phone,
  Filter,
  Plus,
  Eye,
  X,
  RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";

const AppointmentsPage = () => {
  const {
    appointments,
    isLoading,
    pagination,
    getUserAppointments,
    cancelAppointment,
  } = useAppointmentStore();

  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    getUserAppointments({ status: statusFilter, page: currentPage });
  }, [statusFilter, currentPage, getUserAppointments]);

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      await cancelAppointment(appointmentId);
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      pending: "badge-warning",
      confirmed: "badge-success",
      completed: "badge-info",
      cancelled: "badge-error",
      "no-show": "badge-error",
    };

    return (
      <span className={`badge ${statusStyles[status]} badge-sm`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">My Appointments</h1>
            <p className="text-gray-600">Manage your upcoming and past appointments</p>
          </div>
          <Link
            to="/book-appointment"
            className="btn bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 border-none mt-4 sm:mt-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Book New Appointment
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-700">Filter by Status:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", "pending", "confirmed", "completed", "cancelled"].map((status) => (
            <button
              key={status}
              onClick={() => handleStatusFilter(status)}
              className={`btn btn-sm ${
                statusFilter === status ? "btn-primary" : "btn-outline"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      {appointments.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No appointments found</h3>
          <p className="text-gray-500 mb-6">
            {statusFilter === "all" 
              ? "You haven't booked any appointments yet." 
              : `You don't have any ${statusFilter} appointments.`}
          </p>
          <Link to="/book-appointment" className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Book Your First Appointment
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div
              key={appointment._id}
              className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4">
                  <div className="flex items-center gap-4 mb-4 lg:mb-0">
                    <div className="avatar">
                      <div className="w-12 h-12 rounded-full">
                        {appointment.doctor.profileImage ? (
                          <img 
                            src={appointment.doctor.profileImage} 
                            alt={appointment.doctor.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="bg-primary/10 flex items-center justify-center w-full h-full">
                            <User className="w-6 h-6 text-primary" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-800">
                        Dr. {appointment.doctor.name}
                      </h3>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Stethoscope className="w-4 h-4" />
                        <span>{appointment.doctor.specialization}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    {getStatusBadge(appointment.status)}
                    <span className="text-lg font-semibold text-primary">
                      ৳{appointment.fees}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(appointment.appointmentDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(appointment.appointmentTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="font-medium">Duration:</span>
                    <span>{appointment.duration} minutes</span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-gray-700">
                    <span className="font-medium">Reason:</span> {appointment.reason}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/appointments/${appointment._id}`}
                    className="btn btn-sm btn-outline"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Details
                  </Link>
                  
                  {appointment.status === "pending" && (
                    <>
                      <Link
                        to={`/appointments/${appointment._id}/reschedule`}
                        className="btn btn-sm btn-outline btn-warning"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Reschedule
                      </Link>
                      <button
                        onClick={() => handleCancelAppointment(appointment._id)}
                        className="btn btn-sm btn-outline btn-error"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="join">
            <button
              className="join-item btn"
              disabled={!pagination.hasPrev}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </button>
            
            {Array.from({ length: pagination.totalPages }, (_, i) => (
              <button
                key={i + 1}
                className={`join-item btn ${
                  currentPage === i + 1 ? "btn-active" : ""
                }`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            
            <button
              className="join-item btn"
              disabled={!pagination.hasNext}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
