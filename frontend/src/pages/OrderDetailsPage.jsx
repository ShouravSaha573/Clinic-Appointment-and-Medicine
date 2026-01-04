import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOrderStore } from "../store/useOrderStore";
import { useAuthStore } from "../store/useAuthStore";
import {
  ArrowLeftIcon,
  PackageIcon,
  TruckIcon,
  CreditCardIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "lucide-react";

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  const {
    currentOrder: order,
    isLoading,
    fetchOrderById,
    cancelOrder,
    getStatusBadge,
    getPaymentStatusBadge,
  } = useOrderStore();

  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);

  useEffect(() => {
    if (authUser && orderId) {
      fetchOrderById(orderId);
    }
  }, [authUser, orderId, fetchOrderById]);

  // Keep order status reasonably fresh so admin updates reflect here.
  useEffect(() => {
    if (!authUser || !orderId) return;

    const intervalId = setInterval(() => {
      // Avoid background refetches when tab isn't visible.
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      fetchOrderById(orderId);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [authUser, orderId, fetchOrderById]);

  const handleCancelOrder = async (e) => {
    e.preventDefault();
    const result = await cancelOrder(orderId, cancelReason || "Customer request");
    if (result.success) {
      setShowCancelForm(false);
      setCancelReason("");
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "delivered":
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
      case "cancelled":
        return <XCircleIcon className="w-6 h-6 text-red-500" />;
      case "out_for_delivery":
        return <TruckIcon className="w-6 h-6 text-blue-500" />;
      default:
        return <ClockIcon className="w-6 h-6 text-yellow-500" />;
    }
  };

  const getStatusSteps = () => {
    const steps = [
      { key: "pending", label: "Order Placed", description: "Your order has been placed" },
      { key: "confirmed", label: "Confirmed", description: "Order confirmed by pharmacy" },
      { key: "preparing", label: "Preparing", description: "Your medicines are being prepared" },
      { key: "out_for_delivery", label: "Out for Delivery", description: "Order is on the way" },
      { key: "delivered", label: "Delivered", description: "Order has been delivered" },
    ];

    if (!order) return steps;

    const statusKey = order.orderStatus || order.status || "pending";
    const currentIndex = steps.findIndex((step) => step.key === statusKey);
    
    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex && statusKey !== "cancelled",
      active: index === currentIndex && statusKey !== "cancelled",
    }));
  };

  if (!authUser) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <PackageIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Login</h2>
            <p className="text-gray-600 mb-8">You need to login to view order details</p>
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <PackageIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h2>
            <p className="text-gray-600 mb-8">The order you're looking for doesn't exist or you don't have access to it</p>
            <button
              onClick={() => navigate("/orders")}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              View All Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(order.orderStatus || order.status);
  const paymentBadge = getPaymentStatusBadge(order.paymentStatus);
  const statusSteps = getStatusSteps();

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/orders")}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Orders
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Order #{order._id.slice(-8).toUpperCase()}
              </h1>
              <div className="flex items-center gap-2 text-gray-600 mt-1">
                <CalendarIcon className="w-4 h-4" />
                <span>Placed on {formatDate(order.createdAt)}</span>
              </div>
            </div>
            
            <div className="mt-4 sm:mt-0 flex items-center gap-3">
              {getStatusIcon(order.orderStatus || order.status)}
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
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
            </div>
          </div>
        </div>

        {/* Order Progress */}
        {(order.orderStatus || order.status) !== "cancelled" && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Progress</h2>
            
            <div className="relative">
              {statusSteps.map((step, index) => (
                <div key={step.key} className="flex items-start">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                        step.completed
                          ? "bg-green-600 border-green-600 text-white"
                          : step.active
                          ? "bg-green-100 border-green-600 text-green-700"
                          : "bg-gray-100 border-gray-300 text-gray-400"
                      }`}
                    >
                      {step.completed ? (
                        <CheckCircleIcon className="w-6 h-6" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    {index < statusSteps.length - 1 && (
                      <div
                        className={`w-0.5 h-16 mt-2 ${
                          step.completed ? "bg-blue-600" : "bg-gray-300"
                        }`}
                      />
                    )}
                  </div>
                  
                  <div className="ml-4 pb-8">
                    <h3
                      className={`font-medium ${
                        step.completed || step.active ? "text-gray-900" : "text-gray-500"
                      }`}
                    >
                      {step.label}
                    </h3>
                    <p
                      className={`text-sm ${
                        step.completed || step.active ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inactive Order Info (no "cancelled" wording) */}
        {(order.orderStatus || order.status) === "cancelled" && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <XCircleIcon className="w-6 h-6 text-gray-500 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">Order Update</h3>
                <p className="text-sm text-gray-600 mt-1">This order is no longer active.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Order Items ({order.items.length})
                </h2>
              </div>
              
              <div className="p-6 space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-400 text-2xl">💊</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900">
                        {item.name || item.medicine?.name || "Unknown Medicine"}
                      </h3>
                      {item.medicine?.genericName && (
                        <p className="text-sm text-gray-600">
                          Generic: {item.medicine.genericName}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-gray-600">
                          Qty: {item.quantity}
                        </span>
                        <span className="text-sm text-gray-600">
                          Price: ৳{Number(item.price || 0).toFixed(2)}
                        </span>
                      </div>
                      {/* Prescription requirement removed for demo
                      {item.medicine.requiresPrescription && (
                        <p className="text-xs text-orange-600 mt-1">
                          ⚠️ Prescription Required
                        </p>
                      )}
                      */}
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        ৳{(Number(item.quantity || 0) * Number(item.price || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary & Details */}
          <div className="space-y-6">
            {/* Payment & Total */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Payment Details</h2>
              </div>
              
              <div className="p-6 space-y-4">
                {(() => {
                  const deliveryFee = Number(order?.deliveryFee || 0);
                  const discount = Number(order?.discount || 0);
                  const subtotal = Number.isFinite(Number(order?.subtotal))
                    ? Number(order.subtotal)
                    : (Array.isArray(order?.items)
                        ? order.items.reduce(
                            (sum, it) => sum + Number(it?.quantity || 0) * Number(it?.price || 0),
                            0
                          )
                        : 0);
                  const computedTotal = subtotal + deliveryFee - discount;

                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">৳{subtotal.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Delivery Fee</span>
                        <span className="font-medium">৳{deliveryFee.toFixed(2)}</span>
                      </div>

                      {discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Discount</span>
                          <span className="font-medium">-৳{discount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between">
                          <span className="text-base font-semibold text-gray-900">Total</span>
                          <span className="text-base font-semibold text-gray-900">৳{computedTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCardIcon className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Payment Method</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {order.paymentMethod.replace("_", " ").toUpperCase()}
                  </p>
                  
                  <div className="mt-2">
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
                      {paymentBadge.text}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <TruckIcon className="w-5 h-5 mr-2" />
                  Delivery Address
                </h2>
              </div>
              
              <div className="p-6">
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="font-medium text-gray-900">{authUser.fullName}</p>
                  <p>{order.deliveryAddress.address}</p>
                  <p className="font-medium pt-2">
                    Phone: {order.deliveryAddress.phone}
                  </p>
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

            {/* Cancel UI removed */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsPage;
