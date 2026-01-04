import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    genericName: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    dosage: {
      type: String,
      required: true,
    },
    form: {
      type: String,
      required: true,
      enum: ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Drops", "Inhaler"],
    },
    strength: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPrice: {
      type: Number,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    minStock: {
      type: Number,
      default: 10,
    },
    image: {
      type: String,
      default: "",
    },
    manufacturer: {
      type: String,
      required: true,
    },
    manufacturingDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    batchNumber: {
      type: String,
      required: true,
    },
    prescriptionRequired: {
      type: Boolean,
      default: false,
    },
    sideEffects: [{
      type: String,
    }],
    contraindications: [{
      type: String,
    }],
    instructions: {
      type: String,
      maxlength: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tags: [{
      type: String,
    }],
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient searches
medicineSchema.index({ name: "text", genericName: "text", brand: "text" });
medicineSchema.index({ category: 1 });
medicineSchema.index({ price: 1 });
medicineSchema.index({ isActive: 1 });
medicineSchema.index({ expiryDate: 1 });
medicineSchema.index({ createdAt: -1 });
medicineSchema.index({ category: 1, price: 1 }); // Compound index for category + price filtering
medicineSchema.index({ isActive: 1, category: 1 }); // Compound index for active medicines by category

// Virtual for checking if medicine is expired
medicineSchema.virtual("isExpired").get(function () {
  return this.expiryDate < new Date();
});

// Virtual for checking if medicine is low stock
medicineSchema.virtual("isLowStock").get(function () {
  return this.stock <= this.minStock;
});

// Virtual for effective price (considering discount)
medicineSchema.virtual("effectivePrice").get(function () {
  return this.discountPrice && this.discountPrice < this.price ? this.discountPrice : this.price;
});

// Normalize legacy category values so any update (including stock-only) won't fail validation.
medicineSchema.pre("validate", function (next) {
  if (typeof this.category === "string") {
    const raw = this.category.trim();
    if (raw === "Other") this.category = "Others";
    if (raw === "Vitamins") this.category = "Vitamin";
    if (raw === "Antibiotics") this.category = "Antibiotic";
  }
  next();
});

const Medicine = mongoose.model("Medicine", medicineSchema);

export default Medicine;
