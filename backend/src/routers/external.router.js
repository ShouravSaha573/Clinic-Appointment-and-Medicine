import express from "express";
import { getDiseaseStats, getWeatherForDate, translateText } from "../controllers/external.controller.js";

const router = express.Router();

// External API proxy routes
router.get("/weather", getWeatherForDate);
router.get("/disease-stats", getDiseaseStats);
router.post("/translate", translateText);

export default router;
