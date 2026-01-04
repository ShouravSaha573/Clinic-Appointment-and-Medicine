import { useEffect, useState } from "react";
import { useDoctorAuthStore } from "../store/useDoctorAuthStore";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, User } from "lucide-react";
import toast from "react-hot-toast";

export const DoctorEditProfilePage = () => {
  const {
    doctorUser,
    isUpdatingProfile,
    updateProfile: updateDoctorProfile,
  } = useDoctorAuthStore();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    consultationFee: "",
  });

  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (!doctorUser) return;

    setForm({
      fullName: doctorUser?.doctor?.name || "",
      email: doctorUser?.email || "",
      consultationFee:
        doctorUser?.doctor?.consultationFee !== undefined && doctorUser?.doctor?.consultationFee !== null
          ? String(doctorUser.doctor.consultationFee)
          : "",
    });
  }, [doctorUser]);

  const handleSaveProfile = async () => {
    const feeValue = form.consultationFee;
    const shouldSendFee = feeValue !== "";

    if (shouldSendFee) {
      const feeNumber = Number(feeValue);
      if (!Number.isFinite(feeNumber) || feeNumber < 0) {
        toast.error("Consultation fee must be a non-negative number");
        return;
      }
    }

    const result = await updateDoctorProfile({
      fullName: form.fullName,
      email: form.email,
      ...(shouldSendFee ? { consultationFee: Number(feeValue) } : null),
    });

    if (!result?.success) {
      toast.error(result?.error || "Failed to update profile");
      return;
    }

    toast.success("Profile updated successfully");
  };

  const handleChangePassword = async () => {
    const currentPassword = passwordForm.currentPassword;
    const newPassword = passwordForm.newPassword;

    if (!currentPassword || !newPassword) {
      toast.error("Please enter current and new password");
      return;
    }
    if (newPassword.length < 4 || newPassword.length > 8) {
      toast.error("Password must be 4-8 characters");
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const result = await updateDoctorProfile({ currentPassword, newPassword });
      if (!result?.success) {
        toast.error(result?.error || "Failed to change password");
        return;
      }

      toast.success("Password changed successfully");
      setPasswordForm({ currentPassword: "", newPassword: "" });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="min-h-screen pt-6">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="mb-4">
          <Link
            to="/doctor/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>

        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold ">Doctor Profile</h1>
            <p className="mt-2">Update your profile information</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </div>
              <input
                className="input input-bordered w-full"
                value={form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                disabled={isUpdatingProfile}
              />
            </div>

            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </div>
              <input
                className="input input-bordered w-full"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                disabled={isUpdatingProfile}
              />
            </div>

            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">Consultation Fee</div>
              <input
                className="input input-bordered w-full"
                value={form.consultationFee}
                onChange={(e) => setForm((prev) => ({ ...prev, consultationFee: e.target.value }))}
                disabled={isUpdatingProfile}
                inputMode="numeric"
                placeholder="e.g. 500"
              />
            </div>

            <div className="pt-2">
              <button className="btn btn-primary w-full" disabled={isUpdatingProfile} onClick={handleSaveProfile}>
                {isUpdatingProfile ? "Saving..." : "Save Changes"}
              </button>
            </div>

            <div className="pt-4 border-t border-base-content/10">
              <h2 className="text-lg font-semibold">Change Password</h2>
              <p className="text-sm text-zinc-400 mt-1">Password must be 4-8 characters</p>

              <div className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <div className="text-sm text-zinc-400">Current Password</div>
                  <input
                    className="input input-bordered w-full"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    disabled={isUpdatingProfile || isUpdatingPassword}
                    placeholder="Enter current password"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="text-sm text-zinc-400">New Password</div>
                  <input
                    className="input input-bordered w-full"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    disabled={isUpdatingProfile || isUpdatingPassword}
                    placeholder="Enter new password"
                  />
                </div>

                <button
                  className="btn btn-primary w-full"
                  disabled={isUpdatingProfile || isUpdatingPassword}
                  onClick={handleChangePassword}
                >
                  {isUpdatingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorEditProfilePage;
