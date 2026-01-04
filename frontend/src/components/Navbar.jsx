import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useDoctorAuthStore } from "../store/useDoctorAuthStore";
import { useCartStore } from "../store/useCartStore";
import { LogOut, MessageSquare, Settings, User, Calendar, Plus, Stethoscope, Shield, ShoppingBag, Pill, TestTube, Star, BookOpen, ChevronDown } from "lucide-react";
import NotificationBell from "./NotificationBell";
import { useState } from "react";

export const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const { doctorUser, logout: doctorLogout } = useDoctorAuthStore();
  const { cart } = useCartStore();
  const [isDoctorDropdownOpen, setIsDoctorDropdownOpen] = useState(false);

  const isLoggedIn = !!authUser || !!doctorUser;
  const avatarSrc = authUser?.profilePic || doctorUser?.doctor?.profileImage || "";

  return (
    <div className="relative">
      <header
        className="bg-white/95 border-b border-blue-100 fixed w-full top-0 z-40 
      backdrop-blur-lg shadow-sm"
      >
        <div className="container mx-auto px-4 h-16">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
                <div className="size-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">ClinicCare</h1>
              </Link>
              
              {/* Public Navigation */}
              <nav className="hidden lg:flex items-center gap-2">
                <Link
                  to="/medicines"
                  className="btn btn-sm bg-green-100 hover:bg-green-200 border-green-300 text-green-700 gap-1 shadow-sm hover:shadow-md transition-all min-w-0"
                >
                  <Pill className="w-4 h-4" />
                  <span className="text-xs">Medicines</span>
                </Link>
                
                <Link
                  to="/lab-tests"
                  className="btn btn-sm bg-purple-100 hover:bg-purple-200 border-purple-300 text-purple-700 gap-1 shadow-sm hover:shadow-md transition-all min-w-0"
                >
                  <TestTube className="w-4 h-4" />
                  <span className="text-xs">Lab Tests</span>
                </Link>
                
                <Link
                  to="/blog"
                  className="btn btn-sm bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-700 gap-1 shadow-sm hover:shadow-md transition-all min-w-0"
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="text-xs">Health Tips</span>
                </Link>
              </nav>
            </div>

            {/* Right side actions with proper spacing */}
            <div className="flex items-center gap-1 xl:gap-2">{isLoggedIn ? (
              <>
                {/* User-only actions */}
                {authUser && (
                  <>
                    <Link
                      to="/cart"
                      className="btn btn-sm gap-1 bg-orange-50 hover:bg-orange-100 border-orange-200 relative min-w-0"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      {cart && cart.items && cart.items.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center text-[10px]">
                          {cart.items.length}
                        </span>
                      )}
                      <span className="hidden lg:inline text-xs">Cart</span>
                    </Link>
                    
                    <Link
                      to="/book-appointment"
                      className="btn btn-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 border-none gap-1 min-w-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden lg:inline text-xs">Book</span>
                    </Link>
                  </>
                )}

                {/* Doctor-only quick link */}
                {doctorUser && (
                  <Link
                    to="/doctor/dashboard"
                    className="btn btn-sm bg-green-50 hover:bg-green-100 border-green-200 text-green-700 gap-1 min-w-0"
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span className="hidden lg:inline text-xs">Dashboard</span>
                  </Link>
                )}

                {/* Dropdown for secondary actions */}
                <div className="dropdown dropdown-end">
                  <div tabIndex={0} role="button" className="btn btn-sm gap-1 bg-gray-100 hover:bg-gray-200">
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt={authUser?.fullName ? `${authUser.fullName} profile` : doctorUser?.doctor?.name ? `${doctorUser.doctor.name} profile` : "Profile"}
                        className="w-6 h-6 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/avatar.png";
                        }}
                      />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                    <ChevronDown className="w-3 h-3" />
                  </div>
                  <ul tabIndex={0} className="dropdown-content menu bg-white rounded-box z-[1] w-52 p-2 shadow-lg border border-gray-200 mt-1">
                    <li>
                      <Link to={doctorUser ? "/doctor/profile" : "/profile"} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50">
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                    </li>
                    {authUser && (
                      <>
                        <li>
                          <Link to="/orders" className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50">
                            <Calendar className="w-4 h-4" />
                            Orders
                          </Link>
                        </li>
                        <li>
                          <Link to="/appointments" className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50">
                            <Calendar className="w-4 h-4" />
                            Appointments
                          </Link>
                        </li>
                        <li>
                          <Link to="/lab-reports" className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50">
                            <TestTube className="w-4 h-4" />
                            Lab Reports
                          </Link>
                        </li>
                        <li>
                          <Link to="/reviews" className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50">
                            <Star className="w-4 h-4" />
                            Reviews
                          </Link>
                        </li>
                      </>
                    )}
                    {(authUser?.role === 'admin' || authUser?.isAdmin) && (
                      <li>
                        <Link to="/create-article" className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50">
                          <BookOpen className="w-4 h-4" />
                          Write Article
                        </Link>
                      </li>
                    )}
                    <div className="divider my-1"></div>
                    <li>
                      <button onClick={authUser ? logout : doctorLogout} className="flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600">
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </li>
                  </ul>
                </div>
                
                {/* Admin specific actions */}
                {authUser?.isAdmin && (
                  <>
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    <NotificationBell />
                    <Link
                      to="/admin"
                      className="btn btn-sm gap-1 bg-red-50 hover:bg-red-100 border-red-200 text-red-700 min-w-0"
                    >
                      <Shield className="w-4 h-4" />
                      <span className="hidden xl:inline text-xs">Admin</span>
                    </Link>
                  </>
                )}
              </>
            ) : (
              <>
                <Link
                  to="/book-appointment"
                  className="btn btn-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 border-none gap-1 min-w-0"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden md:inline text-xs">Book</span>
                </Link>
                
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                
                <Link
                  to="/login"
                  className="btn btn-sm gap-1 bg-gray-50 hover:bg-gray-100 min-w-0"
                >
                  <span className="text-xs">Login</span>
                </Link>
                
                <Link
                  to="/signup"
                  className="btn btn-sm gap-1 bg-blue-50 hover:bg-blue-100 border-blue-200 min-w-0"
                >
                  <span className="text-xs">Sign Up</span>
                </Link>
                
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                
                <Link
                  to="/doctor/login"
                  className="btn btn-sm gap-1 bg-green-50 hover:bg-green-100 border-green-200 text-green-700 min-w-0"
                >
                  <Stethoscope className="w-4 h-4" />
                  <span className="hidden lg:inline text-xs">Doctor</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      </header>

      {/* Doctor Dropdown Section - positioned slightly below navbar */}
      {isDoctorDropdownOpen && (
        <div className="fixed top-16 left-0 w-full bg-white/95 backdrop-blur-lg border-b border-blue-100 shadow-lg z-30">
          <div className="container mx-auto px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
              {/* Browse Doctors */}
              <Link
                to="/browse-doctors"
                className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all group"
                onClick={() => setIsDoctorDropdownOpen(false)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Stethoscope className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-blue-800">Browse Doctors</h3>
                </div>
                <p className="text-sm text-blue-600">Find and connect with qualified doctors in various specialties</p>
              </Link>

              {/* Doctor Login */}
              <Link
                to="/doctor/login"
                className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition-all group"
                onClick={() => setIsDoctorDropdownOpen(false)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-green-800">Doctor Portal</h3>
                </div>
                <p className="text-sm text-green-600">Access your doctor dashboard and manage appointments</p>
              </Link>

              {/* Book Appointment */}
              <Link
                to="/book-appointment"
                className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all group"
                onClick={() => setIsDoctorDropdownOpen(false)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-purple-800">Book Appointment</h3>
                </div>
                <p className="text-sm text-purple-600">Schedule a consultation with your preferred doctor</p>
              </Link>
            </div>

            {/* Close button */}
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setIsDoctorDropdownOpen(false)}
                className="btn btn-sm btn-ghost text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {isDoctorDropdownOpen && (
        <div
          className="fixed inset-0 bg-black/10 z-20"
          onClick={() => setIsDoctorDropdownOpen(false)}
        />
      )}
    </div>
  );
};