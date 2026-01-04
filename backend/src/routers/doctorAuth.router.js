import express from "express";
import { signup, login, logout, checkAuth, updateProfile } from "../controllers/doctorAuth.controller.js";
import { protectDoctorRoute } from "../middlewares/protectDoctorRoute.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/check", checkAuth);
router.put("/update-profile", protectDoctorRoute, updateProfile);

export default router;
