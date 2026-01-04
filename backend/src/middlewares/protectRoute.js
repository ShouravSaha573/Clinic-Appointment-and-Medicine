import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
export const protectRoute = async (req,res,next)=>{
    try{
        const authHeader = req.headers?.authorization;
        const bearerToken =
            typeof authHeader === "string" && authHeader.startsWith("Bearer ")
                ? authHeader.slice("Bearer ".length).trim()
                : null;

        const token = bearerToken || req.cookies?.jwt;
    if(!token){
        return res.status(401).json({
            message: "Unauthorized - Please login first"
        });
    }
    const jwtSecret = process.env.SECRET || process.env.secret;
    if (!jwtSecret) {
        return res.status(500).json({ message: "JWT secret not configured" });
    }

    const decoded =  jwt.verify(token,jwtSecret);
    if(!decoded){
                return res.status(401).json({
                        message: "Unauthorized - Invalid token, please login"
                });  
    }
    const user = await User.findById(decoded.userId).select("-password");
    if(!user){
                return res.status(401).json({
                    message: "Unauthorized - User not found, please login"
                });
      }

    // Treat missing isActive as active for backward compatibility.
    if (user.isActive === false) {
        res.cookie("jwt", "", { maxAge: 0 });
        return res.status(403).json({
            message: "Account is inactive. Please contact support."
        });
    }
    req.user = user;
    next();
    }catch(error){
        const isJwtError =
            error?.name === "JsonWebTokenError" ||
            error?.name === "TokenExpiredError" ||
            error?.name === "NotBeforeError";

        if (isJwtError) {
            return res.status(401).json({ message: "Unauthorized - Invalid token, please login" });
        }

        console.error("Error in protect middleware:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
    

}