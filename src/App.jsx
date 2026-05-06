import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/AdminLayout";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Vehicles from "@/pages/Vehicles";
import BookingWizard from "@/pages/BookingWizard";
import KYCUpload from "@/pages/KYCUpload";
import CustomerDashboard from "@/pages/CustomerDashboard";

import AdminDashboard from "@/pages/AdminDashboard";
import AdminVehicles from "@/pages/AdminVehicles";
import AdminKYC from "@/pages/AdminKYC";
import AdminBookings from "@/pages/AdminBookings";
import AdminCustomers from "@/pages/AdminCustomers";
import AdminLocations from "@/pages/AdminLocations";
import AdminPayments from "@/pages/AdminPayments";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <Toaster position="top-right" richColors closeButton />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/book" element={<BookingWizard />} />
            <Route path="/kyc" element={<ProtectedRoute><KYCUpload /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />

            <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="vehicles" element={<AdminVehicles />} />
              <Route path="kyc" element={<AdminKYC />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="locations" element={<AdminLocations />} />
              <Route path="payments" element={<AdminPayments />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
