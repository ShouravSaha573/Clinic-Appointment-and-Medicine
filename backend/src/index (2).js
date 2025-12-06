import express from 'express';
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRouter from "./routers/auth.router.js";
import doctorRouter from "./routers/doctor.router.js";
import appointmentRouter from "./routers/appointment.router.js";
import adminRouter from "./routers/admin.router.js";
import { connectDB } from "./lib/db.js";

dotenv.config();
const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);

// MODULE-1 ONLY:
// 1) User auth & profile
// 2) Admin access control & doctor management
// 3) Online appointment booking
app.use("/api/auth", authRouter);
app.use("/api/doctors", doctorRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/admin", adminRouter);

app.listen(5000, () => {
  connectDB();
  console.log("Server is running on port 5000 (Module-1 only)");
});
