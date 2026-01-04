import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { Navbar } from "./components/Navbar"
import  HomePage  from "./pages/HomePage"
import { LoginPage } from "./pages/LoginPage"
import { SignUpPage } from "./pages/SignupPage"
import { SettingsPage } from "./pages/SettingsPage"
import { ProfilePage } from "./pages/ProfilePage"
import AppointmentsPage from "./pages/AppointmentsPage"
import BookAppointmentPage from "./pages/BookAppointmentPage"
import AppointmentDetailsPage from "./pages/AppointmentDetailsPage"
import BrowseDoctorsPage from "./pages/BrowseDoctorsPage"
import DoctorProfilePage from "./pages/DoctorProfilePage"
import DoctorLoginPage from "./pages/DoctorLoginPage"
import DoctorSignupPage from "./pages/DoctorSignupPage"
import DoctorDashboard from "./pages/DoctorDashboard"
import { Suspense, lazy } from "react"
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"))
import MedicinePage from "./pages/MedicinePage"
import CartPage from "./pages/CartPage"
import OrdersPage from "./pages/OrdersPage"
import OrderDetailsPage from "./pages/OrderDetailsPage"
import LabTestsPage from "./pages/LabTestsPage"
import LabReportsPage from "./pages/LabReportsPage"
import ReviewsPage from "./pages/ReviewsPage"
import BlogPage from "./pages/BlogPage"
import ArticleDetailPage from "./pages/ArticleDetailPage"
import CreateArticlePage from "./pages/CreateArticlePage"
import ErrorBoundary from "./components/ErrorBoundary"
import { useAuthStore } from "./store/useAuthStore"
import { useDoctorAuthStore } from "./store/useDoctorAuthStore"
import { preloadMedicines } from "./store/useMedicineStore"
import { preloadAdminData } from "./store/useAdminStore"
import DoctorEditProfilePage from "./pages/DoctorEditProfilePage"
import { useEffect } from "react"
import { Loader } from "lucide-react"
import toast, { Toaster } from 'react-hot-toast';

// Preload data immediately on app start for instant loading
preloadMedicines();
preloadAdminData();

const App = () =>{
  const {authUser,checkAuth,isCheckingAuth} = useAuthStore();
  const {doctorUser, checkAuth: checkDoctorAuth, isCheckingAuth: isCheckingDoctorAuth} = useDoctorAuthStore();
  const location = useLocation();
  // Hide the public site Navbar only on doctor internal pages to avoid mixing UIs.
  // Keep it visible on /doctor/login and /doctor/signup.
  const hideNavbar = location.pathname === "/doctor/dashboard" || location.pathname === "/doctor/profile";
  
  useEffect(()=>{
    checkAuth();
    checkDoctorAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])
  
  if(isCheckingAuth || isCheckingDoctorAuth){
    return(
      <div className="flex items-center justify-center h-screen w-full"> 
      <Loader className="animate-spin h-6 w-6 text-blue-500" />
    </div>
    )
  }
  
  return(
    <div>
      {!hideNavbar && <Navbar />}
      
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage/>} />
        <Route path="/browse-doctors" element={<BrowseDoctorsPage/>} />
        <Route path="/doctors/:id" element={<DoctorProfilePage/>} />
        <Route path="/medicines" element={<MedicinePage/>} />
        <Route path="/lab-tests" element={<LabTestsPage/>} />
        <Route path="/login" element={!authUser? <LoginPage/> : <Navigate to= "/" />}/>
        <Route path="/signup" element={!authUser ? <SignUpPage/> : <Navigate to = "/"/> }/>
        
        {/* Protected Routes */}
        <Route path="/settings" element={authUser ? <SettingsPage/> : <Navigate to = "/login"/>}/>
        <Route path="/profile" element={authUser ? <ProfilePage/> : <Navigate to = "/login"/>}/>
        <Route path="/appointments" element={authUser ? <AppointmentsPage/> : <Navigate to = "/login"/>}/>
        <Route path="/book-appointment" element={authUser ? <BookAppointmentPage/> : <Navigate to = "/login"/>}/>
        <Route path="/appointments/:id" element={authUser ? <AppointmentDetailsPage/> : <Navigate to = "/login"/>}/>
        
        {/* Medicine & Shopping Routes */}
        <Route path="/cart" element={authUser ? <CartPage/> : <Navigate to = "/login"/>}/>
        <Route path="/orders" element={authUser ? <OrdersPage/> : <Navigate to = "/login"/>}/>
        <Route path="/orders/:orderId" element={authUser ? <OrderDetailsPage/> : <Navigate to = "/login"/>}/>
        
        {/* Lab Test Routes */}
        <Route path="/lab-reports" element={
          authUser ? (
            <ErrorBoundary>
              <LabReportsPage/>
            </ErrorBoundary>
          ) : (
            <Navigate to = "/login"/>
          )
        }/>
        
        {/* Reviews Routes */}
        <Route path="/reviews" element={
          authUser ? (
            <ErrorBoundary>
              <ReviewsPage/>
            </ErrorBoundary>
          ) : (
            <Navigate to = "/login"/>
          )
        }/>
        
        {/* Blog/Articles Routes */}
        <Route path="/blog" element={
          <ErrorBoundary>
            <BlogPage/>
          </ErrorBoundary>
        }/>
        <Route path="/articles/:id" element={
          <ErrorBoundary>
            <ArticleDetailPage/>
          </ErrorBoundary>
        }/>
        <Route path="/create-article" element={
          (authUser?.role === 'doctor' || authUser?.role === 'admin' || authUser?.isAdmin || doctorUser) ? (
            <ErrorBoundary>
              <CreateArticlePage/>
            </ErrorBoundary>
          ) : (
            <Navigate to = "/login"/>
          )
        }/>
        
        {/* Doctor Routes */}
        <Route path="/doctor/login" element={!doctorUser ? <DoctorLoginPage/> : <Navigate to = "/doctor/dashboard"/>}/>
        <Route path="/doctor/signup" element={!doctorUser ? <DoctorSignupPage/> : <Navigate to = "/doctor/dashboard"/>}/>
        <Route path="/doctor/dashboard" element={
          doctorUser ? (
            <ErrorBoundary>
              <DoctorDashboard/>
            </ErrorBoundary>
          ) : (
            <Navigate to = "/doctor/login"/>
          )
        }/>

        <Route path="/doctor/profile" element={
          doctorUser ? (
            <ErrorBoundary>
              <DoctorEditProfilePage/>
            </ErrorBoundary>
          ) : (
            <Navigate to = "/doctor/login"/>
          )
        }/>
        
        {/* Admin Routes */}
        <Route path="/admin" element={
          authUser?.isAdmin ? (
            <ErrorBoundary>
              <Suspense fallback={
                <div className="flex items-center justify-center h-screen w-full">
                  <Loader className="animate-spin h-6 w-6 text-blue-500" />
                </div>
              }>
                <AdminDashboard/>
              </Suspense>
            </ErrorBoundary>
          ) : (
            <Navigate to = "/login"/>
          )
        }/>
      </Routes>
      
      <Toaster />

    </div>
  )
}

export default App;