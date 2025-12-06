import { useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAppointmentStore } from "../store/useAppointmentStore";
import { useAuthStore } from "../store/useAuthStore";
import {
  User,
  Stethoscope,
  Star,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  ArrowLeft,
} from "lucide-react";

const DoctorProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  const { selectedDoctor, getDoctor, isLoading } = useAppointmentStore();

  useEffect(() => {
    if (id) {
      getDoctor(id);
    }
  }, [id, getDoctor]);

  const handleBookAppointment = () => {
    if (!authUser) {
      navigate("/login");
      return;
    }
    navigate(`/book-appointment?doctor=${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!selectedDoctor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-800">Doctor not found</h2>
          <Link to="/browse-doctors" className="btn btn-primary">
            Back to doctors
          </Link>
        </div>
      </div>
    );
  }

  const doctor = selectedDoctor;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: basic info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6 flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-blue-100">
                  {doctor.profileImage ? (
                    <img
                      src={doctor.profileImage}
                      alt={doctor.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="bg-blue-50 w-full h-full flex items-center justify-center">
                      <User className="w-10 h-10 text-blue-600" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  Dr. {doctor.name}
                </h1>
                <div className="flex items-center gap-2 text-blue-600">
                  <Stethoscope className="w-4 h-4" />
                  <span className="font-medium">{doctor.specialization}</span>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
                  {doctor.experience && (
                    <span>
                      Experience:{" "}
                      <span className="font-semibold">
                        {doctor.experience} years
                      </span>
                    </span>
                  )}
                  {doctor.consultationFee && (
                    <span>
                      Consultation fee:{" "}
                      <span className="font-semibold">
                        {doctor.consultationFee} BDT
                      </span>
                    </span>
                  )}
                </div>

                {doctor.bio && (
                  <p className="text-sm text-gray-600 mt-3">{doctor.bio}</p>
                )}

                <div className="flex flex-wrap gap-3 mt-4">
                  <button
                    onClick={handleBookAppointment}
                    className="btn btn-primary"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Book appointment
                  </button>
                  <Link to="/browse-doctors" className="btn btn-ghost">
                    View all doctors
                  </Link>
                </div>
              </div>
            </div>

            {/* Availability & location */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Weekly availability
                </h2>
                {doctor.availability && doctor.availability.length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {doctor.availability.map((slot, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center border-b last:border-b-0 py-2"
                      >
                        <span className="font-medium capitalize">
                          {slot.day}
                        </span>
                        <span className="text-gray-600">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    This doctor&apos;s schedule has not been configured yet.
                  </p>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6 space-y-3">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Contact & clinic
                </h2>
                {doctor.email && (
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <span>{doctor.email}</span>
                  </div>
                )}
                {doctor.phone && (
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <Phone className="w-4 h-4 text-emerald-500" />
                    <span>{doctor.phone}</span>
                  </div>
                )}
                {doctor.address && (
                  <div className="flex items-start gap-3 text-sm text-gray-700">
                    <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
                    <span>{doctor.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: simple stats */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                At a glance
              </h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <span>Typical visit length</span>
                  <span className="font-semibold flex items-center gap-1">
                    <Clock className="w-4 h-4 text-blue-500" />
                    20–30 min
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>New patients welcome</span>
                  <span className="font-semibold text-emerald-600">Yes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Rating</span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="font-semibold">4.9</span>
                    <span className="text-xs text-gray-500">/ 5</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg border border-blue-100 p-4 text-sm text-blue-900">
              <p className="font-semibold mb-1">How online booking works</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Select a date and time that suits you.</li>
                <li>Confirm your reason for visit.</li>
                <li>Arrive a few minutes before your appointment time.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfilePage;
