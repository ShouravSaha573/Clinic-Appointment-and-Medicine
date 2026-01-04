import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";
import Medicine from "../models/medicine.model.js";
import NotificationService from "../services/notificationService.js";

// Create new order from cart
export const createOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { shippingAddress, paymentMethod, prescriptionImage, notes } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({ user: userId, isActive: true })
      .populate("items.medicine");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Validate stock availability for all items
    const stockValidation = await Promise.all(
      cart.items.map(async (item) => {
        const medicine = await Medicine.findById(item.medicine._id);
        return {
          medicineId: item.medicine._id,
          available: medicine.stock >= item.quantity,
          availableStock: medicine.stock,
          requestedQuantity: item.quantity,
        };
      })
    );

    const outOfStockItems = stockValidation.filter(item => !item.available);
    if (outOfStockItems.length > 0) {
      return res.status(400).json({
        message: "Some items are out of stock",
        outOfStockItems,
      });
    }

    // Check if any item requires prescription - Skip this for demo
    // const prescriptionRequired = cart.items.some(item => item.medicine.prescriptionRequired);

    // if (prescriptionRequired && !prescriptionImage) {
    //   return res.status(400).json({
    //     message: "Prescription image is required for prescription medicines",
    //   });
    // }

    // Calculate totals
    const subtotal = cart.totalAmount;
    const deliveryFee = subtotal >= 1000 ? 0 : 50; // Free delivery for orders above 1000 BDT
    const discount = 0; // Can implement discount logic here
    const calculatedTotalAmount = subtotal + deliveryFee - discount;

    // Prepare order items
    const orderItems = cart.items.map((item) => ({
      medicine: item.medicine._id,
      name: item.medicine.name,
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 0),
      total: Number(item.price || 0) * Number(item.quantity || 0),
    }));

    // Map shipping address to delivery address format
    const deliveryAddress = {
      fullName: req.user.fullName, // Get from authenticated user
      phone: shippingAddress.phone,
      email: req.user.email,
      address: shippingAddress.address || shippingAddress.street || shippingAddress.addressLine || "", // Support multiple frontend shapes
      city: shippingAddress.city || "Dhaka", // Default city
      state: shippingAddress.state || "Dhaka", // Default state
      zipCode: shippingAddress.zipCode || "1000", // Default zip
      landmark: shippingAddress.landmark || "",
    };

    // Generate order number
    const date = new Date();
    const dateString = date.getFullYear().toString() + 
                      (date.getMonth() + 1).toString().padStart(2, '0') + 
                      date.getDate().toString().padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const orderNumber = `MED${dateString}${randomNum}`;

    // Create order
    const order = new Order({
      orderNumber,
      user: userId,
      items: orderItems,
      deliveryAddress,
      subtotal,
      deliveryFee,
      discount,
      totalAmount: calculatedTotalAmount,
      paymentMethod,
      prescriptionRequired: false, // Simplified for demo
      prescriptionImage: null,
      notes: notes || "",
      estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    });

    await order.save();

    // Update medicine stock
    await Promise.all(
      cart.items.map(async (item) => {
        await Medicine.findByIdAndUpdate(
          item.medicine._id,
          { $inc: { stock: -item.quantity } },
          { new: true }
        );
      })
    );

    // Clear cart
    cart.items = [];
    await cart.save();

    // Populate order for response
    await order.populate("items.medicine", "name brand image");
    await order.populate("user", "fullName email phone");

    // Create admin notification for new order
    try {
      await NotificationService.createOrderNotification(order);
    } catch (notificationError) {
      console.error("Failed to create notification for order:", notificationError);
      // Don't fail the order creation if notification fails
    }

    res.status(201).json({
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    console.log("Error in createOrder controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get user orders
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, status } = req.query;

    const query = { user: userId };
    if (status && status !== "all") {
      query.orderStatus = status;
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .populate("items.medicine", "name brand image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.status(200).json({
      orders,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.log("Error in getUserOrders controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get single order
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const order = await Order.findOne({ _id: id, user: userId })
      .populate("items.medicine", "name brand image category")
      .populate("user", "fullName email phone");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(order);
  } catch (error) {
    console.log("Error in getOrderById controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Cancel order
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const order = await Order.findOne({ _id: id, user: userId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!["pending", "confirmed"].includes(order.orderStatus)) {
      return res.status(400).json({ message: "Order cannot be cancelled" });
    }

    // Restore medicine stock
    await Promise.all(
      order.items.map(async (item) => {
        await Medicine.findByIdAndUpdate(
          item.medicine,
          { $inc: { stock: item.quantity } },
          { new: true }
        );
      })
    );

    order.orderStatus = "cancelled";
    order.cancellationReason = reason;
    order.tracking.push({
      status: "cancelled",
      note: `Order cancelled: ${reason}`,
    });

    await order.save();

    res.status(200).json({
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.log("Error in cancelOrder controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ADMIN CONTROLLERS

// Get all orders (Admin only)
export const getAllOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      paymentStatus, 
      paymentMethod,
      startDate,
      endDate 
    } = req.query;

    // Cap limit for performance
    const safeLimit = Math.min(parseInt(limit) || 20, 100);
    const safePage = Math.max(parseInt(page) || 1, 1);

    const query = {};

    if (status && status !== "all") {
      query.orderStatus = status;
    }

    if (paymentStatus && paymentStatus !== "all") {
      query.paymentStatus = paymentStatus;
    }

    if (paymentMethod && paymentMethod !== "all") {
      query.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (safePage - 1) * safeLimit;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("user", "fullName email profilePic")
        .populate("items.medicine", "name brand")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Order.countDocuments(query)
    ]);

    // Admin order list should be fresh (avoid browser/proxy caching).
    res.set("Cache-Control", "no-store");

    res.status(200).json({
      orders,
      pagination: {
        current: safePage,
        pages: Math.ceil(total / safeLimit),
        total,
        hasNext: safePage * safeLimit < total,
        hasPrev: safePage > 1,
      },
    });
  } catch (error) {
    console.log("Error in getAllOrders controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update order status (Admin only)
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const allowedStatuses = [
      "pending",
      "confirmed",
      "preparing",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Allowed: ${allowedStatuses.join(", ")}`,
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const previousStatus = order.orderStatus;
    if (previousStatus === status) {
      return res.status(200).json({
        message: "Order status unchanged",
        order,
      });
    }

    order.orderStatus = status;
    // Some older orders may not have `tracking` initialized.
    if (!Array.isArray(order.tracking)) {
      order.tracking = [];
    }

    order.tracking.push({
      status,
      note: note || `Order status updated to ${status}`,
    });

    if (status === "delivered") {
      order.actualDelivery = new Date();
    }

    await order.save();

    res.status(200).json({
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.log("Error in updateOrderStatus controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update payment status (Admin only)
export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, transactionId, paymentGateway } = req.body;

    const allowedPaymentStatuses = ["pending", "paid"];
    if (!allowedPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        message: `Invalid payment status. Allowed: ${allowedPaymentStatuses.join(", ")}`,
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.paymentStatus = paymentStatus;
    
    if (paymentStatus === "paid") {
      order.paymentDetails = {
        transactionId,
        paymentGateway,
        paymentDate: new Date(),
      };
    }

    await order.save();

    res.status(200).json({
      message: "Payment status updated successfully",
      order,
    });
  } catch (error) {
    console.log("Error in updatePaymentStatus controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get order analytics (Admin only)
export const getOrderAnalytics = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const analytics = await Promise.all([
      // Today's orders
      Order.countDocuments({
        createdAt: { $gte: startOfToday },
      }),
      
      // Today's revenue
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfToday }, paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      
      // Monthly orders
      Order.countDocuments({
        createdAt: { $gte: startOfMonth },
      }),
      
      // Monthly revenue
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfMonth }, paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      
      // Pending orders
      Order.countDocuments({ orderStatus: "pending" }),
      
      // Order status distribution
      Order.aggregate([
        { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
      ]),
    ]);

    res.status(200).json({
      todayOrders: analytics[0],
      todayRevenue: analytics[1][0]?.total || 0,
      monthlyOrders: analytics[2],
      monthlyRevenue: analytics[3][0]?.total || 0,
      pendingOrders: analytics[4],
      statusDistribution: analytics[5],
    });
  } catch (error) {
    console.log("Error in getOrderAnalytics controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
