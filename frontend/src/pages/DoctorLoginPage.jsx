import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Stethoscope } from "lucide-react";
import { useDoctorAuthStore } from "../store/useDoctorAuthStore";
import AuthImagePattern from "../components/AuthImagePattern";
import toast from "react-hot-toast";

const DoctorLoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const { login, isLoggingIn } = useDoctorAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    const result = await login(formData);
    if (!result.success) {
      toast.error(result.error);
    } else {
      toast.success("Welcome back, Doctor!");
      navigate("/doctor/dashboard");
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Login Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Stethoscope className="size-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Doctor Portal</h1>
              <p className="text-gray-600">Sign in to manage your appointments</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <input
                type="email"
                className={`input input-bordered w-full`}
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className={`input input-bordered w-full`}
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

            <button type="submit" className="btn btn-primary w-full" disabled={isLoggingIn}>
              {isLoggingIn ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-base-content/60">
              Don't have a doctor account?{" "}
              <Link to="/doctor/signup" className="link link-primary">
                Sign up here
              </Link>
            </p>
          </div>

          <div className="text-center">
            <Link to="/login" className="link link-primary text-sm">
              Patient Login →
            </Link>
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      <AuthImagePattern
        title="Welcome Back, Doctor"
        subtitle="Sign in to manage your appointments and provide excellent care to your patients."
        backgroundSrc="/my-doctor-bg.jpg"
      />
    </div>
  );
};

export default DoctorLoginPage;
