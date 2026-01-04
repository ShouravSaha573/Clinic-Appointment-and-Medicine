import express from 'express';
import dotenv from "dotenv"
import cookieParser from "cookie-parser"
import cors from "cors"

import authRouter from "./routers/auth.router.js"
import doctorRouter from "./routers/doctor.router.js"
import appointmentRouter from "./routers/appointment.router.js"
import doctorAuthRouter from "./routers/doctorAuth.router.js"
import doctorAppointmentRouter from "./routers/doctorAppointment.router.js"
import adminRouter from "./routers/admin.router.js"
import medicineRouter from "./routers/medicine.router.js"
import cartRouter from "./routers/cart.router.js"
import orderRouter from "./routers/order.router.js"
import labTestRouter from "./routers/labTest.router.js"
import labBookingRouter from "./routers/labBooking.router.js"
import labReportRouter from "./routers/labReport.router.js"
import reviewRouter from "./routers/review.router.js"
import articleRouter from "./routers/article.router.js"
import notificationRouter from "./routers/notification.router.js"
import externalRouter from "./routers/external.router.js"
import {connectDB} from "./lib/db.js"

dotenv.config();
const app = express();
// Render/Proxies: required for correct secure cookie behavior behind a reverse proxy
app.set("trust proxy", 1);
app.use(cookieParser())
// Increase payload limit to support base64 image uploads (e.g. profile picture)
app.use(express.json({ limit: "25mb" }))
app.use(express.urlencoded({ extended: true, limit: "25mb" }))
const isPrivateNetworkHost = (host) => {
    const h = String(host || "").trim().toLowerCase();
    if (!h) return false;
    if (h === "localhost" || h === "127.0.0.1" || h === "::1") return true;
    // Allow common RFC1918 private IPv4 ranges for LAN testing.
    if (/^10\./.test(h)) return true;
    if (/^192\.168\./.test(h)) return true;
    const m = h.match(/^172\.(\d{1,2})\./);
    if (m) {
        const secondOctet = Number(m[1]);
        if (Number.isFinite(secondOctet) && secondOctet >= 16 && secondOctet <= 31) return true;
    }
    return false;
};

const isDevAllowedOrigin = (origin) => {
    if (!origin) return true; // allow non-browser clients (e.g. curl/postman)
    // In development, allow all origins to avoid CORS headaches
    if (process.env.NODE_ENV !== "production") return true;

    const allowListRaw = String(process.env.CORS_ORIGINS || "").trim();
    if (allowListRaw) {
        const allowList = allowListRaw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        return allowList.includes(origin);
    }

    // Opt-in escape hatch for any environment.
    if (String(process.env.CORS_ALLOW_ALL_ORIGINS || "").toLowerCase() === "true") return true;
    try {
        const u = new URL(origin);
        return isPrivateNetworkHost(u.hostname);
    } catch {
        return false;
    }
};

app.use(cors({
    origin: (origin, cb) => {
        if (isDevAllowedOrigin(origin)) return cb(null, true);
        return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}))

app.use("/api/auth",authRouter)
app.use("/api/doctors",doctorRouter)
app.use("/api/appointments",appointmentRouter)
app.use("/api/doctor-auth",doctorAuthRouter)
app.use("/api/doctor-appointments",doctorAppointmentRouter)
app.use("/api/admin",adminRouter)
app.use("/api/medicines",medicineRouter)
app.use("/api/cart",cartRouter)
app.use("/api/orders",orderRouter)
app.use("/api/lab-tests",labTestRouter)
app.use("/api/lab-bookings",labBookingRouter)
app.use("/api/lab-reports",labReportRouter)
app.use("/api/reviews",reviewRouter)
app.use("/api/articles",articleRouter)
app.use("/api/notifications",notificationRouter)
app.use("/api/external", externalRouter)

app.get("/api/health", (req, res) => {
    res.status(200).json({ ok: true });
});

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
});

const PORT = Number(process.env.PORT || 5000);

(async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            const cloudinaryEnabled =
                !!process.env.CLOUDINARY_CLOUD_NAME &&
                !!process.env.CLOUDINARY_API_KEY &&
                !!process.env.CLOUDINARY_API_SECRET;

            console.log(`Server is running on port ${PORT}`);
            console.log(`Cloudinary uploads: ${cloudinaryEnabled ? "ENABLED" : "DISABLED"}`);
        });
    } catch (e) {
        console.error("Failed to start server (DB connection failed)");
        process.exit(1);
    }
})();