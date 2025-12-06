import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import { genToken } from "../lib/genToken.js";
import cloudinary from "../lib/cloudinary.js";

export const signup = async (req, res) => {
  try {
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
    genToken(newUser._id, res);

    console.log(newUser);
    return res.status(201).json({
      message: "User registered in DB"
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
    const {email,password} = req.body;
  const user = await User.findOne({email});
  if(!user){
    return res.status(400).json({
      message: "Wrong credentials"
    });
  }
  const isPasswordCorrect = await bcrypt.compare(password,user.password);
  if(!isPasswordCorrect){
    return res.status(400).json({
      message: "Wrong credentials"
    });
  }
  genToken(user._id,res);
  res.status(200).json({
    id:user._id,
    fullname:user.fullname,
    email:user.email,
    profilePic:user.profile
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
    const {profilePic} = req.body;
    const userId = req.user._id;
    if(!profilePic){
      return res.status(400).json({
        message:"Profile pic not found"
      })
    }
    const uploadResult = await cloudinary.uploader.upload(profilePic);
    const updateUser = await User.findByIdAndUpdate(userId,{profilePic:uploadResult.secure_url},{new:true});
    res.status(200).json(updateUser);
  }catch(error){
    console.error("Error in update profile controller:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

export const checkAuth = (req,res) =>{
  try{
    res.status(200).json(req.user);
  }catch(error){
    console.error("Error in check controller:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
}
  
