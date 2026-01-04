import LabTest from "../models/labTest.model.js";

// Get all lab tests with filtering and pagination
export const getLabTests = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;

    const query = { isActive: true };

    // Filter by category
    if (category && category !== "all") {
      query.category = category;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const tests = await LabTest.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LabTest.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Get unique categories for filter options
    const categories = await LabTest.distinct("category", { isActive: true });

    res.status(200).json({
      tests,
      pagination: {
        current: parseInt(page),
        pages: totalPages,
        total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      categories,
    });
  } catch (error) {
    console.log("Error in getLabTests controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get single lab test by ID
export const getLabTestById = async (req, res) => {
  try {
    const { id } = req.params;

    const test = await LabTest.findById(id);
    if (!test || !test.isActive) {
      return res.status(404).json({ message: "Lab test not found" });
    }

    res.status(200).json(test);
  } catch (error) {
    console.log("Error in getLabTestById controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get lab tests by category
export const getLabTestsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const tests = await LabTest.find({
      category,
      isActive: true,
    }).sort({ name: 1 });

    res.status(200).json(tests);
  } catch (error) {
    console.log("Error in getLabTestsByCategory controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get popular/recommended lab tests
export const getPopularLabTests = async (req, res) => {
  try {
    const popularTests = await LabTest.find({
      isActive: true,
      category: { $in: ["Blood Test", "Urine Test", "Biochemistry"] }
    })
      .sort({ name: 1 })
      .limit(8);

    res.status(200).json(popularTests);
  } catch (error) {
    console.log("Error in getPopularLabTests controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Admin: Create new lab test
export const createLabTest = async (req, res) => {
  try {
    const testData = req.body;

    // Check if test code already exists
    const existingTest = await LabTest.findOne({ code: testData.code.toUpperCase() });
    if (existingTest) {
      return res.status(400).json({ message: "Test code already exists" });
    }

    const labTest = new LabTest({
      ...testData,
      code: testData.code.toUpperCase(),
    });

    await labTest.save();

    res.status(201).json({
      message: "Lab test created successfully",
      test: labTest,
    });
  } catch (error) {
    console.log("Error in createLabTest controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Admin: Update lab test
export const updateLabTest = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const labTest = await LabTest.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!labTest) {
      return res.status(404).json({ message: "Lab test not found" });
    }

    res.status(200).json({
      message: "Lab test updated successfully",
      test: labTest,
    });
  } catch (error) {
    console.log("Error in updateLabTest controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Admin: Delete/deactivate lab test
export const deleteLabTest = async (req, res) => {
  try {
    const { id } = req.params;

    const labTest = await LabTest.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!labTest) {
      return res.status(404).json({ message: "Lab test not found" });
    }

    res.status(200).json({
      message: "Lab test deactivated successfully",
    });
  } catch (error) {
    console.log("Error in deleteLabTest controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get lab test statistics (for admin dashboard)
export const getLabTestStats = async (req, res) => {
  try {
    const totalTests = await LabTest.countDocuments({ isActive: true });
    const testsByCategory = await LabTest.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const averagePrice = await LabTest.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, avgPrice: { $avg: "$price" } } }
    ]);

    res.status(200).json({
      totalTests,
      testsByCategory,
      averagePrice: averagePrice[0]?.avgPrice || 0,
    });
  } catch (error) {
    console.log("Error in getLabTestStats controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
