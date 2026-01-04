import LabTest from "../models/labTest.model.js";

const labTestSeeds = [
  // Blood Tests
  {
    code: "CBC001",
    name: "Complete Blood Count (CBC)",
    category: "Blood Test",
    description: "Measures different components of blood including red blood cells, white blood cells, hemoglobin, hematocrit, and platelets",
    price: 800,
    sampleType: "Blood",
    reportDeliveryTime: "4-6 hours",
    preparationInstructions: "No special preparation required. Can be done on empty or full stomach.",
    normalRange: "Hemoglobin (Men): 13.8-17.2 g/dL, Hemoglobin (Women): 12.1-15.1 g/dL, RBC Count: 4.7-6.1 million cells/uL, WBC Count: 5,000-10,000 cells/uL, Platelets: 150,000-450,000/uL",
    fastingRequired: false,
    availableTimeSlots: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
    isActive: true
  },
  {
    code: "LFT001",
    name: "Liver Function Test (LFT)",
    category: "Blood Test",
    description: "Tests to check how well the liver is working and to detect liver damage",
    price: 1200,
    sampleType: "Blood",
    reportDeliveryTime: "6-8 hours",
    preparationInstructions: "8-12 hours fasting required. Only water allowed.",
    normalRange: "ALT: 7-56 units/L, AST: 10-40 units/L, Total Bilirubin: 0.1-1.2 mg/dL, Albumin: 3.5-5.0 g/dL",
    fastingRequired: true,
    availableTimeSlots: ["09:00", "10:00", "11:00"],
    isActive: true
  },
  {
    code: "RFT001",
    name: "Kidney Function Test (RFT)",
    category: "Blood Test",
    description: "Tests to evaluate kidney function and detect kidney disease",
    price: 1000,
    sampleType: "Blood",
    reportDeliveryTime: "4-6 hours",
    preparationInstructions: "No fasting required. Drink plenty of water before the test.",
    normalRange: "Creatinine: 0.7-1.3 mg/dL, BUN: 6-24 mg/dL, eGFR: >60 mL/min/1.73m²",
    fastingRequired: false,
    availableTimeSlots: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
    isActive: true
  },
  {
    code: "GLU001",
    name: "Blood Glucose (Fasting)",
    category: "Blood Test",
    description: "Measures blood sugar levels after fasting to diagnose diabetes",
    price: 300,
    sampleType: "Blood",
    reportDeliveryTime: "2-4 hours",
    preparationInstructions: "8-12 hours fasting required. No food or drinks except water.",
    normalRange: "Fasting Glucose: 70-100 mg/dL",
    fastingRequired: true,
    availableTimeSlots: ["09:00", "10:00", "11:00"],
    isActive: true
  },
  {
    code: "HBA1C001",
    name: "HbA1c (Glycated Hemoglobin)",
    category: "Blood Test",
    description: "Measures average blood sugar levels over the past 2-3 months",
    price: 600,
    sampleType: "Blood",
    reportDeliveryTime: "4-6 hours",
    preparationInstructions: "No fasting required. Can be done at any time.",
    normalRange: "HbA1c: <5.7% (Normal), 5.7-6.4% (Pre-diabetes), ≥6.5% (Diabetes)",
    fastingRequired: false,
    availableTimeSlots: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
    isActive: true
  },

  // Urine Tests
  {
    code: "URT001",
    name: "Urine Routine Test",
    category: "Urine Test",
    description: "Complete urine analysis to detect urinary tract infections and kidney problems",
    price: 400,
    sampleType: "Urine",
    reportDeliveryTime: "2-4 hours",
    preparationInstructions: "Collect first morning urine sample in a clean container. Clean genital area before collection.",
    normalRange: "Color: Yellow to amber, Clarity: Clear, Protein: Negative to trace, Glucose: Negative, RBC: 0-2 per hpf, WBC: 0-5 per hpf",
    fastingRequired: false,
    availableTimeSlots: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
    isActive: true
  },
  {
    code: "UCS001",
    name: "Urine Culture & Sensitivity",
    category: "Urine Test",
    description: "Identifies bacteria causing urinary tract infection and determines appropriate antibiotics",
    price: 800,
    sampleType: "Urine",
    reportDeliveryTime: "24-48 hours",
    preparationInstructions: "Collect midstream urine in sterile container after cleaning genital area with antiseptic.",
    normalRange: "Bacterial Growth: <10,000 CFU/mL (Normal)",
    fastingRequired: false,
    availableTimeSlots: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
    isActive: true
  },

  // Biochemistry Tests
  {
    code: "LIP001",
    name: "Lipid Profile",
    category: "Biochemistry",
    description: "Measures cholesterol levels and assesses cardiovascular disease risk",
    price: 1000,
    sampleType: "Blood",
    reportDeliveryTime: "4-6 hours",
    preparationInstructions: "9-12 hours fasting required. No food, alcohol, or smoking before test.",
    normalRange: "Total Cholesterol: <200 mg/dL, LDL Cholesterol: <100 mg/dL, HDL Cholesterol: >40 mg/dL (Men), >50 mg/dL (Women), Triglycerides: <150 mg/dL",
    fastingRequired: true,
    availableTimeSlots: ["09:00", "10:00", "11:00"],
    isActive: true
  },
  {
    code: "THY001",
    name: "Thyroid Function Test (TFT)",
    category: "Biochemistry",
    description: "Tests thyroid hormone levels to diagnose thyroid disorders",
    price: 1500,
    sampleType: "Blood",
    reportDeliveryTime: "6-8 hours",
    preparationInstructions: "No fasting required. Avoid biotin supplements 72 hours before test.",
    normalRange: "TSH: 0.4-4.0 mIU/L, T3: 80-200 ng/dL, T4: 5.0-12.0 μg/dL",
    fastingRequired: false,
    availableTimeSlots: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
    isActive: true
  },

  // Imaging Tests
  {
    code: "XRAY001",
    name: "Chest X-Ray",
    category: "Imaging",
    description: "X-ray of chest to examine lungs, heart, and chest wall",
    price: 1200,
    sampleType: "Other",
    reportDeliveryTime: "1-2 hours",
    preparationInstructions: "Remove jewelry and metal objects from chest and neck area. Wear loose clothing.",
    normalRange: "Radiologist report required",
    fastingRequired: false,
    availableTimeSlots: ["09:00", "10:00", "11:00", "14:00", "15:00"],
    isActive: true
  },
  {
    code: "USG001",
    name: "Ultrasound Abdomen",
    category: "Imaging",
    description: "Ultrasound examination of abdominal organs including liver, gallbladder, kidneys",
    price: 2000,
    sampleType: "Other",
    reportDeliveryTime: "2-3 hours",
    preparationInstructions: "6-8 hours fasting required. Drink 32 oz of water 1 hour before exam and do not urinate.",
    normalRange: "Radiologist report required",
    fastingRequired: true,
    availableTimeSlots: ["09:00", "10:00", "11:00", "14:00", "15:00"],
    isActive: true
  },

  // Microbiology Tests
  {
    code: "STD001",
    name: "STD Panel",
    category: "Microbiology",
    description: "Comprehensive testing for sexually transmitted diseases",
    price: 3000,
    sampleType: "Blood",
    reportDeliveryTime: "24-72 hours",
    preparationInstructions: "No special preparation required. Avoid urination 2 hours before urine sample collection.",
    normalRange: "HIV: Non-reactive, Syphilis: Non-reactive, Hepatitis B: Non-reactive, Hepatitis C: Non-reactive",
    fastingRequired: false,
    availableTimeSlots: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
    isActive: true
  },

  // Pathology Tests
  {
    code: "BIO001",
    name: "Tissue Biopsy",
    category: "Pathology",
    description: "Microscopic examination of tissue sample to diagnose diseases",
    price: 5000,
    sampleType: "Tissue",
    reportDeliveryTime: "3-5 days",
    preparationInstructions: "Follow specific instructions provided by referring physician. May require fasting.",
    normalRange: "Pathologist report required",
    fastingRequired: false,
    availableTimeSlots: ["09:00", "10:00", "11:00"],
    isActive: true
  },
];

export const seedLabTests = async () => {
  try {
    const existingTests = await LabTest.countDocuments();
    if (existingTests === 0) {
      await LabTest.insertMany(labTestSeeds);
      console.log("Lab tests seeded successfully");
    } else {
      console.log("Lab tests already seeded");
    }
  } catch (error) {
    console.error("Error seeding lab tests:", error);
  }
};
