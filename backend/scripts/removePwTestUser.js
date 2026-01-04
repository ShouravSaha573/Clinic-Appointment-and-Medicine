import mongoose from "mongoose";
import User from "../src/models/user.model.js";
import { connectDB } from "../src/lib/db.js";

const run = async () => {
  try {
    await connectDB();

    const result = await User.deleteMany({ fullName: "Pw Test" });
    console.log(`Deleted ${result.deletedCount} user(s) with fullName "Pw Test".`);
  } catch (error) {
    console.error("Failed to remove Pw Test user:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close().catch(() => {});
  }
};

run();
