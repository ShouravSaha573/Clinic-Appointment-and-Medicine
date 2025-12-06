import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import {
  LogOut,
  Settings,
  User,
  Calendar,
  Shield,
  Stethoscope,
  ArrowRight,
  MessageSquare,
} from "lucide-react";

export const Navbar = () => {
  const { logout, authUser } = useAuthStore();

  return (
    <>
      <header className="bg-white/95 border-b border-blue-100 fixed w-full top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Brand - similar to original */}
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm md:text-base bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                ClinicCare
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:block">
                Book appointments with top doctors
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-3">
            <Link
              to="/browse-doctors"
              className="hidden sm:inline-flex items-center gap-1 text-xs md:text-sm text-slate-700 hover:text-blue-600"
            >
              <Calendar className="h-4 w-4" />
              Browse doctors
            </Link>

            {authUser && (
              <>
                <Link
                  to="/appointments"
                  className="inline-flex items-center gap-1 text-xs md:text-sm text-slate-700 hover:text-blue-600"
                >
                  <Calendar className="h-4 w-4" />
                  My appointments
                </Link>

                <Link
                  to="/profile"
                  className="hidden md:inline-flex items-center gap-1 text-xs md:text-sm text-slate-700 hover:text-blue-600"
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>

                <Link
                  to="/settings"
                  className="hidden md:inline-flex items-center gap-1 text-xs md:text-sm text-slate-700 hover:text-blue-600"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </>
            )}

            {authUser?.isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1 text-xs md:text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-full px-2 py-1 bg-red-50"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}

            {!authUser ? (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center text-xs md:text-sm text-slate-700 hover:text-blue-600"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1 text-xs md:text-sm px-3 py-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700"
                >
                  <ArrowRight className="h-4 w-4" />
                  Sign up
                </Link>
              </>
            ) : (
              <button
                onClick={logout}
                className="inline-flex items-center gap-1 text-xs md:text-sm px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Spacer to offset fixed header */}
      <div className="h-14" />
    </>
  );
};
