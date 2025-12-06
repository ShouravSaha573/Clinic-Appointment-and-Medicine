import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, User, Stethoscope } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import { toast } from "react-hot-toast";

const AVAILABLE_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30"
];

const TimeSlot = ({ time, isAvailable, isSelected, onClick }) => (
  <button
    onClick={onClick}
    disabled={!isAvailable}
    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
      isSelected
        ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-500 transform scale-105"
        : isAvailable
        ? "bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 border-gray-300 hover:border-blue-300 text-gray-700"
        : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
    }`}
  >
    {new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })}
  </button>
);

const BookAppointmentPage = () => {
  const { authUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { doctorId } = useParams();
  
  // Initial state based on whether coming from doctor profile or direct booking
  const initialDoctor = location.state?.doctor || null;
  const initialStep = initialDoctor ? 2 : 1;
  
  const [step, setStep] = useState(initialStep);
  const [selectedDoctor, setSelectedDoctor] = useState(initialDoctor);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  
  // Guest patient details state
  const [guestPatient, setGuestPatient] = useState({
    name: "",
    email: "",
    phone: "",
    age: "",
    gender: ""
  });

  useEffect(() => {
    fetchDoctors();
    if (doctorId && !initialDoctor) {
      fetchDoctorById(doctorId);
    }
  }, [doctorId, initialDoctor]);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchBookedSlots();
    }
  }, [selectedDoctor, selectedDate]);

  const fetchDoctors = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get("/doctors");
      setDoctors(response.data.doctors || []);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      toast.error("Failed to load doctors");
      setDoctors([]); // Fallback to empty array
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDoctorById = async (id) => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get(`/doctors/${id}`);
      setSelectedDoctor(response.data);
      setStep(2);
    } catch (error) {
      console.error("Error fetching doctor:", error);
      toast.error("Doctor not found");
      navigate("/book-appointment");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBookedSlots = async () => {
    try {
      const response = await axiosInstance.get(
        `/appointments/booked-slots?doctorId=${selectedDoctor._id}&date=${selectedDate}`
      );
      setBookedSlots(response.data.bookedSlots || []);
    } catch (error) {
      console.error("Error fetching booked slots:", error);
    }
  };

  const handleDoctorSelect = (doctor) => {
    setSelectedDoctor(doctor);
    setSelectedDate("");
    setSelectedTime("");
    setStep(2);
  };

  const handleDateTimeConfirm = () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select both date and time");
      return;
    }
    
    if (!reason.trim()) {
      toast.error("Please provide a reason for your visit");
      return;
    }
    
    // Skip patient details step if user is logged in, go directly to confirmation
    if (authUser) {
      setStep(3);
    } else {
      setStep(3); // Go to patient details step for guests
    }
  };

  const handlePatientDetailsConfirm = () => {
    if (!guestPatient.name.trim() || !guestPatient.email.trim() || 
        !guestPatient.phone.trim() || !guestPatient.age || !guestPatient.gender) {
      toast.error("Please fill in all patient details");
      return;
    }
    setStep(4); // Go to confirmation step
  };

  const handleBookingConfirm = async () => {
    try {
      setIsBooking(true);
      
      const appointmentData = {
        doctorId: selectedDoctor._id,
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
        reason: reason.trim()
      };

      // Add guest patient data if user is not authenticated
      if (!authUser) {
        appointmentData.guestPatient = guestPatient;
      }

      const response = await axiosInstance.post("/appointments", appointmentData);
      
      toast.success("Appointment booked successfully!");
      navigate("/appointments", { 
        state: { 
          newAppointment: response.data,
          showSuccess: true 
        } 
      });
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast.error(error.response?.data?.message || "Failed to book appointment");
    } finally {
      setIsBooking(false);
    }
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
  };

  const isTimeSlotAvailable = (timeSlot) => {
    return AVAILABLE_SLOTS.includes(timeSlot) && !bookedSlots.includes(timeSlot);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => {
              if (step > 1) {
                setStep(step - 1);
              } else {
                navigate("/appointments");
              }
            }}
            className="btn btn-ghost btn-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Book Appointment</h1>
            <p className="text-gray-600">
              {step === 1 && "Select a doctor"}
              {step === 2 && "Choose date, time and reason"}
              {step === 3 && !authUser && "Enter your details"}
              {step === 3 && authUser && "Confirm your appointment"}
              {step === 4 && "Confirm your appointment"}
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="steps steps-horizontal w-full mb-8">
          <div className={`step ${step >= 1 ? "step-primary" : ""}`}>Select Doctor</div>
          <div className={`step ${step >= 2 ? "step-primary" : ""}`}>Date & Time</div>
          {!authUser && (
            <div className={`step ${step >= 3 ? "step-primary" : ""}`}>Your Details</div>
          )}
          <div className={`step ${step >= (authUser ? 3 : 4) ? "step-primary" : ""}`}>Confirm</div>
        </div>

        {/* Step 1: Doctor Selection */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-6">Choose a Doctor</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.isArray(doctors) && doctors.map((doctor) => (
                <div
                  key={doctor._id}
                  className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleDoctorSelect(doctor)}
                >
                  <div className="flex items-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mr-4">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Dr. {doctor.name}</h3>
                      <p className="text-gray-600">{doctor.specialization}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Stethoscope className="w-4 h-4 mr-2" />
                      {doctor.experience} years experience
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-primary">
                        ৳{doctor.consultationFee}
                      </span>
                      <button className="btn btn-primary btn-sm">Select</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Date & Time Selection */}
        {step === 2 && selectedDoctor && (
          <div>
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mr-4">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Dr. {selectedDoctor.name}</h3>
                  <p className="text-gray-600">{selectedDoctor.specialization}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Date Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Select Date *
                  </label>
                  <input
                    type="date"
                    min={getMinDate()}
                    max={getMaxDate()}
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedTime("");
                    }}
                    className="input input-bordered w-full"
                    required
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Reason for Visit *
                  </label>
                  <textarea
                    placeholder="Please describe your symptoms or reason for visit"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="textarea textarea-bordered w-full h-24 resize-none"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">This helps the doctor prepare for your consultation</p>
                </div>
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <div className="mt-8">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Available Time Slots *
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {AVAILABLE_SLOTS.map((timeSlot) => (
                      <TimeSlot
                        key={timeSlot}
                        time={timeSlot}
                        isAvailable={isTimeSlotAvailable(timeSlot)}
                        isSelected={selectedTime === timeSlot}
                        onClick={() => setSelectedTime(timeSlot)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="btn btn-outline flex-1"
              >
                Back to Doctors
              </button>
              <button
                onClick={handleDateTimeConfirm}
                className="btn btn-primary flex-1"
                disabled={!selectedDate || !selectedTime || !reason.trim()}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Patient Details (Guest Only) */}
        {step === 3 && !authUser && (
          <div>
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <h3 className="text-lg font-semibold mb-6">Patient Information</h3>
              <p className="text-gray-600 mb-6">Please provide your details to complete the booking</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Full Name *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    className="input input-bordered"
                    value={guestPatient.name}
                    onChange={(e) => setGuestPatient({...guestPatient, name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Email Address *</span>
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="input input-bordered"
                    value={guestPatient.email}
                    onChange={(e) => setGuestPatient({...guestPatient, email: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Phone Number *</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="Enter your phone number"
                    className="input input-bordered"
                    value={guestPatient.phone}
                    onChange={(e) => setGuestPatient({...guestPatient, phone: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Age *</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Enter your age"
                    className="input input-bordered"
                    min="1"
                    max="120"
                    value={guestPatient.age}
                    onChange={(e) => setGuestPatient({...guestPatient, age: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text font-medium">Gender *</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={guestPatient.gender}
                    onChange={(e) => setGuestPatient({...guestPatient, gender: e.target.value})}
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="btn btn-outline flex-1"
              >
                Back to Date & Time
              </button>
              <button
                onClick={handlePatientDetailsConfirm}
                className="btn btn-primary flex-1"
                disabled={!guestPatient.name.trim() || !guestPatient.email.trim() || !guestPatient.phone.trim() || !guestPatient.age || !guestPatient.gender}
              >
                Continue to Confirmation
              </button>
            </div>
          </div>
        )}

        {/* Step 3/4: Confirmation */}
        {((step === 3 && authUser) || (step === 4 && !authUser)) && selectedDoctor && (
          <div>
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <h3 className="text-lg font-semibold mb-6">Appointment Summary</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <span className="font-medium">Doctor:</span>
                  <span>Dr. {selectedDoctor.name}</span>
                </div>
                
                <div className="flex items-center justify-between border-b pb-4">
                  <span className="font-medium">Specialization:</span>
                  <span>{selectedDoctor.specialization}</span>
                </div>
                
                <div className="flex items-center justify-between border-b pb-4">
                  <span className="font-medium">Date:</span>
                  <span>{new Date(selectedDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}</span>
                </div>
                
                <div className="flex items-center justify-between border-b pb-4">
                  <span className="font-medium">Time:</span>
                  <span>{new Date(`2000-01-01T${selectedTime}`).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}</span>
                </div>
                
                <div className="flex items-center justify-between border-b pb-4">
                  <span className="font-medium">Duration:</span>
                  <span>30 minutes</span>
                </div>
                
                <div className="flex items-center justify-between border-b pb-4">
                  <span className="font-medium">Consultation Fee:</span>
                  <span className="text-lg font-semibold text-primary">
                    ৳{selectedDoctor.consultationFee}
                  </span>
                </div>
                
                <div className="pt-4">
                  <span className="font-medium">Reason for Visit:</span>
                  <p className="mt-2 text-gray-600 bg-gray-50 p-3 rounded-lg">{reason}</p>
                </div>

                {!authUser && (
                  <div className="pt-4 border-t">
                    <span className="font-medium">Patient Details:</span>
                    <div className="mt-2 bg-gray-50 p-3 rounded-lg">
                      <p><strong>Name:</strong> {guestPatient.name}</p>
                      <p><strong>Email:</strong> {guestPatient.email}</p>
                      <p><strong>Phone:</strong> {guestPatient.phone}</p>
                      <p><strong>Age:</strong> {guestPatient.age}</p>
                      <p><strong>Gender:</strong> {guestPatient.gender}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(authUser ? 2 : 3)}
                className="btn btn-outline flex-1"
              >
                Back to Edit
              </button>
              <button
                onClick={handleBookingConfirm}
                className="btn btn-primary flex-1"
                disabled={isBooking}
              >
                {isBooking ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Booking...
                  </>
                ) : (
                  "Confirm Booking"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookAppointmentPage;
