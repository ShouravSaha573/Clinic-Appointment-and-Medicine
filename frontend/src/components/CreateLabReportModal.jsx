import { useState, useEffect } from 'react';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';
import { X, Plus, Trash2, Save, FileText } from 'lucide-react';

const CreateLabReportModal = ({ isOpen, onClose, onSuccess, labBookings }) => {
  const [formData, setFormData] = useState({
    labBooking: '',
    patient: '',
    testResults: [],
    overallStatus: 'normal',
    testedBy: {
      name: 'Lab Technician',
      designation: 'Lab Technician'
    },
    verifiedBy: {
      name: 'Dr. Pathologist',
      designation: 'Pathologist'
    },
    additionalNotes: '',
    deliveryMethod: 'online',
    isReportReady: true
  });

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(false);

  const parseSlotMinutes = (timeStr) => {
    const s = String(timeStr || "").trim();
    const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ampm = m[3].toUpperCase();
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return h * 60 + min;
  };

  const getSlotEndMinutes = (slot) => {
    const parts = String(slot || "").split("-").map((p) => p.trim());
    if (parts.length < 2) return null;
    return parseSlotMinutes(parts[1]);
  };

  const isBookingOverdue = (booking) => {
    if (!booking?.appointmentDate || !booking?.timeSlot) return false;
    const status = String(booking.status || "").toLowerCase();
    if (status !== "pending" && status !== "confirmed") return false;

    const endMinutes = getSlotEndMinutes(booking.timeSlot);
    if (endMinutes === null) return false;

    const d = new Date(booking.appointmentDate);
    if (Number.isNaN(d.getTime())) return false;

    const endTime = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      Math.floor(endMinutes / 60),
      endMinutes % 60,
      0,
      0
    );
    return Date.now() > endTime.getTime();
  };

  const eligibleBookings = Array.isArray(labBookings)
    ? labBookings.filter((b) => {
        const status = String(b?.status || "").toLowerCase();
        if (status !== "completed") return false;
        if (status === "cancelled") return false;
        if (isBookingOverdue(b)) return false;
        return true;
      })
    : [];

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        labBooking: '',
        patient: '',
        testResults: [],
        overallStatus: 'normal',
        testedBy: {
          name: 'Lab Technician',
          designation: 'Lab Technician'
        },
        verifiedBy: {
          name: 'Dr. Pathologist',
          designation: 'Pathologist'
        },
        additionalNotes: '',
        deliveryMethod: 'online',
        isReportReady: true
      });
      setSelectedBooking(null);
    }
  }, [isOpen]);

  // Handle booking selection
  const handleBookingSelect = (bookingId) => {
    const booking = eligibleBookings.find((b) => b._id === bookingId);
    if (booking) {
      setSelectedBooking(booking);
      setFormData(prev => ({
        ...prev,
        labBooking: bookingId,
        patient: booking.userId?._id || '',
        testResults: booking.tests?.map(test => ({
          testName: test.testId?.name || test.name || 'Unknown Test',
          testCode: test.testId?.code || test.code || 'N/A',
          result: '',
          unit: '',
          normalRange: test.testId?.normalRange || '',
          status: 'normal',
          remarks: ''
        })) || []
      }));
    }
  };

  // Handle test result change
  const handleTestResultChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      testResults: prev.testResults.map((result, i) => 
        i === index ? { ...result, [field]: value } : result
      )
    }));
  };

  // Add new test result
  const addTestResult = () => {
    setFormData(prev => ({
      ...prev,
      testResults: [
        ...prev.testResults,
        {
          testName: '',
          testCode: '',
          result: '',
          unit: '',
          normalRange: '',
          status: 'normal',
          remarks: ''
        }
      ]
    }));
  };

  // Remove test result
  const removeTestResult = (index) => {
    setFormData(prev => ({
      ...prev,
      testResults: prev.testResults.filter((_, i) => i !== index)
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.labBooking) {
      toast.error('Please select a lab booking');
      return;
    }

    if (formData.testResults.length === 0) {
      toast.error('Please add at least one test result');
      return;
    }

    // Validate test results
    const invalidResults = formData.testResults.some(result => 
      !result.testName.trim() || !result.result.trim()
    );

    if (invalidResults) {
      toast.error('Please fill in test name and result for all tests');
      return;
    }

    try {
      setLoading(true);
      
      const reportData = {
        ...formData,
        verifiedBy: {
          ...formData.verifiedBy,
          verifiedAt: new Date()
        }
      };

      await axiosInstance.post('/lab-reports/admin/create-flexible', reportData);
      
      toast.success('Lab report created successfully!');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create lab report');
      console.error('Error creating lab report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-4xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-xl flex items-center gap-2">
            <FileText className="size-6" />
            Create Lab Report
          </h3>
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost"
            disabled={loading}
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Lab Booking Selection */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Select Lab Booking *</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={formData.labBooking}
              onChange={(e) => handleBookingSelect(e.target.value)}
              required
            >
              <option value="">Choose a lab booking...</option>
              {eligibleBookings.map((booking) => (
                <option key={booking._id} value={booking._id}>
                  #{booking.bookingNumber} - {booking.userId?.fullName || 'Unknown Patient'} 
                  ({new Date(booking.appointmentDate).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {/* Selected Booking Info */}
          {selectedBooking && (
            <div className="bg-base-200 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Booking Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Patient:</strong> {selectedBooking.userId?.fullName || 'Unknown'}
                </div>
                <div>
                  <strong>Phone:</strong> {selectedBooking.phoneNumber}
                </div>
                <div>
                  <strong>Date:</strong> {new Date(selectedBooking.appointmentDate).toLocaleDateString()}
                </div>
                <div>
                  <strong>Time:</strong> {selectedBooking.timeSlot}
                </div>
                <div className="md:col-span-2">
                  <strong>Tests:</strong> {selectedBooking.tests?.map(test => 
                    test.testId?.name || test.name || 'Unknown Test'
                  ).join(', ')}
                </div>
              </div>
            </div>
          )}

          {/* Test Results */}
          <div className="form-control">
            <div className="flex items-center justify-between mb-2">
              <label className="label">
                <span className="label-text font-medium">Test Results *</span>
              </label>
              <button
                type="button"
                onClick={addTestResult}
                className="btn btn-sm btn-primary gap-2"
                disabled={loading}
              >
                <Plus className="size-4" />
                Add Test
              </button>
            </div>

            <div className="space-y-4">
              {formData.testResults.map((result, index) => (
                <div key={index} className="border border-base-300 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium">Test {index + 1}</h5>
                    <button
                      type="button"
                      onClick={() => removeTestResult(index)}
                      className="btn btn-sm btn-error btn-outline"
                      disabled={loading}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Test Name *</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered input-sm"
                        value={result.testName}
                        onChange={(e) => handleTestResultChange(index, 'testName', e.target.value)}
                        placeholder="e.g., Blood Sugar"
                        required
                      />
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Test Code</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered input-sm"
                        value={result.testCode}
                        onChange={(e) => handleTestResultChange(index, 'testCode', e.target.value)}
                        placeholder="e.g., BS001"
                      />
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Result *</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered input-sm"
                        value={result.result}
                        onChange={(e) => handleTestResultChange(index, 'result', e.target.value)}
                        placeholder="e.g., 95"
                        required
                      />
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Unit</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered input-sm"
                        value={result.unit}
                        onChange={(e) => handleTestResultChange(index, 'unit', e.target.value)}
                        placeholder="e.g., mg/dL"
                      />
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Normal Range</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered input-sm"
                        value={result.normalRange}
                        onChange={(e) => handleTestResultChange(index, 'normalRange', e.target.value)}
                        placeholder="e.g., 70-100 mg/dL"
                      />
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Status</span>
                      </label>
                      <select
                        className="select select-bordered select-sm"
                        value={result.status}
                        onChange={(e) => handleTestResultChange(index, 'status', e.target.value)}
                      >
                        <option value="normal">Normal</option>
                        <option value="abnormal">Abnormal</option>
                        <option value="borderline">Borderline</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-control mt-3">
                    <label className="label">
                      <span className="label-text">Remarks</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered textarea-sm"
                      value={result.remarks}
                      onChange={(e) => handleTestResultChange(index, 'remarks', e.target.value)}
                      placeholder="Additional notes for this test..."
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Overall Status */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Overall Status</span>
            </label>
            <select
              className="select select-bordered"
              value={formData.overallStatus}
              onChange={(e) => setFormData(prev => ({ ...prev, overallStatus: e.target.value }))}
            >
              <option value="normal">Normal</option>
              <option value="abnormal">Abnormal</option>
              <option value="pending_review">Pending Review</option>
            </select>
          </div>

          {/* Staff Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Tested By</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.testedBy.name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  testedBy: { ...prev.testedBy, name: e.target.value }
                }))}
                placeholder="Technician name"
              />
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Verified By</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.verifiedBy.name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  verifiedBy: { ...prev.verifiedBy, name: e.target.value }
                }))}
                placeholder="Doctor name"
              />
            </div>
          </div>

          {/* Additional Notes */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Additional Notes</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24"
              value={formData.additionalNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
              placeholder="Any additional notes or observations..."
            />
          </div>

          {/* Delivery Method */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Delivery Method</span>
            </label>
            <select
              className="select select-bordered"
              value={formData.deliveryMethod}
              onChange={(e) => setFormData(prev => ({ ...prev, deliveryMethod: e.target.value }))}
            >
              <option value="online">Online</option>
              <option value="email">Email</option>
              <option value="pickup">Pickup</option>
              <option value="home_delivery">Home Delivery</option>
            </select>
          </div>

          {/* Report Ready Checkbox */}
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="checkbox"
                checked={formData.isReportReady}
                onChange={(e) => setFormData(prev => ({ ...prev, isReportReady: e.target.checked }))}
              />
              <span className="label-text">Mark report as ready for delivery</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading || !formData.labBooking || formData.testResults.length === 0}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm mr-2"></span>
                  Creating Report...
                </>
              ) : (
                <>
                  <Save className="size-4 mr-2" />
                  Create Report
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLabReportModal;
