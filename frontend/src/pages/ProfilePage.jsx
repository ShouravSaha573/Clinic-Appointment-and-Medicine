import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User } from "lucide-react";
import toast from "react-hot-toast";

export const ProfilePage = () => {
  const { authUser, isUpdatingProfile: isUpdatingUserProfile, updateProfile: updateUserProfile } = useAuthStore();

  const isUpdatingProfile = isUpdatingUserProfile;

  const [selectedImg, setSelectedImg] = useState(null);
  const [form, setForm] = useState({ fullName: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (authUser) {
      setForm({
        fullName: authUser?.fullName || "",
        email: authUser?.email || "",
      });
    }
  }, [authUser]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);

      // Preview only; save together (name/email/photo) via "Save Changes"
    };
  };


  return (
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold ">Profile</h1>
            <p className="mt-2">Your profile information</p>
          </div>

          {/* avatar upload section */}

          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={
                  selectedImg ||
                  authUser?.profilePic ||
                  "/avatar.png"
                }
                alt="Profile"
                className="size-32 rounded-full object-cover border-4 "
              />
              <label
                htmlFor="avatar-upload"
                className={`
                  absolute bottom-0 right-0 
                  bg-base-content hover:scale-105
                  p-2 rounded-full cursor-pointer 
                  transition-all duration-200
                  ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}
                `}
              >
                <Camera className="w-5 h-5 text-base-200" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUpdatingProfile}
                />
              </label>
            </div>
            <p className="text-sm text-zinc-400">
              {isUpdatingProfile ? "Uploading..." : "Click the camera icon to update your photo"}
            </p>
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

            <div className="pt-2">
              <button
                className="btn btn-primary w-full"
                disabled={isUpdatingProfile}
                onClick={async () => {
                  const result = await updateUserProfile({
                    fullName: form.fullName,
                    email: form.email,
                    ...(selectedImg ? { profilePic: selectedImg } : null),
                  });

                  if (result?.success) {
                    setSelectedImg(null);
                  }
                }}
              >
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
                  onClick={async () => {
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
                      const result = await updateUserProfile({ currentPassword, newPassword });
                      if (!result?.success) {
                        return;
                      }

                      setPasswordForm({ currentPassword: "", newPassword: "" });
                    } finally {
                      setIsUpdatingPassword(false);
                    }
                  }}
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
export default ProfilePage;