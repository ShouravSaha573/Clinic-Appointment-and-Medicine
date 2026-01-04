import Medicine from "../models/medicine.model.js";
import cloudinary from "../lib/cloudinary.js";
import Cart from "../models/cart.model.js";

const escapeRegex = (str = "") => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Some older/seeded datasets may accidentally store `isActive` as a string/number.
// Treat these as inactive too so user-facing endpoints never show them.
const USER_ACTIVE_FILTER = { isActive: { $nin: [false, "false", 0, "0"] } };

const normalizeMedicineCategory = (value) => {
  const raw = typeof value === "string" ? value.trim() : value;
  if (typeof raw !== "string" || !raw) return raw;
  // Backward-compat: some older data uses plural category names.
  if (raw.toLowerCase() === "vitamins") return "Vitamin";
  if (raw.toLowerCase() === "antibiotics") return "Antibiotic";
  if (raw.toLowerCase() === "other") return "Others";
  return raw;
};

const PREDEFINED_CATEGORIES = [
  "Antibiotic",
  "Pain Relief",
  "Vitamin",
  "Cardiac",
  "Diabetes",
  "Blood Pressure",
  "Digestive",
  "Respiratory",
  "Skin Care",
  "Mental Health",
  "Others",
];

const hasCloudinaryConfig = () =>
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

const maybeProcessMedicineImage = async (data) => {
  if (!data || typeof data !== "object") return data;
  if (typeof data.image !== "string" || !data.image.trim()) return data;

  const image = data.image.trim();

  // Only process data URLs. If it's already an http(s) URL, keep as-is.
  const isDataUrl = image.startsWith("data:image/");
  if (!isDataUrl) return data;

  if (!hasCloudinaryConfig()) {
    // Basic guard against extremely large payloads (MongoDB doc limit is 16MB)
    if (image.length > 8_000_000) {
      const err = new Error("Medicine image is too large. Please upload a smaller image.");
      err.statusCode = 413;
      throw err;
    }
    return data;
  }

  const uploadResult = await cloudinary.uploader.upload(image, {
    folder: "clinic-app/medicines",
  });

  return { ...data, image: uploadResult.secure_url };
};


// Get all medicines with filters and pagination
export const getMedicines = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 24, // Optimized default limit
      category,
      search,
      minPrice,
      maxPrice,
      sortBy = "name",
      sortOrder = "asc",
      prescriptionRequired,
      inStock = false,
    } = req.query;

    // Cap the limit to prevent large queries
    const safeLimit = Math.min(parseInt(limit) || 24, 100);

    // Build query
    // Treat missing `isActive` as active for backward compatibility.
    // Hide inactive items from users (including legacy string/number representations).
    const query = { ...USER_ACTIVE_FILTER };

    // Only filter to in-stock items if explicitly requested.
    if (String(inStock).toLowerCase() === "true") {
      query.stock = { $gt: 0 };
    }



    if (category && category !== "all") {
      query.category = category;
    }

    // Search by name/generic/brand (supports partial matches)
    if (search && String(search).trim()) {
      const safe = escapeRegex(String(search).trim());
      const re = new RegExp(safe, "i");

      query.$or = [
        { name: re },
        { genericName: re },
        { brand: re },
        { tags: { $in: [re] } },
      ];
    }




    const min = Number(minPrice);
    const max = Number(maxPrice);

    if (!Number.isNaN(min) || !Number.isNaN(max)) {
      query.price = {};
      if (!Number.isNaN(min)) query.price.$gte = min;
      if (!Number.isNaN(max)) query.price.$lte = max;
    }



    if (prescriptionRequired !== undefined) {
      query.prescriptionRequired = prescriptionRequired === "true";
    }

    // Exclude expired medicines, but keep backward compatibility for older records
    // that may not have an expiryDate stored.
    const now = new Date();
    query.$and = [
      ...(Array.isArray(query.$and) ? query.$and : []),
      {
        $or: [
          { expiryDate: { $gt: now } },
          { expiryDate: { $exists: false } },
          { expiryDate: null },
        ],
      },
    ];

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (page - 1) * safeLimit;

    const [medicines, total] = await Promise.all([
      Medicine.find(query)
        .sort(sort)
        .skip(skip)
        .limit(safeLimit)
        .select('-sideEffects -contraindications -__v -description')
        .lean(),
      Medicine.countDocuments(query)
    ]);

    // Set cache headers for medicine list (cache for 5 minutes for smooth browsing)
    res.set("Cache-Control", "private, max-age=300");

    res.status(200).json({
      medicines,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / safeLimit),
        total,
        hasNext: page * safeLimit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.log("Error in getMedicines controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get single medicine by ID
export const getMedicineById = async (req, res) => {
  try {
    const { id } = req.params;

    const medicine = await Medicine.findById(id);

    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    // Hide if inactive (including legacy string/number representations).
    const inactive =
      medicine.isActive === false ||
      String(medicine.isActive).toLowerCase() === "false" ||
      String(medicine.isActive) === "0";
    if (inactive) {
      return res.status(404).json({ message: "Medicine not available" });
    }

    res.status(200).json(medicine);
  } catch (error) {
    console.log("Error in getMedicineById controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get medicine categories
export const getCategories = async (req, res) => {
  try {
    const dbCategories = await Medicine.distinct("category", { isActive: true });

    const merged = Array.from(
      new Set([...(dbCategories || []), ...PREDEFINED_CATEGORIES])
    );

    // Keep predefined order first
    const order = new Map(PREDEFINED_CATEGORIES.map((c, i) => [c, i]));
    merged.sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));

    // Categories rarely change - cache for 5 minutes
    res.set("Cache-Control", "private, max-age=300");

    res.status(200).json(merged);
  } catch (error) {
    console.log("Error in getCategories controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};


// Search medicines
export const searchMedicines = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.status(200).json([]);
    }

    const safe = escapeRegex(q);
    const re = new RegExp(safe, "i");

    const medicines = await Medicine.find({
      $or: [
        { name: re },
        { genericName: re },
        { brand: re },
        { tags: { $in: [re] } },
      ],
    }).limit(20);

    res.status(200).json(medicines);
  } catch (error) {
    console.log("Error in searchMedicines controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};


// Get featured medicines (best sellers or recommended)
export const getFeaturedMedicines = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const medicines = await Medicine.find({
      isActive: true,
      stock: { $gt: 0 },
      expiryDate: { $gt: new Date() },
    })
      .sort({ "rating.average": -1, "rating.count": -1 })
      .limit(parseInt(limit))
      .select("name genericName brand price discountPrice image category rating");

    res.status(200).json(medicines);
  } catch (error) {
    console.log("Error in getFeaturedMedicines controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ADMIN CONTROLLERS

// Admin: Get all medicines (including inactive/expired)
export const getAllMedicinesForAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 200,
      search,
      category,
      isActive,
    } = req.query;

    const query = {};

    if (category && category !== "all") {
      query.category = category;
    }

    if (isActive !== undefined && isActive !== "all") {
      query.isActive = String(isActive).toLowerCase() === "true";
    }

    if (search && String(search).trim()) {
      const safe = escapeRegex(String(search).trim());
      const re = new RegExp(safe, "i");
      query.$or = [
        { name: re },
        { genericName: re },
        { brand: re },
      ];
    }

    const limitNumRaw = Number(limit);
    const limitNum = Number.isFinite(limitNumRaw) && limitNumRaw > 0 ? Math.min(5000, Math.floor(limitNumRaw)) : 200;
    const pageNumRaw = Number(page);
    const pageNum = Number.isFinite(pageNumRaw) && pageNumRaw > 0 ? Math.floor(pageNumRaw) : 1;

    const skip = (pageNum - 1) * limitNum;

    const medicines = await Medicine.find(query)
      .select(
        "name genericName brand strength category form price discountPrice stock minStock isActive prescriptionRequired expiryDate image manufacturer description"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Medicine.countDocuments(query);

    res.status(200).json({
      medicines,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total,
      },
    });
  } catch (error) {
    console.log("Error in getAllMedicinesForAdmin controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create new medicine (Admin only)
export const createMedicine = async (req, res) => {
  try {
    const medicineDataRaw = await maybeProcessMedicineImage(req.body);
    const medicineData = {
      ...(medicineDataRaw || {}),
      category: normalizeMedicineCategory(medicineDataRaw?.category),
    };

    // Check if medicine with same name and strength already exists
    const existingMedicine = await Medicine.findOne({
      name: medicineData.name,
      strength: medicineData.strength,
      brand: medicineData.brand,
    });

    if (existingMedicine) {
      return res.status(400).json({ 
        message: "Medicine with same name, strength and brand already exists" 
      });
    }

    const medicine = new Medicine(medicineData);
    await medicine.save();

    res.status(201).json({
      message: "Medicine created successfully",
      medicine,
    });
  } catch (error) {
    console.log("Error in createMedicine controller", error.message);
    res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
  }
};

// Update medicine (Admin only)
export const updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const updateDataRaw = await maybeProcessMedicineImage(req.body);
    const updateData = { ...(updateDataRaw || {}) };
    // Only normalize/update category if the client explicitly sent it.
    // This avoids accidentally setting `category: undefined` on partial updates (e.g., toggling isActive).
    if (updateDataRaw && Object.prototype.hasOwnProperty.call(updateDataRaw, "category")) {
      updateData.category = normalizeMedicineCategory(updateDataRaw?.category);
    }

    const medicine = await Medicine.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    res.status(200).json({
      message: "Medicine updated successfully",
      medicine,
    });
  } catch (error) {
    console.log("Error in updateMedicine controller", error.message);
    res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
  }
};

// Delete medicine (Admin only)
export const deleteMedicine = async (req, res) => {
  try {
    const { id } = req.params;

    const medicine = await Medicine.findByIdAndDelete(id);

    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    // Clean up carts that might still reference this medicine.
    await Cart.updateMany(
      { "items.medicine": id },
      { $pull: { items: { medicine: id } } }
    );

    res.status(200).json({
      message: "Medicine permanently deleted successfully",
      medicine,
      deletedId: id,
    });
  } catch (error) {
    console.log("Error in deleteMedicine controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update stock (Admin only)
export const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock, operation = "set" } = req.body;

    const medicine = await Medicine.findById(id);

    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    if (operation === "add") {
      medicine.stock += stock;
    } else if (operation === "subtract") {
      medicine.stock = Math.max(0, medicine.stock - stock);
    } else {
      medicine.stock = stock;
    }

    await medicine.save();

    res.status(200).json({
      message: "Stock updated successfully",
      medicine,
    });
  } catch (error) {
    console.log("Error in updateStock controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get low stock medicines (Admin only)
export const getLowStockMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find({
      isActive: true,
      $expr: { $lte: ["$stock", "$minStock"] },
    }).select("name brand stock minStock price category");

    res.status(200).json(medicines);
  } catch (error) {
    console.log("Error in getLowStockMedicines controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get expired medicines (Admin only)
export const getExpiredMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find({
      isActive: true,
      expiryDate: { $lte: new Date() },
    }).select("name brand expiryDate stock price category");

    res.status(200).json(medicines);
  } catch (error) {
    console.log("Error in getExpiredMedicines controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
