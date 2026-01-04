import { useState, useEffect } from "react";
import { Star, MessageSquare, Calendar, Clock, ThumbsUp, User, Search, Stethoscope } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import ReviewForm from "../components/ReviewForm";
import toast from "react-hot-toast";

const ReviewsPage = () => {
  const [activeTab, setActiveTab] = useState("write");
  const [doctors, setDoctors] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (activeTab === "write") {
      fetchDoctors();
    } else if (activeTab === "my-reviews") {
      fetchMyReviews();
    }
  }, [activeTab]);

  const fetchDoctors = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get("/doctors");
      setDoctors(response.data.doctors || response.data);
    } catch (error) {
      toast.error("Failed to fetch doctors");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyReviews = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get("/reviews/my-reviews");
      setMyReviews(response.data.reviews);
    } catch (error) {
      toast.error("Failed to fetch your reviews");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWriteReview = (doctor) => {
    setSelectedDoctor(doctor);
    setShowReviewForm(true);
  };

  const handleReviewSubmitted = () => {
    setShowReviewForm(false);
    setSelectedDoctor(null);
    fetchMyReviews(); // Refresh my reviews
    toast.success("Thank you for your review!");
  };

  const filteredDoctors = doctors.filter(doctor =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const StarDisplay = ({ rating, size = "w-4 h-4" }) => (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${
            star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reviews & Feedback</h1>
          <p className="text-gray-600">Share your experience and help others make informed decisions</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab("write")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "write"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <MessageSquare className="w-5 h-5 inline-block mr-2" />
                Write Reviews
              </button>
              <button
                onClick={() => setActiveTab("my-reviews")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "my-reviews"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Star className="w-5 h-5 inline-block mr-2" />
                My Reviews
              </button>
            </nav>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : activeTab === "write" ? (
              <div>
                {showReviewForm && selectedDoctor ? (
                  <div>
                    <button
                      onClick={() => setShowReviewForm(false)}
                      className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
                    >
                      ← Back to Doctor Selection
                    </button>
                    <ReviewForm 
                      doctorId={selectedDoctor._id}
                      doctorName={selectedDoctor.name}
                      onReviewSubmitted={handleReviewSubmitted}
                    />
                  </div>
                ) : (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Select a Doctor to Review
                      </h2>
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          placeholder="Search doctors by name or specialization..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {filteredDoctors.length === 0 ? (
                      <div className="text-center py-12">
                        <Stethoscope className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {searchTerm ? "No doctors found" : "No doctors available"}
                        </h3>
                        <p className="text-gray-600">
                          {searchTerm ? "Try adjusting your search terms" : "Please check back later"}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredDoctors.map((doctor) => (
                          <div
                            key={doctor._id}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center space-x-4 mb-4">
                              <img
                                src={doctor.profileImage || "/api/placeholder/64/64"}
                                alt={doctor.name}
                                className="w-16 h-16 rounded-full object-cover"
                              />
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg text-gray-900">
                                  Dr. {doctor.name}
                                </h3>
                                <p className="text-gray-600">{doctor.specialization}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <StarDisplay rating={doctor.averageRating || 0} />
                                  <span className="text-sm text-gray-500">
                                    ({doctor.totalReviews || 0} reviews)
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleWriteReview(doctor)}
                              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                            >
                              Write Review
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {myReviews.length === 0 ? (
                  <div className="text-center py-12">
                    <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Reviews Yet
                    </h3>
                    <p className="text-gray-600">
                      Your submitted reviews will appear here.
                    </p>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Your Reviews ({myReviews.length})
                    </h2>
                    <div className="space-y-6">
                      {myReviews.map((review) => (
                        <div
                          key={review._id}
                          className="border border-gray-200 rounded-lg p-6"
                        >
                          {review.type === "doctor" ? (
                            <div>
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-4">
                                  <img
                                    src={review.doctorId?.profileImage || "/api/placeholder/48/48"}
                                    alt={review.doctorId?.name || "Doctor"}
                                    className="w-12 h-12 rounded-full object-cover"
                                  />
                                  <div>
                                    <h3 className="font-semibold text-gray-900">
                                      Dr. {review.doctorId?.name || "Unknown Doctor"}
                                    </h3>
                                    <p className="text-gray-600 text-sm">
                                      {review.doctorId?.specialization || "Specialization not available"}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <StarDisplay rating={review.rating || 0} />
                                  <p className="text-sm text-gray-500 mt-1">
                                    {formatDate(review.createdAt)}
                                  </p>
                                </div>
                              </div>
                              
                              <p className="text-gray-800 mb-4">{review.reviewText || "No review text available"}</p>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-600">Consultation</p>
                                  <StarDisplay rating={review.categories?.consultation || 0} size="w-3 h-3" />
                                </div>
                                <div>
                                  <p className="text-gray-600">Punctuality</p>
                                  <StarDisplay rating={review.categories?.punctuality || 0} size="w-3 h-3" />
                                </div>
                                <div>
                                  <p className="text-gray-600">Communication</p>
                                  <StarDisplay rating={review.categories?.communication || 0} size="w-3 h-3" />
                                </div>
                                <div>
                                  <p className="text-gray-600">Treatment</p>
                                  <StarDisplay rating={review.categories?.treatment || 0} size="w-3 h-3" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <h3 className="font-semibold text-gray-900">
                                    Service Review - {review.serviceType?.replace("_", " ").toUpperCase() || "SERVICE"}
                                  </h3>
                                </div>
                                <div className="text-right">
                                  <StarDisplay rating={review.rating || 0} />
                                  <p className="text-sm text-gray-500 mt-1">
                                    {formatDate(review.createdAt)}
                                  </p>
                                </div>
                              </div>
                              
                              <p className="text-gray-800 mb-4">{review.reviewText || "No review text available"}</p>
                              
                              {review.suggestions && (
                                <div className="bg-gray-50 rounded-md p-3">
                                  <p className="text-sm text-gray-600 font-medium">Suggestions:</p>
                                  <p className="text-sm text-gray-800">{review.suggestions}</p>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                review.status === "approved" 
                                  ? "bg-green-100 text-green-800"
                                  : review.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}>
                                {(review.status || 'pending').charAt(0).toUpperCase() + (review.status || 'pending').slice(1)}
                              </span>
                              {review.isAnonymous && (
                                <span className="text-gray-500">
                                  <User className="w-4 h-4 inline mr-1" />
                                  Anonymous
                                </span>
                              )}
                            </div>
                            
                            {(review.helpfulCount || 0) > 0 && (
                              <div className="flex items-center space-x-1 text-sm text-gray-500">
                                <ThumbsUp className="w-4 h-4" />
                                <span>{review.helpfulCount || 0} found helpful</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewsPage;
