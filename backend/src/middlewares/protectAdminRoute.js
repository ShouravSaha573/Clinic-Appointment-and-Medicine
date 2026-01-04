import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectAdminRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers?.authorization;
    const bearerToken =
      typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length).trim()
        : null;

    const token = bearerToken || req.cookies?.jwt;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    const jwtSecret = process.env.SECRET || process.env.secret;
    if (!jwtSecret) {
      return res.status(500).json({ message: "JWT secret not configured" });
    }

    const decoded = jwt.verify(token, jwtSecret);

    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ message: "Forbidden - Admin access required" });
    }

    if (user.isActive === false) {
      res.cookie("jwt", "", { maxAge: 0 });
      return res.status(403).json({ message: "Account is inactive. Please contact support." });
    }

    req.user = user;
    next();
  } catch (error) {
    const isJwtError =
      error?.name === "JsonWebTokenError" ||
      error?.name === "TokenExpiredError" ||
      error?.name === "NotBeforeError";

    if (isJwtError) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }

    console.log("Error in protectAdminRoute middleware: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
