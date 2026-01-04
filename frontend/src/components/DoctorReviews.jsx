import { useState, useEffect } from "react";
import { Star, ThumbsUp, User, ChevronDown, ChevronUp } from "lucide-react";
import { axiosInstance } from "../lib/axios";

const DoctorReviews = ({ doctorId, showHelpfulButton = true }) => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showAllStats, setShowAllStats] = useState(false);

  useEffect(() => {
    if (doctorId) {
      fetchReviews();
    }
  }, [doctorId, currentPage, sortBy, sortOrder]);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`/reviews/doctor/${doctorId}`, {
        params: {
          page: currentPage,
          limit: 10,
          sortBy,
          sortOrder
        }
      });
      
      setReviews(response.data.reviews || []);
      setStats(response.data.stats || {});
      setPagination(response.data.pagination || {});
    } catch (error) {
      console.error("Error fetching reviews:", error);
      // Set safe default values on error
      setReviews([]);
      setStats({});
      setPagination({});
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkHelpful = async (reviewId) => {
    if (!showHelpfulButton) return;
    try {
      await axiosInstance.put(`/reviews/${reviewId}/helpful`, { type: "doctor" });
      // Refresh reviews to show updated helpful count
      fetchReviews();
    } catch (error) {
      console.error("Error marking review as helpful:", error);
    }
  };

  const StarDisplay = ({ rating, size = "w-4 h-4" }) => {
    const safeRating = rating || 0;
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= safeRating ? "text-yellow-400 fill-current" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const getRatingDistribution = () => {
    if (!stats.ratings || !Array.isArray(stats.ratings) || stats.ratings.length === 0) return {};
    
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    stats.ratings.forEach(rating => {
      if (rating && typeof rating.overall === 'number') {
        distribution[Math.floor(rating.overall)]++;
      }
    });
    
    return distribution;
  };

  const getCategoryAverages = () => {
    if (!stats.ratings || !Array.isArray(stats.ratings) || stats.ratings.length === 0) return {};
    
    const totals = { consultation: 0, punctuality: 0, communication: 0, treatment: 0 };
    let validRatingsCount = 0;
    
    stats.ratings.forEach(rating => {
      if (rating && rating.consultation && rating.punctuality && rating.communication && rating.treatment) {
        totals.consultation += rating.consultation;
        totals.punctuality += rating.punctuality;
        totals.communication += rating.communication;
        totals.treatment += rating.treatment;
        validRatingsCount++;
      }
    });
    
    if (validRatingsCount === 0) return {};
    
    return {
      consultation: (totals.consultation / validRatingsCount).toFixed(1),
      punctuality: (totals.punctuality / validRatingsCount).toFixed(1),
      communication: (totals.communication / validRatingsCount).toFixed(1),
      treatment: (totals.treatment / validRatingsCount).toFixed(1)
    };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const ratingDistribution = getRatingDistribution();
  const categoryAverages = getCategoryAverages();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Patient Reviews & Ratings
        </h2>
        
        {/* Rating Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {stats.averageRating ? stats.averageRating.toFixed(1) : "0.0"}
            </div>
            <StarDisplay rating={Math.round(stats.averageRating || 0)} size="w-6 h-6" />
            <p className="text-gray-600 mt-2">
              Based on {stats.totalReviews || 0} review{stats.totalReviews !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Rating Distribution</h3>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 w-3">{rating}</span>
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{
                        width: `${
                          stats.totalReviews > 0
                            ? ((ratingDistribution[rating] || 0) / stats.totalReviews) * 100
                            : 0
                        }%`
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-8">
                    {ratingDistribution[rating] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Category Averages */}
        {Object.keys(categoryAverages).length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowAllStats(!showAllStats)}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
            >
              <span className="font-medium">Detailed Ratings</span>
              {showAllStats ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            
            {showAllStats && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Consultation</p>
                  <div className="font-semibold text-lg">{categoryAverages.consultation}</div>
                  <StarDisplay rating={Math.round(categoryAverages.consultation)} size="w-3 h-3" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Punctuality</p>
                  <div className="font-semibold text-lg">{categoryAverages.punctuality}</div>
                  <StarDisplay rating={Math.round(categoryAverages.punctuality)} size="w-3 h-3" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Communication</p>
                  <div className="font-semibold text-lg">{categoryAverages.communication}</div>
                  <StarDisplay rating={Math.round(categoryAverages.communication)} size="w-3 h-3" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Treatment</p>
                  <div className="font-semibold text-lg">{categoryAverages.treatment}</div>
                  <StarDisplay rating={Math.round(categoryAverages.treatment)} size="w-3 h-3" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Sort Options */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-medium text-gray-900">
          Reviews ({pagination.totalReviews || 0})
        </h3>
        <div className="flex items-center space-x-4">
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
              setCurrentPage(1);
            }}
            className="text-sm border border-gray-300 rounded-md px-3 py-1"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="rating-desc">Highest Rated</option>
            <option value="rating-asc">Lowest Rated</option>
            <option value="helpfulCount-desc">Most Helpful</option>
          </select>
        </div>
      </div>
      
      {/* Reviews List */}
      <div className="divide-y divide-gray-200">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No reviews yet. Be the first to review!</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review._id} className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {review.isAnonymous ? (
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-600" />
                    </div>
                  ) : (
                    <img
                      src={review.patientId?.profilePic || "/api/placeholder/40/40"}
                      alt={review.patientId?.fullName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {review.isAnonymous ? "Anonymous Patient" : review.patientId?.fullName}
                    </p>
                    <div className="flex items-center space-x-2">
                      <StarDisplay rating={review.rating} />
                      <span className="text-sm text-gray-500">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {review.isVerified && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Verified Patient
                  </span>
                )}
              </div>
              
              <p className="text-gray-800 mb-4">{review.reviewText}</p>
              
              {/* Category Ratings - only show if categories exist */}
              {review.categories && Object.keys(review.categories).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  {review.categories.consultation && (
                    <div>
                      <p className="text-gray-600">Consultation</p>
                      <StarDisplay rating={review.categories.consultation} size="w-3 h-3" />
                    </div>
                  )}
                  {review.categories.punctuality && (
                    <div>
                      <p className="text-gray-600">Punctuality</p>
                      <StarDisplay rating={review.categories.punctuality} size="w-3 h-3" />
                    </div>
                  )}
                  {review.categories.communication && (
                    <div>
                      <p className="text-gray-600">Communication</p>
                      <StarDisplay rating={review.categories.communication} size="w-3 h-3" />
                    </div>
                  )}
                  {review.categories.treatment && (
                    <div>
                      <p className="text-gray-600">Treatment</p>
                      <StarDisplay rating={review.categories.treatment} size="w-3 h-3" />
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between">
                {showHelpfulButton ? (
                  <button
                    onClick={() => handleMarkHelpful(review._id)}
                    className="flex items-center space-x-1 text-sm text-gray-500 hover:text-blue-600"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>Helpful ({review.helpfulCount})</span>
                  </button>
                ) : (
                  <div />
                )}
                
                {review.adminResponse && (
                  <div className="bg-blue-50 rounded-md p-3 mt-3">
                    <p className="text-sm font-medium text-blue-900">Clinic Response:</p>
                    <p className="text-sm text-blue-800">{review.adminResponse.text}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing page {pagination.currentPage} of {pagination.totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!pagination.hasPrev}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!pagination.hasNext}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorReviews;
