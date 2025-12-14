import jwt from "jsonwebtoken";
import DoctorAuth from "../models/doctorAuth.model.js";

export const protectDoctorRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    const decoded = jwt.verify(token, process.env.secret);

    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }

    const doctor = await DoctorAuth.findById(decoded.userId).select("-password");

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    req.doctorId = doctor._id;
    next();
  } catch (error) {
    console.log("Error in protectDoctorRoute middleware: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
