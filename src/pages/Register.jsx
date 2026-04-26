import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Crown } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handle = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await register(form);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      toast.error(res.error);
      return;
    }
    toast.success("Account created");
    navigate("/dashboard");
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="flex items-center justify-center bg-[#FAFAFA] p-6">
        <Card className="w-full max-w-md rounded-xl border-slate-200 p-8">
          <Link to="/" className="mb-4 inline-flex items-center gap-2" data-testid="register-brand-link">
            <Crown className="h-5 w-5" style={{ color: "#D4AF37" }} />
            <span className="font-heading text-xl font-bold text-[#0A192F]">Royal Cars</span>
          </Link>
          <h1 className="font-heading text-3xl font-bold text-[#0A192F]">Create account</h1>
          <p className="mt-1 text-sm text-slate-600">Takes less than a minute</p>
          <form onSubmit={handle} className="mt-6 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-500">Full name</label>
              <Input value={form.name} onChange={set("name")} required className="mt-1 h-11 rounded-md" data-testid="register-name-input" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-500">Email</label>
              <Input value={form.email} onChange={set("email")} type="email" required className="mt-1 h-11 rounded-md" data-testid="register-email-input" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-500">Phone</label>
              <Input value={form.phone} onChange={set("phone")} className="mt-1 h-11 rounded-md" data-testid="register-phone-input" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-500">Password</label>
              <Input value={form.password} onChange={set("password")} type="password" required minLength={6} className="mt-1 h-11 rounded-md" data-testid="register-password-input" />
            </div>
            {error && <div className="rounded-md bg-red-50 p-2 text-sm text-red-600" data-testid="register-error">{error}</div>}
            <Button type="submit" disabled={loading} className="h-11 w-full rounded-md bg-[#0A192F] text-white hover:bg-[#0A192F]/90" data-testid="register-submit-btn">
              {loading ? "Creating..." : "Create account"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-slate-600">
            Already a member? <Link to="/login" className="font-medium text-[#0A192F] underline decoration-[#D4AF37] underline-offset-4" data-testid="register-to-login-link">Sign in</Link>
          </div>
        </Card>
      </div>
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
        <div className="absolute inset-0 bg-[#0A192F]/75" />
        <div className="relative flex h-full flex-col justify-end p-10 text-white">
          <p className="font-heading text-3xl leading-tight">Start your next journey with a royal ride.</p>
        </div>
      </div>
    </div>
  );
}
