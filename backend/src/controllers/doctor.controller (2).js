import Doctor from "../models/doctor.model.js";
import cloudinary from "../lib/cloudinary.js";

export const getDoctors = async (req, res) => {
  try {
    const { specialization, page = 1, limit = 10, search } = req.query;
    
    const query = { isActive: true };
    
    if (specialization && specialization !== "all") {
      query.specialization = specialization;
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } },
        { qualification: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    
    const doctors = await Doctor.find(query)
      .select("-__v")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ name: 1 });

    const total = await Doctor.countDocuments(query);

    res.status(200).json({
      doctors,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.log("Error in getDoctors:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const doctor = await Doctor.findById(id).select("-__v");
    
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.status(200).json(doctor);
  } catch (error) {
    console.log("Error in getDoctorById:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getSpecializations = async (req, res) => {
  try {
    const specializations = await Doctor.distinct("specialization", { isActive: true });
    res.status(200).json(specializations);
  } catch (error) {
    console.log("Error in getSpecializations:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getDoctorAvailableSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    const doctor = await Doctor.findById(id).select("availableSlots");
    
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Get day of week from date
    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Find available slots for the day
    const daySlots = doctor.availableSlots.filter(slot => slot.day === dayOfWeek);
    
    if (daySlots.length === 0) {
      return res.status(200).json({ availableSlots: [] });
    }

    // Generate time slots (assuming 30-minute intervals)
    const timeSlots = [];
    daySlots.forEach(slot => {
      const startTime = new Date(`2000-01-01T${slot.startTime}`);
      const endTime = new Date(`2000-01-01T${slot.endTime}`);
      
      let currentTime = new Date(startTime);
      while (currentTime < endTime) {
        timeSlots.push(currentTime.toTimeString().slice(0, 5));
        currentTime.setMinutes(currentTime.getMinutes() + 30);
      }
    });

    res.status(200).json({ availableSlots: timeSlots });
  } catch (error) {
    console.log("Error in getDoctorAvailableSlots:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Admin functions (you can add middleware to protect these routes)
export const createDoctor = async (req, res) => {
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
    } = req.body;

    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      return res.status(400).json({ message: "Doctor with this email already exists" });
    }

    let profileImage = "";
    if (req.body.profileImage) {
      const uploadedResponse = await cloudinary.uploader.upload(req.body.profileImage);
      profileImage = uploadedResponse.secure_url;
    }

    const doctor = new Doctor({
      name,
      specialization,
      qualification,
      experience,
      phone,
      email,
      profileImage,
      bio,
      consultationFee,
      availableSlots,
    });

    await doctor.save();

    res.status(201).json(doctor);
  } catch (error) {
    console.log("Error in createDoctor:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
