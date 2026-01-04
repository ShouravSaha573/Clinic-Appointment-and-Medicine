import { useEffect, useState } from "react";
import { Star, Send, User } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const ReviewForm = ({ doctorId, doctorName, onReviewSubmitted }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);
  const [review, setReview] = useState({
    rating: 0,
    reviewText: "",
    isAnonymous: false
  });

  useEffect(() => {
    const fetchExisting = async () => {
      if (!doctorId) return;
      setIsLoadingExisting(true);
      try {
        const response = await axiosInstance.get(`/reviews/doctor/${doctorId}/my`);
        if (response?.data?.hasReviewed && response?.data?.review) {
          setHasExistingReview(true);
          setReview({
            rating: response.data.review.rating || 0,
            reviewText: response.data.review.reviewText || "",
            isAnonymous: Boolean(response.data.review.isAnonymous),
          });
        } else {
          setHasExistingReview(false);
          setReview({ rating: 0, reviewText: "", isAnonymous: false });
        }
      } catch (error) {
        // If this fails, keep form usable (treat as no existing review)
        console.error("Error fetching existing review:", error);
        setHasExistingReview(false);
      } finally {
        setIsLoadingExisting(false);
      }
    };

    fetchExisting();
  }, [doctorId]);

  const handleRatingClick = (rating) => {
    setReview(prev => ({ ...prev, rating }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!review.rating) {
      toast.error("Please provide a rating");
      return;
    }

    if (!review.reviewText.trim()) {
      toast.error("Please write a review");
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = {
        doctorId,
        rating: review.rating,
        reviewText: review.reviewText,
        isAnonymous: review.isAnonymous
      };

      const response = await axiosInstance.post("/reviews/doctor", submitData);
      toast.success(response?.data?.message || (hasExistingReview ? "Review updated successfully!" : "Review submitted successfully!"));

      // After submitting, we now definitely have an existing review.
      setHasExistingReview(true);

      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <User className="w-8 h-8 text-blue-500" />
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {hasExistingReview ? "Update Your Review" : "Write a Review"}
          </h3>
          <p className="text-gray-600">Share your experience with Dr. {doctorName}</p>
        </div>
      </div>

      {isLoadingExisting ? (
        <div className="text-sm text-gray-600">Loading your previous review…</div>
      ) : hasExistingReview ? (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          You have already reviewed this doctor. Submitting again will update your existing review.
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Overall Rating */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Overall Rating
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-8 h-8 cursor-pointer transition-colors ${
                  star <= review.rating 
                    ? "fill-yellow-400 text-yellow-400" 
                    : "text-gray-300 hover:text-yellow-400"
                }`}
                onClick={() => handleRatingClick(star)}
              />
            ))}
          </div>
        </div>

        {/* Review Text */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Your Review
          </label>
          <textarea
            value={review.reviewText}
            onChange={(e) => setReview(prev => ({ ...prev, reviewText: e.target.value }))}
            placeholder="Share your experience with this doctor..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
            maxLength={1000}
            required
          />
          <div className="text-right text-sm text-gray-500">
            {review.reviewText.length}/1000 characters
          </div>
        </div>

        {/* Anonymous Option */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="anonymous"
            checked={review.isAnonymous}
            onChange={(e) => setReview(prev => ({ ...prev, isAnonymous: e.target.checked }))}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="anonymous" className="text-sm text-gray-700">
            Submit as anonymous review
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || isLoadingExisting || !review.rating || !review.reviewText.trim()}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
          {isSubmitting ? "Submitting..." : (hasExistingReview ? "Update Review" : "Submit Review")}
        </button>
      </form>
    </div>
  );
};

export default ReviewForm;
