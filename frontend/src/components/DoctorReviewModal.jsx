import { useState } from "react";
import { Star, Send, X } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const DoctorReviewModal = ({ isOpen, onClose, appointment }) => {
  const [formData, setFormData] = useState({
    rating: 0,
    reviewText: "",
    categories: {
      consultation: 0,
      punctuality: 0,
      communication: 0,
      treatment: 0
    },
    isAnonymous: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingChange = (field, value) => {
    if (field === "rating") {
      setFormData(prev => ({ ...prev, rating: value }));
    } else {
      setFormData(prev => ({
        ...prev,
        categories: { ...prev.categories, [field]: value }
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.rating === 0) {
      toast.error("Please provide an overall rating");
      return;
    }

    if (!formData.reviewText.trim()) {
      toast.error("Please write a review");
      return;
    }

    const hasEmptyCategory = Object.values(formData.categories).some(rating => rating === 0);
    if (hasEmptyCategory) {
      toast.error("Please rate all categories");
      return;
    }

    setIsSubmitting(true);
    try {
      const reviewData = {
        doctorId: appointment.doctorId._id,
        appointmentId: appointment._id,
        ...formData
      };

      await axiosInstance.post("/reviews/doctor", reviewData);
      toast.success("Review submitted successfully!");
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({ rating, onRatingChange, label }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className={`transition-colors ${
              star <= rating ? "text-yellow-400" : "text-gray-300"
            }`}
          >
            <Star className="w-6 h-6 fill-current" />
          </button>
        ))}
      </div>
    </div>
  );

  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Review Dr. {appointment.doctorId.name}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Appointment Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <img
                src={appointment.doctorId.profileImage || "/api/placeholder/64/64"}
                alt={appointment.doctorId.name}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div>
                <h3 className="font-semibold text-lg">Dr. {appointment.doctorId.name}</h3>
                <p className="text-gray-600">{appointment.doctorId.specialization}</p>
                <p className="text-sm text-gray-500">
                  {new Date(appointment.appointmentDate).toLocaleDateString()} at {appointment.timeSlot}
                </p>
              </div>
            </div>
          </div>

          {/* Overall Rating */}
          <StarRating
            rating={formData.rating}
            onRatingChange={(rating) => handleRatingChange("rating", rating)}
            label="Overall Rating *"
          />

          {/* Category Ratings */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Rate Each Aspect</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StarRating
                rating={formData.categories.consultation}
                onRatingChange={(rating) => handleRatingChange("consultation", rating)}
                label="Consultation Quality *"
              />
              <StarRating
                rating={formData.categories.punctuality}
                onRatingChange={(rating) => handleRatingChange("punctuality", rating)}
                label="Punctuality *"
              />
              <StarRating
                rating={formData.categories.communication}
                onRatingChange={(rating) => handleRatingChange("communication", rating)}
                label="Communication *"
              />
              <StarRating
                rating={formData.categories.treatment}
                onRatingChange={(rating) => handleRatingChange("treatment", rating)}
                label="Treatment Effectiveness *"
              />
            </div>
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Write Your Review *
            </label>
            <textarea
              value={formData.reviewText}
              onChange={(e) => setFormData(prev => ({ ...prev, reviewText: e.target.value }))}
              placeholder="Share your experience with this doctor..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-gray-500">
              {formData.reviewText.length}/1000 characters
            </p>
          </div>

          {/* Anonymous Option */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="anonymous"
              checked={formData.isAnonymous}
              onChange={(e) => setFormData(prev => ({ ...prev, isAnonymous: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="anonymous" className="text-sm text-gray-700">
              Submit anonymously
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{isSubmitting ? "Submitting..." : "Submit Review"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorReviewModal;
