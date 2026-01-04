import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Medicine",
    required: true,
  },
  name: String,
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  total: {
    type: Number,
    required: true,
  },
});

const deliveryAddressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  email: String,
  address: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  zipCode: {
    type: String,
    required: true,
  },
  landmark: String,
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      // Remove required: true, let pre-save hook handle it
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [orderItemSchema],
    deliveryAddress: deliveryAddressSchema,
    subtotal: {
      type: Number,
      required: true,
    },
    deliveryFee: {
      type: Number,
      default: 50, // 50 BDT delivery fee
    },
    discount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["cash_on_delivery", "bkash", "nagad", "rocket", "card"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentDetails: {
      transactionId: String,
      paymentGateway: String,
      paymentDate: Date,
    },
    orderStatus: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"],
      default: "pending",
    },
    prescriptionRequired: {
      type: Boolean,
      default: false,
    },
    prescriptionImage: String,
    estimatedDelivery: Date,
    actualDelivery: Date,
    notes: String,
    cancellationReason: String,
    tracking: [{
      status: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
      note: String,
    }],
  },
  {
    timestamps: true,
  }
);

// Generate order number before saving
orderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    const date = new Date();
    const dateString = date.getFullYear().toString() + 
                      (date.getMonth() + 1).toString().padStart(2, '0') + 
                      date.getDate().toString().padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.orderNumber = `MED${dateString}${randomNum}`;
  }
  next();
});

// Add initial tracking entry
orderSchema.pre("save", function (next) {
  if (this.isNew) {
    this.tracking.push({
      status: "pending",
      note: "Order placed successfully",
    });
  }
  next();
});

// Indexes for efficient admin queries
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;
