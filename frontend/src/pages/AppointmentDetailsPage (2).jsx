import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAppointmentStore } from "../store/useAppointmentStore";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Stethoscope,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  FileText,
  Pill,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

const AppointmentDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAppointmentById, cancelAppointment, isLoading } = useAppointmentStore();
  
  const [appointment, setAppointment] = useState(null);

  useEffect(() => {
    const fetchAppointment = async () => {
      const appointmentData = await getAppointmentById(id);
      setAppointment(appointmentData);
    };

    if (id) {
      fetchAppointment();
    }
  }, [id, getAppointmentById]);

  const handleCancelAppointment = async () => {
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      await cancelAppointment(id);
      navigate("/appointments");
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "pending":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "cancelled":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "completed":
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case "no-show":
        return <XCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
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
      <span className={`badge ${statusStyles[status]} badge-lg`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const statusStyles = {
      pending: "badge-warning",
      paid: "badge-success",
      refunded: "badge-info",
    };

    return (
      <span className={`badge ${statusStyles[status]} badge-sm`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
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
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Appointment not found</h3>
          <p className="text-gray-500 mb-6">The appointment you're looking for doesn't exist.</p>
          <Link to="/appointments" className="btn btn-primary">
            Back to Appointments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate("/appointments")}
          className="btn btn-ghost btn-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-800">Appointment Details</h1>
          <p className="text-gray-600">View and manage your appointment</p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon(appointment.status)}
          {getStatusBadge(appointment.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Doctor Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Doctor Information
            </h2>
            <div className="flex items-start gap-4">
              <div className="avatar">
                <div className="w-20 h-20 rounded-full">
                  {appointment.doctor.profileImage ? (
                    <img 
                      src={appointment.doctor.profileImage} 
                      alt={appointment.doctor.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="bg-primary/10 flex items-center justify-center w-full h-full">
                      <User className="w-10 h-10 text-primary" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Dr. {appointment.doctor.name}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Stethoscope className="w-4 h-4" />
                    <span>{appointment.doctor.specialization}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>{appointment.doctor.qualification}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{appointment.doctor.experience} years experience</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Appointment Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Appointment Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p className="text-gray-800">{formatDate(appointment.appointmentDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Time</label>
                  <p className="text-gray-800">{formatTime(appointment.appointmentTime)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Duration</label>
                  <p className="text-gray-800">{appointment.duration} minutes</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(appointment.status)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Booking Date</label>
                  <p className="text-gray-800">
                    {new Date(appointment.createdAt).toLocaleDateString("en-US")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Appointment ID</label>
                  <p className="text-gray-800 font-mono text-sm">{appointment._id}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reason for Visit */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Reason for Visit
            </h2>
            <p className="text-gray-700 leading-relaxed">{appointment.reason}</p>
          </div>

          {/* Notes and Prescription (if available) */}
          {(appointment.notes || appointment.prescription) && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Medical Information
              </h2>
              {appointment.notes && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-500">Doctor's Notes</label>
                  <p className="text-gray-700 mt-1 p-3 bg-gray-50 rounded-md">
                    {appointment.notes}
                  </p>
                </div>
              )}
              {appointment.prescription && (
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Pill className="w-4 h-4" />
                    Prescription
                  </label>
                  <p className="text-gray-700 mt-1 p-3 bg-blue-50 rounded-md">
                    {appointment.prescription}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Payment Information
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Consultation Fee:</span>
                <span className="text-xl font-semibold text-primary">
                  ${appointment.fees}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Status:</span>
                {getPaymentStatusBadge(appointment.paymentStatus)}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="space-y-3">
              {appointment.status === "pending" && (
                <>
                  <Link
                    to={`/appointments/${appointment._id}/reschedule`}
                    className="btn btn-outline btn-warning w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reschedule
                  </Link>
                  <button
                    onClick={handleCancelAppointment}
                    className="btn btn-outline btn-error w-full"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Appointment
                  </button>
                </>
              )}
              
              {appointment.status === "confirmed" && (
                <div className="alert alert-info">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">
                    Your appointment is confirmed. Please arrive 15 minutes early.
                  </span>
                </div>
              )}
              
              {appointment.status === "completed" && (
                <Link
                  to="/book-appointment"
                  className="btn btn-primary w-full"
                >
                  Book Another Appointment
                </Link>
              )}
            </div>
          </div>

          {/* Clinic Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Clinic Information</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">123 Medical Center Drive</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4" />
                <span className="text-sm">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                <span className="text-sm">info@clinic.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetailsPage;
