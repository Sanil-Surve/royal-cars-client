import { Link, useNavigate } from "react-router-dom";
import { Crown, LayoutDashboard, LogOut, User } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "../context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="glass-nav sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2" data-testid="brand-link">
          <Crown className="h-6 w-6" style={{ color: "#D4AF37" }} />
          <span className="font-heading text-2xl font-bold tracking-tight text-[#0A192F]">
            Royal Cars
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/vehicles" className="text-sm text-[#0A192F] transition hover:text-[#D4AF37]" data-testid="nav-vehicles">
            Vehicles
          </Link>
          <Link to="/about" className="text-sm text-[#0A192F] transition hover:text-[#D4AF37]" data-testid="nav-about">
            About
          </Link>
          {user && user.role === "admin" && (
            <Link to="/admin" className="text-sm font-medium text-[#0A192F] transition hover:text-[#D4AF37]" data-testid="nav-admin">
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {!user ? (
            <>
              <Link to="/login">
                <Button variant="ghost" className="rounded-md" data-testid="nav-login-btn">
                  Sign in
                </Button>
              </Link>
              <Link to="/register">
                <Button className="rounded-md bg-[#0A192F] text-white hover:bg-[#0A192F]/90" data-testid="nav-register-btn">
                  Get started
                </Button>
              </Link>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-md" data-testid="nav-user-menu">
                  <User className="mr-2 h-4 w-4" />
                  {user.name?.split(" ")[0] || "Account"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user.role === "admin" ? (
                  <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Admin Dashboard
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} data-testid="menu-dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> My Bookings
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate("/kyc")} data-testid="menu-kyc">
                  <User className="mr-2 h-4 w-4" /> KYC Documents
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
