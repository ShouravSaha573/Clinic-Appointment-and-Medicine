import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useAppointmentStore } from "../store/useAppointmentStore";
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Plus,
  ArrowRight,
  Heart,
  Shield,
  Star,
  CheckCircle,
  Search,
} from "lucide-react";

const HomePage = () => {
  const { authUser } = useAuthStore();
  const navigate = useNavigate();

  const {
    appointments,
    doctors,
    getUserAppointments,
    getDoctors,
    isLoading,
  } = useAppointmentStore();

  const [upcomingAppointments, setUpcomingAppointments] = useState([]);

  // Load doctors + user appointments
  useEffect(() => {
    if (authUser) {
      getUserAppointments().catch((err) =>
        console.error("Failed to load appointments:", err)
      );
    }
    getDoctors({ limit: 6 }).catch((err) =>
      console.error("Failed to load doctors:", err)
    );
  }, [authUser, getUserAppointments, getDoctors]);

  // Filter for next 7 days (like original)
  useEffect(() => {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcoming = (appointments || [])
      .filter((appointment) => {
        const d = new Date(appointment.appointmentDate);
        return d >= now && d <= nextWeek;
      })
      .slice(0, 3);

    setUpcomingAppointments(upcoming);
  }, [appointments]);

  const formatAppointmentDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return "";
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handlePrimaryCTA = () => {
    if (!authUser) {
      navigate("/login");
    } else {
      navigate("/book-appointment");
    }
  };

  const featuredDoctors = (doctors || []).slice(0, 6);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4 space-y-10">
        {/* HERO SECTION – very close to original */}
        <section className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/70 text-blue-700 text-xs font-medium">
              <Shield className="h-4 w-4" />
              Secure online appointment system
            </span>

            <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-2">
              Welcome to{" "}
              <span className="text-primary bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                ClinicCare
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-700">
              Book appointments with top doctors, manage your health visits, and
              stay in control of your care—all in one place.
            </p>

            {authUser ? (
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handlePrimaryCTA}
                  className="btn btn-primary btn-lg inline-flex items-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Book Appointment
                </button>
                <Link
                  to="/appointments"
                  className="btn btn-outline btn-lg inline-flex items-center"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  My Appointments
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handlePrimaryCTA}
                  className="btn btn-primary btn-lg inline-flex items-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Book Appointment
                </button>
                <Link
                  to="/signup"
                  className="btn btn-outline btn-lg inline-flex items-center"
                >
                  <User className="w-5 h-5 mr-2" />
                  Create account
                </Link>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                24/7 online booking
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                Role-based admin access
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-500" />
                Patient-focused design
              </div>
            </div>
          </div>

          {/* Upcoming appointments card (right side) */}
          <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Your next appointments
                  </p>
                  <p className="text-xs text-gray-500">
                    See what&apos;s coming in the next 7 days.
                  </p>
                </div>
              </div>
              <Link
                to="/appointments"
                className="text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {!authUser ? (
              <p className="text-xs text-gray-500">
                Sign in or create an account to view your upcoming appointments.
              </p>
            ) : isLoading ? (
              <div className="space-y-3">
                <div className="h-4 bg-slate-100 rounded animate-pulse" />
                <div className="h-4 bg-slate-100 rounded animate-pulse" />
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <p className="text-xs text-gray-500">
                You don&apos;t have any appointments in the next 7 days.
                Schedule one now to get started.
              </p>
            ) : (
              <ul className="space-y-3">
                {upcomingAppointments.map((appointment) => (
                  <li
                    key={appointment._id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Stethoscope className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">
                          {appointment.doctor?.name || "Doctor"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatAppointmentDate(
                            appointment.appointmentDate
                          )}{" "}
                          • {formatTime(appointment.appointmentTime)}
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/appointments/${appointment._id}`}
                      className="text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                    >
                      Details
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* QUICK ACTIONS – only Module-1 features now */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Quick actions
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <Link
              to="/book-appointment"
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 rounded-lg p-3">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 group-hover:text-blue-600">
                    Book Appointment
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Schedule with available doctors
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/appointments"
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-emerald-100 rounded-lg p-3">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 group-hover:text-emerald-600">
                    My Appointments
                  </h3>
                  <p className="text-gray-600 text-sm">
                    View and manage your bookings
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/browse-doctors"
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-indigo-100 rounded-lg p-3">
                  <Search className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 group-hover:text-indigo-600">
                    Browse doctors
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Find specialists by field
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to={authUser ? "/profile" : "/signup"}
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-pink-100 rounded-lg p-3">
                  <User className="w-5 h-5 text-pink-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 group-hover:text-pink-600">
                    {authUser ? "Manage profile" : "Create profile"}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Keep your details up to date
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* WHY CLINICCARE */}
        <section className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <Stethoscope className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              Personalized care
            </h3>
            <p className="text-sm text-gray-600">
              Choose from multiple doctors and keep all your bookings in one
              place.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              Secure accounts
            </h3>
            <p className="text-sm text-gray-600">
              Authentication and role-based access help keep patient data safe.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center mb-3">
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              Easy admin control
            </h3>
            <p className="text-sm text-gray-600">
              Admins can manage doctors and system access from a single
              dashboard.
            </p>
          </div>
        </section>

        {/* FEATURED DOCTORS SECTION – same idea as original */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Featured doctors
            </h2>
            <Link
              to="/browse-doctors"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              View all
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {isLoading ? (
            <p className="text-xs text-gray-500">Loading doctors…</p>
          ) : featuredDoctors.length === 0 ? (
            <p className="text-xs text-gray-500">
              Doctors will appear here once they are added by an admin.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {featuredDoctors.map((doctor) => (
                <Link
                  key={doctor._id}
                  to={`/doctors/${doctor._id}`}
                  className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                      <Stethoscope className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Dr. {doctor.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {doctor.specialization}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span>4.9</span>
                    <span>•</span>
                    <span>Trusted by patients</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default HomePage;
