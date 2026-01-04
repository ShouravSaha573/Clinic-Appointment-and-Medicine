
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useAppointmentStore } from "../store/useAppointmentStore";
import { axiosInstance } from "../lib/axios";
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
  BookOpen,
} from "lucide-react";

const HomePage = () => {
  const { authUser } = useAuthStore();
  const navigate = useNavigate();
  const { 
    appointments, 
    doctors, 
    getUserAppointments, 
    getDoctors, 
    isLoading 
  } = useAppointmentStore();
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [featuredArticles, setFeaturedArticles] = useState([]);

  useEffect(() => {
    if (authUser) {
      getUserAppointments({ status: "pending" });
    }
    // Always fetch some featured doctors for public viewing
    getDoctors({ limit: 6 });
    
    // Fetch featured articles
    fetchFeaturedArticles();
  }, [authUser, getUserAppointments, getDoctors]);

  useEffect(() => {
    // Filter for upcoming appointments (next 7 days)
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcoming = appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.appointmentDate);
      return appointmentDate >= now && appointmentDate <= nextWeek;
    }).slice(0, 3); // Show only first 3

    setUpcomingAppointments(upcoming);
  }, [appointments]);

  const fetchFeaturedArticles = async () => {
    try {
      const response = await axiosInstance.get('/articles?limit=3');
      setFeaturedArticles(response.data.articles || []);
    } catch (error) {
      console.error('Failed to fetch featured articles:', error);
    }
  };

  const formatArticleDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const featuredDoctors = doctors.slice(0, 6);

  const handleBookAppointment = () => {
    if (!authUser) {
      navigate("/login");
      return;
    }
    navigate("/book-appointment");
  };

  const formatAppointmentDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-100/70 via-white to-cyan-100/70 pt-16">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-6">
              Welcome to{" "}
              <span className="text-primary bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">ClinicCare</span>
            </h1>
            <p className="text-xl text-gray-700 mb-8">
              Book appointments with top doctors, manage your health records, and get the care you deserve.
            </p>
            
            {authUser ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/book-appointment" className="btn btn-primary btn-lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Book Appointment
                </Link>
                <Link to="/appointments" className="btn btn-outline btn-lg">
                  <Calendar className="w-5 h-5 mr-2" />
                  My Appointments
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/signup" className="btn btn-primary btn-lg">
                  Get Started
                </Link>
                <Link to="/login" className="btn btn-outline btn-lg">
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Dashboard Section */}
      {authUser && (
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Actions */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <Link
                  to="/book-appointment"
                  className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 rounded-lg p-3">
                      <Plus className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 group-hover:text-primary">
                        Book Appointment
                      </h3>
                      <p className="text-gray-600 text-sm">Schedule with available doctors</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                  </div>
                </Link>

                <Link
                  to="/appointments"
                  className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-secondary/10 rounded-lg p-3">
                      <Calendar className="w-6 h-6 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 group-hover:text-secondary">
                        My Appointments
                      </h3>
                      <p className="text-gray-600 text-sm">View and manage appointments</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-secondary" />
                  </div>
                </Link>

                <Link
                  to="/profile"
                  className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-accent/10 rounded-lg p-3">
                      <User className="w-6 h-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 group-hover:text-accent">
                        My Profile
                      </h3>
                      <p className="text-gray-600 text-sm">Update personal information</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-accent" />
                  </div>
                </Link>

                <Link
                  to="/medicines"
                  className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 rounded-lg p-3">
                      <Heart className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 group-hover:text-green-600">
                        Medicines
                      </h3>
                      <p className="text-gray-600 text-sm">Order medicines online</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-600" />
                  </div>
                </Link>

                <Link
                  to="/lab-tests"
                  className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-100 rounded-lg p-3">
                      <Search className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 group-hover:text-purple-600">
                        Lab Tests
                      </h3>
                      <p className="text-gray-600 text-sm">Book diagnostic tests</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600" />
                  </div>
                </Link>

                <Link
                  to="/lab-reports"
                  className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-cyan-100 rounded-lg p-3">
                      <CheckCircle className="w-6 h-6 text-cyan-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 group-hover:text-cyan-600">
                        Lab Reports
                      </h3>
                      <p className="text-gray-600 text-sm">View test results</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-600" />
                  </div>
                </Link>

                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-info/10 rounded-lg p-3">
                      <Stethoscope className="w-6 h-6 text-info" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">Find Doctors</h3>
                      <p className="text-gray-600 text-sm">Browse by specialization</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Appointments */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Upcoming</h2>
                <Link to="/appointments" className="text-primary hover:underline text-sm">
                  View All
                </Link>
              </div>

              {isLoading ? (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ) : upcomingAppointments.length > 0 ? (
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment) => (
                    <div
                      key={appointment._id}
                      className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="avatar">
                          <div className="w-10 h-10 rounded-full">
                            {appointment.doctor.profileImage ? (
                              <img 
                                src={appointment.doctor.profileImage} 
                                alt={appointment.doctor.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="bg-primary/10 flex items-center justify-center w-full h-full">
                                <User className="w-5 h-5 text-primary" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-gray-800">
                            Dr. {appointment.doctor.name}
                          </h4>
                          <p className="text-xs text-gray-600">
                            {appointment.doctor.specialization}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Calendar className="w-3 h-3" />
                          <span>{formatAppointmentDate(appointment.appointmentDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(appointment.appointmentTime)}</span>
                        </div>
                      </div>
                      <Link
                        to={`/appointments/${appointment._id}`}
                        className="btn btn-xs btn-outline mt-3 w-full"
                      >
                        View Details
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-600 mb-2">No upcoming appointments</h4>
                  <p className="text-gray-500 text-sm mb-4">
                    Book your first appointment to get started
                  </p>
                  <Link to="/book-appointment" className="btn btn-primary btn-sm">
                    Book Now
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Featured Doctors Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Meet Our Doctors</h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-6">
            Our team of experienced healthcare professionals is here to provide you with the best medical care.
          </p>
          <Link 
            to="/browse-doctors" 
            className="btn btn-outline"
          >
            <Search className="w-4 h-4 mr-2" />
            Browse All Doctors
          </Link>
        </div>

        {featuredDoctors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {featuredDoctors.map((doctor) => (
              <div
                key={doctor._id}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="avatar">
                      <div className="w-16 h-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                        {doctor.profileImage ? (
                          <img 
                            src={doctor.profileImage} 
                            alt={doctor.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="bg-primary/10 flex items-center justify-center w-full h-full">
                            <User className="w-8 h-8 text-primary" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-800">
                        Dr. {doctor.name}
                      </h3>
                      <div className="flex items-center gap-2 text-primary mb-1">
                        <Stethoscope className="w-4 h-4" />
                        <span className="text-sm font-medium">{doctor.specialization}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-xs text-gray-600 ml-1">(4.9)</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Experience:</span> {doctor.experience} years
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Fee:</span> ৳{doctor.consultationFee}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      to={`/doctors/${doctor._id}`}
                      className="btn btn-outline btn-sm flex-1"
                    >
                      View Profile
                    </Link>
                    <button
                      onClick={handleBookAppointment}
                      className="btn btn-primary btn-sm flex-1"
                    >
                      {authUser ? "Book Now" : "Login to Book"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Why Choose ClinicCare?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We provide comprehensive healthcare services with a focus on patient care and convenience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Expert Care</h3>
              <p className="text-gray-600">
                Our experienced doctors provide personalized treatment plans for your health needs.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-secondary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Secure & Private</h3>
              <p className="text-gray-600">
                Your health information is protected with the highest security standards and privacy measures.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-accent/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Easy Booking</h3>
              <p className="text-gray-600">
                Book appointments online 24/7 with our user-friendly scheduling system.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Health Tips Section */}
      <div className="bg-base-100 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Latest Health Tips & Articles
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Stay informed with expert health advice, medical insights, and wellness tips from our healthcare professionals
            </p>
          </div>

          {featuredArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
              {featuredArticles.map((article) => (
                <div key={article._id} className="card bg-white shadow-lg hover:shadow-xl transition-shadow">
                  <div className="card-body">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {article.categories?.slice(0, 2).map((category, index) => (
                        <span key={index} className="badge badge-primary badge-sm">
                          {category}
                        </span>
                      ))}
                    </div>
                    
                    <h3 className="card-title text-lg hover:text-primary transition-colors">
                      <Link to={`/articles/${article._id}`}>
                        {article.title}
                      </Link>
                    </h3>
                    
                    <p className="text-gray-600 text-sm line-clamp-3">
                      {article.excerpt || (article.content ? `${article.content.substring(0, 120)}...` : "")}
                    </p>
                    
                    <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <div className="avatar placeholder">
                          <div className="bg-primary text-primary-content rounded-full w-6">
                            <span className="text-xs">
                              {article.authorModel === 'Doctor' 
                                ? `Dr. ${article.authorDetails?.firstName?.[0] || 'D'}`
                                : article.authorDetails?.fullName?.[0] || 'A'
                              }
                            </span>
                          </div>
                        </div>
                        <span>
                          {article.authorModel === 'Doctor' 
                            ? `Dr. ${article.authorDetails?.firstName} ${article.authorDetails?.lastName}`
                            : article.authorDetails?.fullName
                          }
                        </span>
                      </div>
                      <span>{formatArticleDate(article.publishedDate || article.createdAt)}</span>
                    </div>
                    
                    <div className="card-actions justify-end mt-4">
                      <Link to={`/articles/${article._id}`} className="btn btn-primary btn-sm">
                        Read More
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No health articles available yet</p>
            </div>
          )}

          <div className="text-center">
            <Link to="/blog" className="btn btn-primary gap-2">
              <BookOpen className="w-5 h-5" />
              View All Articles
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-primary text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-primary-content/80">Happy Patients</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-primary-content/80">Expert Doctors</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">15+</div>
              <div className="text-primary-content/80">Specializations</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">4.9</div>
              <div className="text-primary-content/80 flex items-center justify-center gap-1">
                <Star className="w-4 h-4 fill-current" />
                Patient Rating
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
