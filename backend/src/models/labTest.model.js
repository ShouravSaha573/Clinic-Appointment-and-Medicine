import mongoose from "mongoose";

// Lab Test Category Schema
const labTestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Blood Test",
        "Urine Test", 
        "Imaging",
        "Cardiology",
        "Pathology",
        "Biochemistry",
        "Microbiology",
        "Immunology",
        "Other"
      ],
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    preparationInstructions: {
      type: String,
      default: "",
    },
    sampleType: {
      type: String,
      enum: ["Blood", "Urine", "Stool", "Saliva", "Tissue", "Other"],
      required: true,
    },
    fastingRequired: {
      type: Boolean,
      default: false,
    },
    reportDeliveryTime: {
      type: String,
      default: "24 hours",
    },
    normalRange: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    availableDays: {
      type: [String],
      default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    },
    availableTimeSlots: {
      type: [String],
      default: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better search performance
labTestSchema.index({ name: "text", description: "text" });
labTestSchema.index({ category: 1 });
//labTestSchema.index({ code: 1 });

const LabTest = mongoose.model("LabTest", labTestSchema);

export default LabTest;
