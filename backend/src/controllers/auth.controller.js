import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import { genToken } from "../lib/genToken.js";
import cloudinary from "../lib/cloudinary.js";
import jwt from "jsonwebtoken";

export const signup = async (req, res) => {
  try {
    // Avoid dual-session confusion: user auth should clear any doctor cookie.
    res.cookie("doctor_jwt", "", { maxAge: 0 });

    const userData = req.userData;

    const findUser = await User.findOne({ email: userData.email });
    if (findUser) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const newUser = new User({
      fullName: userData.fullName,
      email: userData.email,
      password: hashedPassword
    });

    await newUser.save(); 
    const token = genToken(newUser._id, res);

    return res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      profilePic: newUser.profilePic,
      isAdmin: newUser.isAdmin,
      token,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    });

  } catch (error) {
    console.error("Error in signup controller:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};
export const login = async (req,res) =>{
  try{
    // Avoid dual-session confusion: user auth should clear any doctor cookie.
    res.cookie("doctor_jwt", "", { maxAge: 0 });

    const {email,password} = req.body;
  const user = await User.findOne({email});
  if(!user){
    return res.status(400).json({
      message: "Wrong credentials"
    });
  }

  // Backward-compatible: missing isActive treated as active.
  if (user.isActive === false) {
    return res.status(403).json({ message: "Account is inactive. Please contact support." });
  }
  const isPasswordCorrect = await bcrypt.compare(password,user.password);
  if(!isPasswordCorrect){
    return res.status(400).json({
      message: "Wrong credentials"
    });
  }
  const token = genToken(user._id,res);
  res.status(200).json({
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    profilePic: user.profilePic,
    isAdmin: user.isAdmin,
    token,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });

  }catch(error){
    console.error("Error in login controller:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
  
}
export const logout = async (req,res) =>{
  try{
    res.cookie("jwt","",{maxAge:0});
    return res.status(200).json({
      message: "Logout successfully"
    });
  }
  catch(error){
    console.log("Error in logout controller",error);
    return res.status(400).json({
      message: "Internal server error"
    });
  }

}
export const updateProfile = async(req,res)=>{
  try{
    const { profilePic, fullName, email, currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!profilePic && !fullName && !email && !newPassword && !currentPassword) {
      return res.status(400).json({ message: "No profile fields provided" });
    }

    const wantsPasswordChange =
      (typeof newPassword === "string" && newPassword.trim().length > 0) ||
      (typeof currentPassword === "string" && currentPassword.trim().length > 0);

    if (wantsPasswordChange) {
      const nextPassword = typeof newPassword === "string" ? newPassword.trim() : "";
      const current = typeof currentPassword === "string" ? currentPassword : "";

      if (!current) {
        return res.status(400).json({ message: "Current password is required" });
      }
      if (!nextPassword) {
        return res.status(400).json({ message: "New password is required" });
      }
      if (nextPassword.length < 4 || nextPassword.length > 8) {
        return res.status(400).json({ message: "Password must be 4-8 characters" });
      }

      const userWithPassword = await User.findById(userId);
      if (!userWithPassword) {
        return res.status(401).json({ message: "User not found" });
      }

      const isPasswordCorrect = await bcrypt.compare(current, userWithPassword.password);
      if (!isPasswordCorrect) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
    }

    const updates = {};

    if (typeof fullName === "string") {
      const trimmed = fullName.trim();
      if (!trimmed) {
        return res.status(400).json({ message: "Full name cannot be empty" });
      }
      updates.fullName = trimmed;
    }

    if (typeof email === "string") {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        return res.status(400).json({ message: "Email cannot be empty" });
      }

      const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: userId } });
      if (existing) {
        return res.status(400).json({ message: "Email is already in use" });
      }

      updates.email = normalizedEmail;
    }

    if (typeof profilePic === "string" && profilePic.trim()) {
      const hasCloudinaryConfig =
        !!process.env.CLOUDINARY_CLOUD_NAME &&
        !!process.env.CLOUDINARY_API_KEY &&
        !!process.env.CLOUDINARY_API_SECRET;

      // If Cloudinary isn't configured, fall back to storing the data URL directly.
      // This keeps the feature working for local/dev without external config.
      if (!hasCloudinaryConfig) {
        // Basic guard against extremely large payloads (MongoDB doc limit is 16MB)
        if (profilePic.length > 8_000_000) {
          return res.status(413).json({
            message: "Profile picture is too large. Please upload a smaller image.",
          });
        }

        updates.profilePic = profilePic;
      } else {
        try {
          const uploadResult = await cloudinary.uploader.upload(profilePic, {
            folder: "clinic-app/profile-pics",
          });
          updates.profilePic = uploadResult.secure_url;
        } catch (uploadError) {
          console.error("Cloudinary upload failed:", uploadError);
          return res.status(502).json({
            message: "Failed to upload profile picture. Please try again.",
          });
        }
      }
    }

    if (wantsPasswordChange) {
      const nextPassword = newPassword.trim();
      const saltRounds = 10;
      const salt = await bcrypt.genSalt(saltRounds);
      const hashedPassword = await bcrypt.hash(nextPassword, salt);
      updates.password = hashedPassword;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true }).select("-password");
    res.status(200).json(updatedUser);
  }catch(error){
    console.error("Error in update profile controller:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

export const checkAuth = async (req, res) => {
  try{
    // Backward compatible: if protectRoute ran, req.user is present.
    if (req.user) {
      const authHeader = req.headers?.authorization;
      const bearerToken =
        typeof authHeader === "string" && authHeader.startsWith("Bearer ")
          ? authHeader.slice("Bearer ".length).trim()
          : null;
      const token = bearerToken || req.cookies?.jwt || null;

      // Note: returning token is intentional to enable header-based auth fallback.
      return res.status(200).json({ ...req.user.toObject?.() || req.user, token });
    }

    // Optional auth check: return null if not logged in.
    const authHeader = req.headers?.authorization;
    const bearerToken =
      typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length).trim()
        : null;

    const token = bearerToken || req.cookies?.jwt;
    if (!token) {
      return res.status(200).json(null);
    }

    const jwtSecret = process.env.SECRET || process.env.secret;
    if (!jwtSecret) {
      return res.status(500).json({ message: "JWT secret not configured" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch {
      res.cookie("jwt", "", { maxAge: 0 });
      return res.status(200).json(null);
    }

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      res.cookie("jwt", "", { maxAge: 0 });
      return res.status(200).json(null);
    }

    if (user.isActive === false) {
      res.cookie("jwt", "", { maxAge: 0 });
      return res.status(200).json(null);
    }

    return res.status(200).json({ ...user.toObject?.() || user, token });
  }catch(error){
    console.error("Error in check controller:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
}
  
