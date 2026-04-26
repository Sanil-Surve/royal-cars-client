import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Crown } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      toast.error(res.error);
      return;
    }
    toast.success("Welcome back");
    const from = location.state?.from || (res.user.role === "admin" ? "/admin" : "/dashboard");
    navigate(from);
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden md:block">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "url(https://images.pexels.com/photos/4046718/pexels-photo-4046718.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-[#0A192F]/70" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link to="/" className="flex items-center gap-2" data-testid="auth-brand-link">
            <Crown className="h-5 w-5" style={{ color: "#D4AF37" }} />
            <span className="font-heading text-xl font-bold">Royal Cars</span>
          </Link>
          <div>
            <p className="font-heading text-3xl leading-tight">
              "The smoothest rental I've done in India. Clean car, clean paperwork, clean pickup."
            </p>
            <p className="mt-4 text-sm text-white/70">— Rahul S., Kharghar</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center bg-[#FAFAFA] p-6">
        <Card className="w-full max-w-md rounded-xl border-slate-200 p-8">
          <h1 className="font-heading text-3xl font-bold text-[#0A192F]">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-600">Sign in to your Royal Cars account</p>
          <form onSubmit={handle} className="mt-6 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-500">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-1 h-11 rounded-md" data-testid="login-email-input" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-500">Password</label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="mt-1 h-11 rounded-md" data-testid="login-password-input" />
            </div>
            {error && <div className="rounded-md bg-red-50 p-2 text-sm text-red-600" data-testid="login-error">{error}</div>}
            <Button type="submit" disabled={loading} className="h-11 w-full rounded-md bg-[#0A192F] text-white hover:bg-[#0A192F]/90" data-testid="login-submit-btn">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-slate-600">
            New here? <Link to="/register" className="font-medium text-[#0A192F] underline decoration-[#D4AF37] underline-offset-4" data-testid="login-to-register-link">Create an account</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
