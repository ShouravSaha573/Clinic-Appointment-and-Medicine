import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppointmentStore } from "../store/useAppointmentStore";
import { useAuthStore } from "../store/useAuthStore";
import {
  Search,
  Filter,
  User,
  Stethoscope,
  Star,
  Calendar,
  Clock,
  MapPin,
  Phone,
  DollarSign,
  BookOpen,
  ChevronRight,
} from "lucide-react";

const BrowseDoctorsPage = () => {
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  const {
    doctors,
    specializations,
    isLoading,
    pagination,
    getDoctors,
    getSpecializations,
  } = useAppointmentStore();

  const [selectedSpecialization, setSelectedSpecialization] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    getSpecializations();
    getDoctors({ specialization: selectedSpecialization, page: currentPage });
  }, [selectedSpecialization, currentPage]);

  const handleBookAppointment = (doctorId) => {
    if (!authUser) {
      navigate("/login");
      return;
    }
    navigate(`/book-appointment?doctor=${doctorId}`);
  };

  const filteredDoctors = doctors.filter(doctor =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading && doctors.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-100/70 via-white to-cyan-100/70 pt-16">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-6">
              Find the Right{" "}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-bold">Doctor</span> for You
            </h1>
            <p className="text-xl text-gray-700 mb-8">
              Browse our qualified doctors by specialization and book appointments easily.
            </p>
            
            {!authUser && (
              <div className="bg-info/10 border border-info/20 rounded-lg p-4 mb-6">
                <p className="text-info text-sm">
                  📋 You can browse doctors without an account. To book appointments, please{" "}
                  <Link to="/signup" className="link link-primary font-semibold">
                    sign up
                  </Link>{" "}
                  or{" "}
                  <Link to="/login" className="link link-primary font-semibold">
                    login
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <label className="label">
                <span className="label-text font-medium">Search doctors</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by doctor name or specialization..."
                  className="input input-bordered w-full pl-12"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="lg:w-64">
              <label className="label">
                <span className="label-text font-medium">Specialization</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedSpecialization}
                onChange={(e) => {
                  setSelectedSpecialization(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Specializations</option>
                {specializations.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {selectedSpecialization === "all" 
              ? `All Doctors (${pagination.total || 0})` 
              : `${selectedSpecialization} Specialists (${pagination.total || 0})`}
          </h2>
        </div>

        {/* Doctors Grid */}
        {filteredDoctors.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-600 mb-3">No doctors found</h3>
            <p className="text-gray-500 mb-6">
              Try adjusting your search criteria or browse all specializations.
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedSpecialization("all");
              }}
              className="btn btn-primary"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredDoctors.map((doctor) => (
              <div
                key={doctor._id}
                className="bg-white rounded-lg shadow-sm border hover:shadow-lg transition-all duration-200"
              >
                <div className="p-6">
                  {/* Doctor Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="avatar">
                      <div className="w-20 h-20 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                        {doctor.profileImage ? (
                          <img 
                            src={doctor.profileImage} 
                            alt={doctor.name}
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
                      <h3 className="font-bold text-xl text-gray-800 mb-1">
                        Dr. {doctor.name}
                      </h3>
                      <div className="flex items-center gap-2 text-primary mb-2">
                        <Stethoscope className="w-4 h-4" />
                        <span className="font-medium">{doctor.specialization}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600 ml-1">(4.9)</span>
                      </div>
                    </div>
                  </div>

                  {/* Doctor Details */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-gray-600">
                      <BookOpen className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">
                        <span className="font-medium">Qualification:</span> {doctor.qualification}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                      <Clock className="w-4 h-4 text-green-500" />
                      <span className="text-sm">
                        <span className="font-medium">Experience:</span> {doctor.experience} years
                      </span>
                    </div>
                    {doctor.bio && (
                      <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                        <p className="line-clamp-3">{doctor.bio}</p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        ${doctor.consultationFee}
                      </div>
                      <div className="text-xs text-gray-500">Consultation</div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Link
                        to={`/doctors/${doctor._id}`}
                        className="btn btn-outline btn-sm"
                      >
                        View Profile
                      </Link>
                      <button
                        onClick={() => handleBookAppointment(doctor._id)}
                        className="btn btn-primary btn-sm"
                      >
                        {authUser ? "Book Now" : "Login to Book"}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center">
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
    </div>
  );
};

export default BrowseDoctorsPage;
