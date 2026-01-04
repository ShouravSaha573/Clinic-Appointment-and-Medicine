import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Stethoscope } from "lucide-react";
import { useDoctorAuthStore } from "../store/useDoctorAuthStore";
import AuthImagePattern from "../components/AuthImagePattern";
import DoctorIdSearch from "../components/DoctorIdSearch";
import toast from "react-hot-toast";

const DoctorSignupPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    doctorId: "",
  });

  const { signup, isSigningUp } = useDoctorAuthStore();

  const validateForm = () => {
    if (!formData.email.trim()) return toast.error("Email is required");
    if (!formData.password) return toast.error("Password is required");
    if (formData.password.length < 4 || formData.password.length > 8) return toast.error("Password must be 4-8 characters");
    if (formData.password !== formData.confirmPassword) return toast.error("Passwords don't match");
    if (!formData.doctorId.trim()) return toast.error("Doctor ID is required");

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const success = validateForm();
    if (success !== true) return;

    const result = await signup({
      email: formData.email,
      password: formData.password,
      doctorId: formData.doctorId,
    });

    if (!result.success) {
      toast.error(result.error);
    } else {
      toast.success("Account created successfully!");
      navigate("/doctor/dashboard");
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Signup Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Stethoscope className="size-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Doctor Registration</h1>
              <p className="text-gray-600">Create your doctor portal account</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <input
                type="email"
                className="input input-bordered w-full"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <DoctorIdSearch 
              onDoctorSelect={(doctorId) => setFormData({ ...formData, doctorId })}
              selectedDoctorId={formData.doctorId}
            />

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input input-bordered w-full"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="size-5 text-base-content/40" />
                  ) : (
                    <Eye className="size-5 text-base-content/40" />
                  )}
                </button>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Confirm Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input input-bordered w-full"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={isSigningUp}>
              {isSigningUp ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-base-content/60">
              Already have a doctor account?{" "}
              <Link to="/doctor/login" className="link link-primary">
                Sign in here
              </Link>
            </p>
          </div>

          <div className="text-center">
            <Link to="/signup" className="link link-primary text-sm">
              Patient Registration →
            </Link>
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      <AuthImagePattern
        title="Join Our Medical Team"
        subtitle="Create your doctor portal account to manage appointments and provide excellent patient care."
      />
    </div>
  );
};

export default DoctorSignupPage;
