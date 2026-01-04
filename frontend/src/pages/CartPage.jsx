import { useState, useEffect } from "react";
import { useCartStore } from "../store/useCartStore";
import { useOrderStore } from "../store/useOrderStore";
import { useAuthStore } from "../store/useAuthStore";
import { Trash2Icon, PlusIcon, MinusIcon, ShoppingBagIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const CartPage = () => {
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  const {
    cart,
    isLoading: cartLoading,
    fetchCart,
    updateCartItem,
    removeFromCart,
    clearCart,
  } = useCartStore();

  const { createOrder, isCreating } = useOrderStore();

  const [shippingAddress, setShippingAddress] = useState({
    address: "",
    phone: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    if (authUser) {
      fetchCart();
    }
  }, [authUser, fetchCart]);

  const handleQuantityChange = async (medicineId, newQuantity) => {
    if (newQuantity < 1) return;
    await updateCartItem(medicineId, newQuantity);
  };

  const handleRemoveItem = async (medicineId) => {
    await removeFromCart(medicineId);
  };

  const handleProceedToCheckout = () => {
    if (!authUser) {
      toast.error("Please login to proceed with checkout");
      navigate("/login");
      return;
    }
    setShowCheckout(true);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    
    if (!cart || cart.items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    // Validate shipping address
    const requiredFields = ['address', 'phone'];
    const missingFields = requiredFields.filter(field => !shippingAddress[field].trim());
    
    if (missingFields.length > 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    const orderData = {
      items: cart.items.map(item => ({
        medicine: item.medicine._id,
        quantity: item.quantity,
        price: item.price
      })),
      shippingAddress,
      paymentMethod,
      totalAmount: cart.totalAmount
    };

    const result = await createOrder(orderData);
    
    if (result.success) {
      clearCart();
      navigate(`/orders/${result.order._id}`);
    }
  };

  if (!authUser) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <ShoppingBagIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Login</h2>
            <p className="text-gray-600 mb-8">You need to login to view your cart</p>
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

  if (cartLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 bg-gray-200 rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-8 w-24 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <ShoppingBagIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">Add some medicines to get started</p>
            <button
              onClick={() => navigate("/medicines")}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Medicines
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Cart Items ({cart.items.length})
                </h2>
              </div>

              <div className="p-6 space-y-6">
                {cart.items.map((item) => (
                  <div key={item._id} className="flex items-center space-x-4 border-b border-gray-100 pb-6 last:border-b-0">
                    {/* Medicine Image */}
                    <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-400 text-2xl">💊</span>
                    </div>

                    {/* Medicine Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900 truncate">
                        {item.medicine.name}
                      </h3>
                      {item.medicine.genericName && (
                        <p className="text-sm text-gray-600">
                          {item.medicine.genericName}
                        </p>
                      )}
                      <p className="text-sm text-blue-600">
                        ৳{item.price} per {item.medicine.unit}
                      </p>
                      {/* Prescription requirement removed for demo
                      {item.medicine.requiresPrescription && (
                        <p className="text-xs text-orange-600">
                          ⚠️ Prescription Required
                        </p>
                      )}
                      */}
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleQuantityChange(item.medicine._id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="p-1 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <MinusIcon className="w-4 h-4" />
                      </button>
                      
                      <span className="w-12 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      
                      <button
                        onClick={() => handleQuantityChange(item.medicine._id, item.quantity + 1)}
                        disabled={item.quantity >= item.medicine.stock}
                        className="p-1 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Item Total */}
                    <div className="text-right">
                      <p className="text-base font-semibold text-gray-900">
                        ৳{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => handleRemoveItem(item.medicine._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2Icon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm sticky top-24">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">৳{cart.totalAmount.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-medium">৳50.00</span>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-base font-semibold text-gray-900">Total</span>
                    <span className="text-base font-semibold text-gray-900">
                      ৳{(cart.totalAmount + 50).toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleProceedToCheckout}
                  disabled={showCheckout}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {showCheckout ? "Proceed Below" : "Proceed to Checkout"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Checkout Form */}
        {showCheckout && (
          <div className="mt-12">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Checkout</h2>
              </div>

              <form onSubmit={handlePlaceOrder} className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Shipping Address */}
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">
                      Delivery Information
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Complete Address *
                        </label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Enter your complete delivery address..."
                          value={shippingAddress.address}
                          onChange={(e) => setShippingAddress({
                            ...shippingAddress,
                            address: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="Enter your phone number"
                          value={shippingAddress.phone}
                          onChange={(e) => setShippingAddress({
                            ...shippingAddress,
                            phone: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">
                      Payment Method
                    </h3>
                    
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="cash_on_delivery"
                          checked={paymentMethod === "cash_on_delivery"}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">
                          Cash on Delivery
                        </span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="online_payment"
                          checked={paymentMethod === "online_payment"}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">
                          Online Payment (bKash/Nagad/Card)
                        </span>
                      </label>
                    </div>

                    {paymentMethod === "online_payment" && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          📱 Online payment integration coming soon! For now, please use Cash on Delivery.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      type="button"
                      onClick={() => setShowCheckout(false)}
                      className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Back to Cart
                    </button>
                    
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCreating ? "Placing Order..." : "Place Order"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
