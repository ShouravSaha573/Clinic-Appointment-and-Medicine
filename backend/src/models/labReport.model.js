import mongoose from "mongoose";

const testResultSchema = new mongoose.Schema({
  testName: {
    type: String,
    required: true,
  },
  testCode: {
    type: String,
    required: true,
  },
  result: {
    type: String,
    required: true,
  },
  unit: {
    type: String,
    default: "",
  },
  normalRange: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["normal", "abnormal", "borderline", "critical"],
    default: "normal",
  },
  remarks: {
    type: String,
    default: "",
  },
});

const labReportSchema = new mongoose.Schema(
  {
    reportNumber: {
      type: String,
      unique: true,
      // Will be auto-generated
    },
    labBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LabBooking",
      required: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    testResults: [testResultSchema],
    overallStatus: {
      type: String,
      enum: ["normal", "abnormal", "pending_review"],
      default: "normal",
    },
    reportDate: {
      type: Date,
      default: Date.now,
    },
    testedBy: {
      name: {
        type: String,
        required: true,
      },
      designation: {
        type: String,
        default: "Lab Technician",
      },
      signature: {
        type: String, // URL to signature image
        default: "",
      },
    },
    verifiedBy: {
      name: {
        type: String,
        default: "",
      },
      designation: {
        type: String,
        default: "Pathologist",
      },
      signature: {
        type: String, // URL to signature image
        default: "",
      },
      verifiedAt: {
        type: Date,
      },
    },
    reportFiles: [
      {
        fileName: String,
        fileUrl: String,
        fileType: {
          type: String,
          enum: ["pdf", "image", "document"],
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      }
    ],
    additionalNotes: {
      type: String,
      default: "",
    },
    isReportReady: {
      type: Boolean,
      default: false,
    },
    deliveryMethod: {
      type: String,
      enum: ["online", "email", "pickup", "home_delivery"],
      default: "online",
    },
    deliveredAt: {
      type: Date,
    },
    patientNotified: {
      type: Boolean,
      default: false,
    },
    criticalValues: {
      type: Boolean,
      default: false,
    },
    doctorNotified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Generate report number before saving
labReportSchema.pre("save", function (next) {
  if (!this.reportNumber) {
    const date = new Date();
    const dateString = date.getFullYear().toString() + 
                      (date.getMonth() + 1).toString().padStart(2, '0') + 
                      date.getDate().toString().padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.reportNumber = `RPT${dateString}${randomNum}`;
  }
  next();
});

// Indexes for better performance
labReportSchema.index({ patient: 1, reportDate: -1 });
//labReportSchema.index({ labBooking: 1 });
//labReportSchema.index({ reportNumber: 1 });

const LabReport = mongoose.model("LabReport", labReportSchema);

export default LabReport;
