import express from "express";
import { signup,login,logout,updateProfile,checkAuth } from "../controllers/auth.controller.js";
import {validate} from "../middlewares/userValidate.middleware.js"
import {protectRoute} from "../middlewares/protectRoute.js"  // check user logged in or not


const router = express.Router();

router.post("/signup",validate,signup)  //zod used for validation data
router.post("/login",login)
router.post("/logout",logout)
router.put("/update-profile",protectRoute,updateProfile) //update profile picture
router.get("/check",protectRoute,checkAuth);  




export default router;