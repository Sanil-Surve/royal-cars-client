import "@/App.css";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";

// Always-eager: needed on every route, tiny in size
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/AdminLayout";

// ── Customer pages — lazy loaded (bundle-dynamic-imports) ────────────────────
const Home               = lazy(() => import("@/pages/Home"));
const Login              = lazy(() => import("@/pages/Login"));
const Register           = lazy(() => import("@/pages/Register"));
const ForgotPassword     = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword      = lazy(() => import("@/pages/ResetPassword"));
const Vehicles           = lazy(() => import("@/pages/Vehicles"));
const BookingWizard      = lazy(() => import("@/pages/BookingWizard"));
const KYCUpload          = lazy(() => import("@/pages/KYCUpload"));
const CustomerDashboard  = lazy(() => import("@/pages/CustomerDashboard"));
const BookingDetail      = lazy(() => import("@/pages/BookingDetail"));
const Profile            = lazy(() => import("@/pages/Profile"));

// ── Admin pages — lazy loaded ─────────────────────────────────────────────────
const AdminDashboard     = lazy(() => import("@/pages/AdminDashboard"));
const AdminVehicles      = lazy(() => import("@/pages/AdminVehicles"));
const AdminKYC           = lazy(() => import("@/pages/AdminKYC"));
const AdminBookings      = lazy(() => import("@/pages/AdminBookings"));
const AdminBookingDetail = lazy(() => import("@/pages/AdminBookingDetail"));
const AdminManualBooking = lazy(() => import("@/pages/AdminManualBooking"));
const AdminCustomers     = lazy(() => import("@/pages/AdminCustomers"));
const AdminCustomerDetail= lazy(() => import("@/pages/AdminCustomerDetail"));
const AdminLocations     = lazy(() => import("@/pages/AdminLocations"));
const AdminPayments      = lazy(() => import("@/pages/AdminPayments"));
const AdminCoupons       = lazy(() => import("@/pages/AdminCoupons"));
const AdminAnalytics     = lazy(() => import("@/pages/AdminAnalytics"));

// ── Shared page-transition fallback ──────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
      <Loader2 className="h-6 w-6 animate-spin text-[#0A192F]" />
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <Toaster position="top-right" richColors closeButton />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ── Public routes ── */}
              <Route path="/"               element={<Home />} />
              <Route path="/login"          element={<Login />} />
              <Route path="/register"       element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/vehicles"       element={<Vehicles />} />
              <Route path="/book"           element={<BookingWizard />} />

              {/* ── Protected customer routes ── */}
              <Route path="/kyc"           element={<ProtectedRoute><KYCUpload /></ProtectedRoute>} />
              <Route path="/dashboard"     element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
              <Route path="/bookings/:id"  element={<ProtectedRoute><BookingDetail /></ProtectedRoute>} />
              <Route path="/profile"       element={<ProtectedRoute><Profile /></ProtectedRoute>} />

              {/* ── Admin routes ── */}
              <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
                <Route index                  element={<AdminDashboard />} />
                <Route path="vehicles"        element={<AdminVehicles />} />
                <Route path="kyc"             element={<AdminKYC />} />
                <Route path="bookings"        element={<AdminBookings />} />
                <Route path="bookings/new"    element={<AdminManualBooking />} />
                <Route path="bookings/:id"    element={<AdminBookingDetail />} />
                <Route path="customers"       element={<AdminCustomers />} />
                <Route path="customers/:id"   element={<AdminCustomerDetail />} />
                <Route path="locations"       element={<AdminLocations />} />
                <Route path="payments"        element={<AdminPayments />} />
                <Route path="coupons"         element={<AdminCoupons />} />
                <Route path="analytics"       element={<AdminAnalytics />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
