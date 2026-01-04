import mongoose from "mongoose";

const appSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    enabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const AppSetting = mongoose.models.AppSetting || mongoose.model("AppSetting", appSettingSchema);

export default AppSetting;
