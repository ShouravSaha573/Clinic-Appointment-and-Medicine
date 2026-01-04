import { useState, useEffect } from "react";
import { axiosInstance } from "../lib/axios";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";

const LabTestsPage = () => {
  const [tests, setTests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTests, setSelectedTests] = useState([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const { authUser } = useAuthStore();

  useEffect(() => {
    fetchLabTests();
  }, [selectedCategory, searchTerm]);

  const fetchLabTests = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/lab-tests", {
        params: {
          category: selectedCategory,
          search: searchTerm,
          limit: 50,
        },
      });
      setTests(response.data.tests);
      setCategories(response.data.categories);
    } catch (error) {
      toast.error("Failed to fetch lab tests");
    } finally {
      setLoading(false);
    }
  };

  const handleTestSelection = (test) => {
    const existingTest = selectedTests.find((t) => t.testId === test._id);
    if (existingTest) {
      setSelectedTests(
        selectedTests.map((t) =>
          t.testId === test._id
            ? { ...t, quantity: t.quantity + 1 }
            : t
        )
      );
    } else {
      setSelectedTests([
        ...selectedTests,
        { testId: test._id, testName: test.name, price: test.price, quantity: 1 },
      ]);
    }
    toast.success(`${test.name} added to booking`);
  };

  const removeFromSelection = (testId) => {
    setSelectedTests(selectedTests.filter((t) => t.testId !== testId));
  };

  const updateQuantity = (testId, quantity) => {
    if (quantity === 0) {
      removeFromSelection(testId);
      return;
    }
    setSelectedTests(
      selectedTests.map((t) =>
        t.testId === testId ? { ...t, quantity } : t
      )
    );
  };

  const getTotalAmount = () => {
    return selectedTests.reduce((total, test) => total + test.price * test.quantity, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Lab Tests</h1>
          <p className="text-gray-600">
            Book reliable lab tests with quick results and home collection options
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tests..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Selected Tests Summary */}
        {selectedTests.length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Selected Tests ({selectedTests.length})</h3>
              <div className="text-xl font-bold text-blue-600">
                Total: ৳{getTotalAmount()}
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {selectedTests.map((test) => (
                <div key={test.testId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="font-medium">{test.testName}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(test.testId, test.quantity - 1)}
                        className="w-6 h-6 bg-gray-200 rounded text-sm hover:bg-gray-300"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{test.quantity}</span>
                      <button
                        onClick={() => updateQuantity(test.testId, test.quantity + 1)}
                        className="w-6 h-6 bg-gray-200 rounded text-sm hover:bg-gray-300"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-blue-600 font-medium">৳{test.price}</span>
                    <button
                      onClick={() => removeFromSelection(test.testId)}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => authUser ? setShowBookingModal(true) : toast.error("Please login to book tests")}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Book Selected Tests
            </button>
          </div>
        )}

        {/* Tests Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-20 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test) => (
              <div key={test._id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {test.name}
                      </h3>
                      <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {test.category}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">৳{test.price}</div>
                      <div className="text-xs text-gray-500">{test.code}</div>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {test.description}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Duration:</span>
                      <span className="font-medium">{test.duration}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Fasting:</span>
                      <span className={`font-medium ${test.fastingRequired ? 'text-orange-600' : 'text-green-600'}`}>
                        {test.fastingRequired ? 'Required' : 'Not Required'}
                      </span>
                    </div>
                  </div>
                  
                  {test.preparation && (
                    <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400">
                      <p className="text-sm text-yellow-800">
                        <strong>Preparation:</strong> {test.preparation}
                      </p>
                    </div>
                  )}
                  
                  <button
                    onClick={() => handleTestSelection(test)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add to Booking
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && tests.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No tests found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        )}

        {/* Booking Modal */}
        {showBookingModal && (
          <LabBookingModal
            selectedTests={selectedTests}
            totalAmount={getTotalAmount()}
            onClose={() => setShowBookingModal(false)}
            onSuccess={() => {
              setShowBookingModal(false);
              setSelectedTests([]);
            }}
          />
        )}
      </div>
    </div>
  );
};

// Lab Booking Modal Component
const LabBookingModal = ({ selectedTests, totalAmount, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    appointmentDate: "",
    timeSlot: "",
    phoneNumber: "",
    homeCollection: {
      required: false,
      address: "",
    },
    paymentMethod: "cash_on_delivery",
    notes: "",
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const getLocalYmd = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseSlotStartMinutes = (slot) => {
    // Expected format: "8:00 AM - 9:00 AM"
    const s = String(slot || "").trim();
    const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)\b/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ampm = m[3].toUpperCase();
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return h * 60 + min;
  };

  const isSameLocalDay = (ymd, dateObj) => {
    if (!ymd) return false;
    const parts = String(ymd).split("-").map((x) => parseInt(x, 10));
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return false;
    const [y, mo, d] = parts;
    return (
      dateObj.getFullYear() === y &&
      dateObj.getMonth() + 1 === mo &&
      dateObj.getDate() === d
    );
  };

  const eligibleSlots = (() => {
    const slots = Array.isArray(availableSlots) ? availableSlots : [];
    if (!formData.appointmentDate) return slots;

    const now = new Date();
    if (!isSameLocalDay(formData.appointmentDate, now)) return slots;

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return slots.filter((slot) => {
      const start = parseSlotStartMinutes(slot);
      if (start === null) return true;
      return start > nowMinutes;
    });
  })();

  useEffect(() => {
    const date = formData.appointmentDate;
    if (!date) {
      setAvailableSlots([]);
      setFormData((prev) => ({ ...prev, timeSlot: "" }));
      return;
    }

    let cancelled = false;

    const fetchSlots = async () => {
      try {
        setIsSlotsLoading(true);
        const res = await axiosInstance.get(`/lab-bookings/time-slots?date=${encodeURIComponent(date)}`);
        if (cancelled) return;
        const next = Array.isArray(res?.data?.availableSlots) ? res.data.availableSlots : [];
        setAvailableSlots(next);
      } catch (err) {
        if (!cancelled) {
          setAvailableSlots([]);
          toast.error("Failed to load time slots");
        }
      } finally {
        if (!cancelled) setIsSlotsLoading(false);
      }
    };

    fetchSlots();
    return () => {
      cancelled = true;
    };
  }, [formData.appointmentDate]);

  useEffect(() => {
    // If current selected timeSlot is no longer eligible, clear it
    if (!formData.timeSlot) return;
    if (!eligibleSlots.includes(formData.timeSlot)) {
      setFormData((prev) => ({ ...prev, timeSlot: "" }));
    }
  }, [formData.timeSlot, formData.appointmentDate, availableSlots]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const bookingData = {
        tests: selectedTests,
        appointmentDate: formData.appointmentDate,
        timeSlot: formData.timeSlot,
        phoneNumber: formData.phoneNumber,
        paymentMethod: formData.paymentMethod,
        homeCollection: formData.homeCollection,
        notes: formData.notes,
      };

      await axiosInstance.post("/lab-bookings", bookingData);
      toast.success("Lab booking created successfully!");
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  const homeCollectionCharge = formData.homeCollection.required ? 500 : 0;
  const finalAmount = totalAmount + homeCollectionCharge;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Book Lab Tests</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selected Tests Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Selected Tests</h3>
              {selectedTests.map((test) => (
                <div key={test.testId} className="flex justify-between text-sm">
                  <span>{test.testName} (x{test.quantity})</span>
                  <span>৳{test.price * test.quantity}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 font-semibold flex justify-between">
                <span>Total Amount:</span>
                <span>৳{finalAmount}</span>
              </div>
            </div>

            {/* Appointment Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Appointment Date
                </label>
                <input
                  type="date"
                  min={getLocalYmd(new Date())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.appointmentDate}
                  onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Slot
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.timeSlot}
                  onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                  required
                  disabled={!formData.appointmentDate || isSlotsLoading}
                >
                  <option value="">
                    {isSlotsLoading
                      ? "Loading time slots..."
                      : !formData.appointmentDate
                        ? "Select a date first"
                        : "Select Time Slot"}
                  </option>
                  {eligibleSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
                {formData.appointmentDate && !isSlotsLoading && eligibleSlots.length === 0 && (
                  <p className="text-sm text-red-600 mt-1">No available time slots for the selected date.</p>
                )}
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="Enter your phone number"
                required
              />
            </div>

            {/* Home Collection */}
            <div>
              <div className="flex items-center mb-3">
                <input
                  type="checkbox"
                  id="homeCollection"
                  className="mr-2"
                  checked={formData.homeCollection.required}
                  onChange={(e) => setFormData({
                    ...formData,
                    homeCollection: { ...formData.homeCollection, required: e.target.checked }
                  })}
                />
                <label htmlFor="homeCollection" className="text-sm font-medium text-gray-700">
                  Home Collection (+৳500)
                </label>
              </div>
              {formData.homeCollection.required && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Collection Address
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                    value={formData.homeCollection.address}
                    onChange={(e) => setFormData({
                      ...formData,
                      homeCollection: { ...formData.homeCollection, address: e.target.value }
                    })}
                    placeholder="Enter collection address"
                    required={formData.homeCollection.required}
                  />
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              >
                <option value="cash_on_delivery">Cash on Delivery</option>
                <option value="online">Online Payment</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any special instructions or requirements..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Booking..." : `Book Tests - ৳${finalAmount}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LabTestsPage;
