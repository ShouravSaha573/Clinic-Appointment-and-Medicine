import { useState, useEffect } from "react";
import { useOrderStore } from "../store/useOrderStore";
import { useAuthStore } from "../store/useAuthStore";
import { PackageIcon, CalendarIcon, CreditCardIcon, TruckIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

const OrdersPage = () => {
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  const {
    orders,
    isLoading,
    pagination,
    fetchOrders,
    getStatusBadge,
    getPaymentStatusBadge,
  } = useOrderStore();

  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (authUser) {
      fetchOrders(1, statusFilter);
    }
  }, [authUser, statusFilter, fetchOrders]);

  // Periodically refresh list so status changes by admin show up.
  useEffect(() => {
    if (!authUser) return;

    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      const currentPage = pagination?.current || 1;
      fetchOrders(currentPage, statusFilter);
    }, 15000);

    return () => clearInterval(intervalId);
  }, [authUser, fetchOrders, pagination?.current, statusFilter]);

  const handlePageChange = (page) => {
    fetchOrders(page, statusFilter);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!authUser) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <PackageIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Login</h2>
            <p className="text-gray-600 mb-8">You need to login to view your orders</p>
            <button
              onClick={() => navigate("/login")}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Login Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">Track and manage your medicine orders</p>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { value: "all", label: "All Orders" },
              { value: "pending", label: "Pending" },
              { value: "confirmed", label: "Confirmed" },
              { value: "preparing", label: "Preparing" },
              { value: "out_for_delivery", label: "Out for Delivery" },
              { value: "delivered", label: "Delivered" },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === filter.value
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                <div className="animate-pulse">
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <PackageIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 mb-8">
              {statusFilter === "all"
                ? "You haven't placed any orders yet"
                : `No ${statusFilter} orders found`}
            </p>
            <button
              onClick={() => navigate("/medicines")}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders
              .filter((o) => (o?.orderStatus || o?.status) !== "cancelled")
              .map((order) => {
              const statusBadge = getStatusBadge(order.orderStatus || order.status);
              const paymentBadge = getPaymentStatusBadge(order.paymentStatus);

              return (
                <div key={order._id} className="bg-white rounded-lg shadow-sm">
                  {/* Order Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4 lg:mb-0">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Order #{order._id.slice(-8).toUpperCase()}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CalendarIcon className="w-4 h-4" />
                            <span>{formatDate(order.createdAt)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              statusBadge.color === "success"
                                ? "bg-green-100 text-green-800"
                                : statusBadge.color === "warning"
                                ? "bg-yellow-100 text-yellow-800"
                                : statusBadge.color === "error"
                                ? "bg-red-100 text-red-800"
                                : statusBadge.color === "info"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {statusBadge.text}
                          </span>

                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              paymentBadge.color === "success"
                                ? "bg-green-100 text-green-800"
                                : paymentBadge.color === "warning"
                                ? "bg-yellow-100 text-yellow-800"
                                : paymentBadge.color === "error"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            <CreditCardIcon className="w-3 h-3 mr-1" />
                            {paymentBadge.text}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold text-gray-900">
                          ৳{(order.totalAmount || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Items List */}
                      <div className="lg:col-span-2">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                          Items ({order.items?.length || 0})
                        </h4>
                        <div className="space-y-3">
                          {order.items?.map((item, index) => (
                            <div key={index} className="flex items-center space-x-3">
                              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-blue-400 text-lg">💊</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {item.name || item.medicine?.name || "Unknown Medicine"}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {(() => {
                                    const qty = Number(item?.quantity || 0);
                                    const unitPrice = Number(
                                      item?.price ?? item?.medicine?.discountPrice ?? item?.medicine?.price ?? 0
                                    );
                                    const safeUnitPrice = Number.isFinite(unitPrice) ? unitPrice : 0;
                                    return `Qty: ${qty} × ৳${safeUnitPrice.toFixed(2)}`;
                                  })()}
                                </p>
                              </div>
                              <div className="text-sm font-medium text-gray-900">
                                {(() => {
                                  const qty = Number(item?.quantity || 0);
                                  const unitPrice = Number(
                                    item?.price ?? item?.medicine?.discountPrice ?? item?.medicine?.price ?? 0
                                  );
                                  const safeUnitPrice = Number.isFinite(unitPrice) ? unitPrice : 0;
                                  const total = qty * safeUnitPrice;
                                  return `৳${total.toFixed(2)}`;
                                })()}
                              </div>
                            </div>
                          )) || (
                            <p className="text-gray-500 italic">No items found</p>
                          )}
                        </div>
                      </div>

                      {/* Shipping Info */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                          <TruckIcon className="w-4 h-4 mr-2" />
                          Delivery Address
                        </h4>
                        <div className="text-sm text-gray-600 space-y-1">
                          {order.deliveryAddress ? (
                            <>
                              <p>{order.deliveryAddress.address || 'N/A'}</p>
                              <p>
                                {order.deliveryAddress.city || 'N/A'}, {order.deliveryAddress.state || 'N/A'}
                              </p>
                              <p>{order.deliveryAddress.zipCode || 'N/A'}</p>
                              <p className="font-medium">
                                Phone: {order.deliveryAddress.phone || 'N/A'}
                              </p>
                            </>
                          ) : (
                            <p className="text-gray-500 italic">No delivery address provided</p>
                          )}
                        </div>

                        {order.trackingNumber && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <p className="text-xs font-medium text-blue-800 mb-1">
                              Tracking Number
                            </p>
                            <p className="text-sm font-mono text-blue-900">
                              {order.trackingNumber}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Order Footer */}
                  <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-600">
                        Payment Method: {order.paymentMethod?.replace("_", " ").toUpperCase() || 'Not specified'}
                      </div>
                      <button
                        onClick={() => navigate(`/orders/${order._id}`)}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-12 flex justify-center">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.current - 1)}
                disabled={!pagination.hasPrev}
                className={`px-3 py-2 rounded-lg ${
                  pagination.hasPrev
                    ? "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                Previous
              </button>

              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 rounded-lg ${
                    page === pagination.current
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(pagination.current + 1)}
                disabled={!pagination.hasNext}
                className={`px-3 py-2 rounded-lg ${
                  pagination.hasNext
                    ? "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
