import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
export const protectRoute = async (req,res,next)=>{
    try{
        const token = req.cookies.jwt;
    if(!token){
        return res.status(400).json({
            message: "Please login first"
        });
    }
    const decoded =  jwt.verify(token,process.env.SECRET);
    if(!decoded){
        return res.status(400).json({
            message: "Invalid token, please login"
        });  
    }
    const user = await User.findById(decoded.userId).select("-password");
    if(!user){
        return res.status(400).json({
          message: "User not found, Please login "
        });
      }
    req.user = user;
    next();
    }catch(error){
        console.error("Error in protect middleware:", error);
        return res.status(500).json({
      message: "Internal server error"
    });
    }
    

}