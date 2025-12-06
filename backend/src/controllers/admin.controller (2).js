import Doctor from "../models/doctor.model.js";
import User from "../models/user.model.js";

export const addDoctor = async (req, res) => {
  try {
    const {
      name,
      specialization,
      qualification,
      experience,
      phone,
      email,
      bio,
      consultationFee,
      availableSlots,
      profileImage
    } = req.body;

    // Validate required fields
    if (!name || !specialization || !qualification || !experience || !phone || !email || !consultationFee) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // Check if doctor with this email already exists
    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      return res.status(400).json({ message: "Doctor with this email already exists" });
    }

    // Validate specialization
    const validSpecializations = [
      "General Medicine",
      "Cardiology",
      "Dermatology",
      "Pediatrics",
      "Orthopedics",
      "Neurology",
      "Psychiatry",
      "Ophthalmology",
      "ENT",
      "Gynecology",
      "Urology",
      "Oncology",
      "Endocrinology",
      "Gastroenterology",
      "Pulmonology",
    ];

    if (!validSpecializations.includes(specialization)) {
      return res.status(400).json({ message: "Invalid specialization" });
    }

    // Create new doctor
    const newDoctor = new Doctor({
      name,
      specialization,
      qualification,
      experience: Number(experience),
      phone,
      email,
      bio: bio || "",
      consultationFee: Number(consultationFee),
      availableSlots: availableSlots || [],
      profileImage: profileImage || "",
      isActive: true,
    });

    await newDoctor.save();

    res.status(201).json({
      message: "Doctor added successfully",
      doctor: newDoctor,
    });
  } catch (error) {
    console.log("Error in addDoctor controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllDoctorsAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 10, specialization, search, isActive } = req.query;
    
    const query = {};
    
    if (specialization) {
      query.specialization = specialization;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { qualification: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const doctors = await Doctor.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Doctor.countDocuments(query);

    res.status(200).json({
      doctors,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.log("Error in getAllDoctorsAdmin controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate specialization if provided
    if (updateData.specialization) {
      const validSpecializations = [
        "General Medicine",
        "Cardiology",
        "Dermatology",
        "Pediatrics",
        "Orthopedics",
        "Neurology",
        "Psychiatry",
        "Ophthalmology",
        "ENT",
        "Gynecology",
        "Urology",
        "Oncology",
        "Endocrinology",
        "Gastroenterology",
        "Pulmonology",
      ];

      if (!validSpecializations.includes(updateData.specialization)) {
        return res.status(400).json({ message: "Invalid specialization" });
      }
    }

    // Check if email is being updated and if it already exists
    if (updateData.email) {
      const existingDoctor = await Doctor.findOne({ 
        email: updateData.email, 
        _id: { $ne: id } 
      });
      if (existingDoctor) {
        return res.status(400).json({ message: "Doctor with this email already exists" });
      }
    }

    const updatedDoctor = await Doctor.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedDoctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.status(200).json({
      message: "Doctor updated successfully",
      doctor: updatedDoctor,
    });
  } catch (error) {
    console.log("Error in updateDoctor controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Soft delete - just deactivate the doctor
    await Doctor.findByIdAndUpdate(id, { isActive: false });

    res.status(200).json({ message: "Doctor deactivated successfully" });
  } catch (error) {
    console.log("Error in deleteDoctor controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const toggleDoctorStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    doctor.isActive = !doctor.isActive;
    await doctor.save();

    res.status(200).json({
      message: `Doctor ${doctor.isActive ? 'activated' : 'deactivated'} successfully`,
      doctor,
    });
  } catch (error) {
    console.log("Error in toggleDoctorStatus controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.status(200).json(doctor);
  } catch (error) {
    console.log("Error in getDoctorById controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAdminStats = async (req, res) => {
  try {
    const totalDoctors = await Doctor.countDocuments();
    const activeDoctors = await Doctor.countDocuments({ isActive: true });
    const inactiveDoctors = await Doctor.countDocuments({ isActive: false });
    
    const totalUsers = await User.countDocuments();
    const adminUsers = await User.countDocuments({ isAdmin: true });
    const regularUsers = await User.countDocuments({ isAdmin: false });

    // Doctors by specialization
    const doctorsBySpecialization = await Doctor.aggregate([
      { $group: { _id: "$specialization", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      doctors: {
        total: totalDoctors,
        active: activeDoctors,
        inactive: inactiveDoctors,
      },
      users: {
        total: totalUsers,
        admins: adminUsers,
        regular: regularUsers,
      },
      doctorsBySpecialization,
    });
  } catch (error) {
    console.log("Error in getAdminStats controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
