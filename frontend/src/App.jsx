import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { Loader } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

import { Navbar } from "./components/Navbar";
import HomePage from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { SignUpPage } from "./pages/SignupPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ProfilePage } from "./pages/ProfilePage";
import AppointmentsPage from "./pages/AppointmentsPage";
import BookAppointmentPage from "./pages/BookAppointmentPage";
import AppointmentDetailsPage from "./pages/AppointmentDetailsPage";
import BrowseDoctorsPage from "./pages/BrowseDoctorsPage";
import DoctorProfilePage from "./pages/DoctorProfilePage";
import AdminDashboard from "./pages/AdminDashboard";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuthStore } from "./store/useAuthStore";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();

  useEffect(() => {
    checkAuth().catch((error) => {
      console.error("Error checking auth:", error);
      toast.error("Failed to verify authentication. Please try again.");
    });
  }, [checkAuth]);

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <Loader className="animate-spin h-6 w-6 text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/browse-doctors" element={<BrowseDoctorsPage />} />
        <Route path="/doctors/:id" element={<DoctorProfilePage />} />
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/" />}
        />
        <Route
          path="/signup"
          element={!authUser ? <SignUpPage /> : <Navigate to="/" />}
        />

        {/* Protected user routes (Module 1) */}
        <Route
          path="/settings"
          element={authUser ? <SettingsPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/appointments"
          element={authUser ? <AppointmentsPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/book-appointment"
          element={
            authUser ? <BookAppointmentPage /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/appointments/:id"
          element={
            authUser ? <AppointmentDetailsPage /> : <Navigate to="/login" />
          }
        />

        {/* Admin routes (access control / doctor management) */}
        <Route
          path="/admin"
          element={
            authUser?.isAdmin ? (
              <ErrorBoundary>
                <AdminDashboard />
              </ErrorBoundary>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      <Toaster />
    </div>
  );
};

export default App;
