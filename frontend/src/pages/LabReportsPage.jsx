import { useState, useEffect } from "react";
import { axiosInstance } from "../lib/axios";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";

const LabReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("reports");
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const { authUser } = useAuthStore();

  useEffect(() => {
    if (authUser) {
      fetchLabReports();
      fetchLabBookings();
    }
  }, [authUser]);

  const fetchLabReports = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/lab-reports/my-reports");
      setReports(response.data.reports || []);
    } catch (error) {
      console.log("Error fetching lab reports:", error);
      setReports([]);
      // Don't show toast error if it's just because the endpoint doesn't exist yet
      if (error.response?.status !== 404) {
        toast.error("Failed to fetch lab reports");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLabBookings = async () => {
    try {
      const response = await axiosInstance.get("/lab-bookings/my-bookings");
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.log("Error fetching lab bookings:", error);
      setBookings([]);
      // Don't show toast error if it's just because the endpoint doesn't exist yet
      if (error.response?.status !== 404) {
        toast.error("Failed to fetch lab bookings");
      }
    }
  };

  const handleViewReport = async (reportId) => {
    try {
      const response = await axiosInstance.get(`/lab-reports/${reportId}`);
      setSelectedReport(response.data);
      setShowReportModal(true);
    } catch (error) {
      console.log("Error fetching report details:", error);
      toast.error("Failed to fetch report details");
    }
  };

  const handleDownloadReport = async (reportId) => {
    try {
      const response = await axiosInstance.get(`/lab-reports/${reportId}/download`, {
        responseType: 'blob',
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lab_report_${reportId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.log("Error downloading report:", error);
      toast.error("Failed to download report");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      normal: "bg-green-100 text-green-800",
      abnormal: "bg-red-100 text-red-800",
      pending_review: "bg-orange-100 text-orange-800",
      verified: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      confirmed: "bg-blue-100 text-blue-800",
      sample_collected: "bg-purple-100 text-purple-800",
      processing: "bg-orange-100 text-orange-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      overdue_patient_not_present: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

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
    const s = String(slot || "");
    const parts = s.split("-").map((p) => p.trim());
    if (parts.length < 2) return null;
    return parseSlotMinutes(parts[1]);
  };

  const isLabBookingOverdue = (booking) => {
    if (!booking?.appointmentDate || !booking?.timeSlot) return false;
    const status = String(booking.status || "").toLowerCase();
    // Only consider overdue when it was still awaiting patient
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

  const getEffectiveBookingStatus = (booking) => {
    const isOverdue = isLabBookingOverdue(booking);
    return isOverdue ? "overdue_patient_not_present" : (booking?.status || "confirmed");
  };

  const getBookingStatusLabel = (booking) => {
    if (isLabBookingOverdue(booking)) return "OVERDUE - PATIENT WAS NOT PRESENT";
    const s = getEffectiveBookingStatus(booking);
    return String(s).replace(/_/g, " ").toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.log('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  if (!authUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">Please login to view your lab reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Lab Reports & Bookings</h1>
          <p className="text-gray-600">
            View your lab reports and track your test bookings
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("reports")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "reports"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Lab Reports ({reports.length})
              </button>
              <button
                onClick={() => setActiveTab("bookings")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "bookings"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Test Bookings ({bookings.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No reports available</h3>
                <p className="text-gray-500">Your lab reports will appear here once they are ready.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.filter(report => report && report._id).map((report) => (
                  <div key={report._id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            Report #{report.reportNumber || 'N/A'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Booking #{report.labBooking?.bookingNumber || 'N/A'}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.overallStatus || 'normal')}`}>
                          {(report.overallStatus || 'normal').replace('_', ' ').toUpperCase()}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Booking:</span>
                          <span className="font-medium">#{report.labBooking?.bookingNumber || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Test Date:</span>
                          <span className="font-medium">
                            {report.labBooking?.appointmentDate ? formatDate(report.labBooking.appointmentDate) : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Report Date:</span>
                          <span className="font-medium">{report.reportDate ? formatDate(report.reportDate) : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Status:</span>
                          <span className="font-medium">{report.overallStatus || 'Normal'}</span>
                        </div>
                        {report.verifiedBy?.verifiedAt && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Verified:</span>
                            <span className="font-medium text-green-600">{formatDate(report.verifiedBy.verifiedAt)}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <button
                          onClick={() => handleViewReport(report._id)}
                          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          View Report
                        </button>
                        {report.reportFiles && report.reportFiles.length > 0 && (
                          <button
                            onClick={() => handleDownloadReport(report._id)}
                            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            Download PDF
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === "bookings" && (
          <div>
            {bookings.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4v6m-2-4h6m0-6h6a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No bookings found</h3>
                <p className="text-gray-500">Your lab test bookings will appear here.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {bookings.filter(booking => booking && booking._id).map((booking) => {
                  const effectiveStatus = getEffectiveBookingStatus(booking);
                  const statusLabel = getBookingStatusLabel(booking);

                  return (
                  <div key={booking._id} className="bg-white rounded-lg shadow-sm border">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            Booking #{booking.bookingNumber || 'N/A'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {booking.appointmentDate ? formatDate(booking.appointmentDate) : 'N/A'} • {booking.timeSlot || 'N/A'}
                          </p>
                        </div>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(effectiveStatus)}`}>
                          {statusLabel}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Tests Booked</h4>
                          <div className="space-y-1">
                            {booking.tests && booking.tests.map((test, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{test.testId?.name || 'Unknown Test'} (x{test.quantity || 1})</span>
                                <span className="font-medium">৳{(test.testId?.price || 0) * (test.quantity || 1)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Patient:</strong> {booking.userId?.fullName || 'N/A'}</p>
                            <p><strong>Phone:</strong> {booking.phoneNumber || 'N/A'}</p>
                            <p><strong>Email:</strong> {booking.userId?.email || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t">
                        <div>
                          <span className="text-lg font-bold text-blue-600">
                            Total: ৳{booking.totalAmount || 0}
                          </span>
                          {booking.homeCollection?.required && (
                            <p className="text-sm text-gray-500">Includes home collection</p>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Report Modal */}
        {showReportModal && selectedReport && (
          <ReportModal
            report={selectedReport}
            onClose={() => {
              setShowReportModal(false);
              setSelectedReport(null);
            }}
            onDownload={() => handleDownloadReport(selectedReport._id)}
          />
        )}
      </div>
    </div>
  );
};

// Report Modal Component
const ReportModal = ({ report, onClose, onDownload }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Lab Report</h2>
              <p className="text-gray-600">Report #{report.reportNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Report Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Report Number:</span>
                  <span className="font-medium">{report.reportNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Booking:</span>
                  <span className="font-medium">#{report.labBooking?.bookingNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Report Date:</span>
                  <span className="font-medium">{new Date(report.reportDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Overall Status:</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    report.overallStatus === "normal" ? "bg-green-100 text-green-800" : 
                    report.overallStatus === "abnormal" ? "bg-red-100 text-red-800" :
                    "bg-yellow-100 text-yellow-800"
                  }`}>
                    {report.overallStatus?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Patient Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Patient:</span>
                  <span className="font-medium">{report.patient?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email:</span>
                  <span className="font-medium">{report.patient?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone:</span>
                  <span className="font-medium">{report.patient?.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Test Date:</span>
                  <span className="font-medium">
                    {new Date(report.labBooking?.appointmentDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Test Results */}
          {report.testResults && report.testResults.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Test Results</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 font-medium text-gray-900">Test Name</th>
                        <th className="text-left py-2 font-medium text-gray-900">Result</th>
                        <th className="text-left py-2 font-medium text-gray-900">Unit</th>
                        <th className="text-left py-2 font-medium text-gray-900">Normal Range</th>
                        <th className="text-left py-2 font-medium text-gray-900">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.testResults.map((testResult, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-2 font-medium">{testResult.testName}</td>
                          <td className="py-2">{testResult.result || "N/A"}</td>
                          <td className="py-2">{testResult.unit || ""}</td>
                          <td className="py-2 text-gray-600">{testResult.normalRange || ""}</td>
                          <td className="py-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              testResult.status === "normal" 
                                ? "bg-green-100 text-green-800"
                                : testResult.status === "abnormal" || testResult.status === "critical"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {testResult.status?.toUpperCase() || "NORMAL"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Additional Notes */}
          {report.additionalNotes && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Additional Notes</h3>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <p className="text-blue-800">{report.additionalNotes}</p>
              </div>
            </div>
          )}

          {/* Verification */}
          {report.verifiedBy && report.verifiedBy.name && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Verification</h3>
              <div className="bg-green-50 border-l-4 border-green-400 p-4">
                <p className="text-green-800">
                  Verified by {report.verifiedBy.name} ({report.verifiedBy.designation})
                  {report.verifiedBy.verifiedAt && ` on ${new Date(report.verifiedBy.verifiedAt).toLocaleDateString()}`}
                </p>
              </div>
            </div>
          )}

          {/* Tested By */}
          {report.testedBy && report.testedBy.name && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Laboratory Information</h3>
              <div className="bg-gray-50 border-l-4 border-gray-400 p-4">
                <p className="text-gray-800">
                  Tested by {report.testedBy.name} ({report.testedBy.designation})
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
            {report.reportFiles && report.reportFiles.length > 0 && (
              <button
                onClick={onDownload}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Download PDF
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabReportsPage;
