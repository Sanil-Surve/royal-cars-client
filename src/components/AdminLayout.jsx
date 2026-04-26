import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Car, FileCheck2, CalendarCheck, Users, MapPin, CreditCard, Crown, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";

const NAV = [
  { to: "/admin", end: true, icon: LayoutDashboard, label: "Dashboard", id: "admin-nav-dashboard" },
  { to: "/admin/vehicles", icon: Car, label: "Vehicles", id: "admin-nav-vehicles" },
  { to: "/admin/kyc", icon: FileCheck2, label: "KYC Queue", id: "admin-nav-kyc" },
  { to: "/admin/bookings", icon: CalendarCheck, label: "Bookings", id: "admin-nav-bookings" },
  { to: "/admin/customers", icon: Users, label: "Customers", id: "admin-nav-customers" },
  { to: "/admin/locations", icon: MapPin, label: "Locations", id: "admin-nav-locations" },
  { to: "/admin/payments", icon: CreditCard, label: "Payments", id: "admin-nav-payments" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen bg-[#FAFAFA]">
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-200">
          <Crown className="h-5 w-5" style={{ color: "#D4AF37" }} />
          <div>
            <div className="font-heading text-lg font-bold text-[#0A192F]">Royal Cars</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Fleet Console</div>
          </div>
        </div>
        <nav className="flex-1 p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={item.id}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${
                  isActive
                    ? "bg-[#0A192F] text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-[#0A192F]"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <div className="mb-2 text-xs text-slate-500">{user?.email}</div>
          <Button
            onClick={async () => { await logout(); navigate("/"); }}
            variant="outline"
            className="w-full justify-start rounded-md"
            data-testid="admin-logout-btn"
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto">
        <Outlet />
      </main>
    </div>
  );
}
