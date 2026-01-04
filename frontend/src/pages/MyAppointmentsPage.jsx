import { useState, useEffect } from "react";
import { useAppointmentStore } from "../store/useAppointmentStore";
import { Calendar, Clock, User, Phone, Star, X, MessageSquare, DollarSign } from "lucide-react";
import toast from "react-hot-toast";

const statusColors = {
    scheduled: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    rescheduled: 'bg-yellow-100 text-yellow-800'
};

export const MyAppointmentsPage = () => {
    const { 
        appointments, 
        isLoading, 
        fetchUserAppointments, 
        cancelAppointment 
    } = useAppointmentStore();
    
    const [statusFilter, setStatusFilter] = useState('all');
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);

    useEffect(() => {
        fetchUserAppointments(statusFilter);
    }, [statusFilter, fetchUserAppointments]);

    const handleCancelAppointment = async (appointmentId) => {
        if (window.confirm('Are you sure you want to cancel this appointment?')) {
            await cancelAppointment(appointmentId);
        }
    };

    const handleRateAppointment = (appointment) => {
        setSelectedAppointment(appointment);
        setShowRatingModal(true);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (timeSlot) => {
        return `${timeSlot.startTime} - ${timeSlot.endTime}`;
    };

    const canCancelAppointment = (appointmentDate) => {
        const appointmentTime = new Date(appointmentDate);
        const now = new Date();
        const timeDiff = appointmentTime.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        return hoursDiff >= 24;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white pt-20">
                <div className="max-w-6xl mx-auto px-4 py-8">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="bg-gray-200 rounded-lg h-48"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white pt-20">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        My Appointments
                    </h1>
                    <p className="text-gray-600">
                        Manage and track your appointments
                    </p>
                </div>

                {/* Status Filter */}
                <div className="mb-6">
                    <div className="flex flex-wrap gap-2">
                        {['all', 'scheduled', 'completed', 'cancelled'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
                                    statusFilter === status
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Appointments List */}
                {appointments.length === 0 ? (
                    <div className="text-center py-12">
                        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No appointments found
                        </h3>
                        <p className="text-gray-600 mb-4">
                            You haven't booked any appointments yet
                        </p>
                        <a
                            href="/appointments"
                            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            Book an Appointment
                        </a>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {appointments.map((appointment) => (
                            <AppointmentCard
                                key={appointment._id}
                                appointment={appointment}
                                onCancel={handleCancelAppointment}
                                onRate={handleRateAppointment}
                                canCancel={canCancelAppointment(appointment.appointmentDate)}
                            />
                        ))}
                    </div>
                )}

                {/* Rating Modal */}
                {showRatingModal && selectedAppointment && (
                    <RatingModal
                        appointment={selectedAppointment}
                        onClose={() => {
                            setShowRatingModal(false);
                            setSelectedAppointment(null);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

const AppointmentCard = ({ appointment, onCancel, onRate, canCancel }) => {
    const { doctor, appointmentDate, timeSlot, status, consultationType, symptoms, consultationFee, rating } = appointment;

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                    <img
                        src={doctor.profilePic || "/api/placeholder/64/64"}
                        alt={doctor.fullName}
                        className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            {doctor.fullName}
                        </h3>
                        <p className="text-blue-600 font-medium">
                            {doctor.specialization}
                        </p>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                            <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                            {doctor.rating?.toFixed(1) || 'N/A'} • {doctor.experience} years exp.
                        </div>
                    </div>
                </div>
                
                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColors[status]}`}>
                    {status}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{new Date(appointmentDate).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{timeSlot.startTime} - {timeSlot.endTime}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                    {consultationType === 'video-call' ? (
                        <Phone className="w-4 h-4 mr-2" />
                    ) : (
                        <User className="w-4 h-4 mr-2" />
                    )}
                    <span className="capitalize">{consultationType.replace('-', ' ')}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="w-4 h-4 mr-2" />
                    <span>৳{consultationFee}</span>
                </div>
            </div>

            {symptoms && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start">
                        <MessageSquare className="w-4 h-4 mr-2 mt-0.5 text-gray-600" />
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Symptoms:</p>
                            <p className="text-sm text-gray-600">{symptoms}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                {status === 'scheduled' && canCancel && (
                    <button
                        onClick={() => onCancel(appointment._id)}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Cancel Appointment
                    </button>
                )}
                
                {status === 'completed' && !rating && (
                    <button
                        onClick={() => onRate(appointment)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Rate & Review
                    </button>
                )}
                
                {rating && (
                    <div className="flex items-center text-sm text-gray-600">
                        <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                        <span>You rated: {rating}/5</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const RatingModal = ({ appointment, onClose }) => {
    const [rating, setRating] = useState(0);
    const [review, setReview] = useState('');
    const { rateAppointment } = useAppointmentStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            toast.error('Please select a rating');
            return;
        }

        await rateAppointment(appointment._id, rating, review);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Rate Your Experience
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                        How was your appointment with {appointment.doctor.fullName}?
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Rating
                        </label>
                        <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className="text-2xl focus:outline-none"
                                >
                                    <Star
                                        className={`w-8 h-8 ${
                                            star <= rating
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-gray-300'
                                        }`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Review (Optional)
                        </label>
                        <textarea
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                            placeholder="Share your experience..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={3}
                        />
                    </div>

                    <div className="flex space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Submit Rating
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MyAppointmentsPage;
