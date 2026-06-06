import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Crown, Eye, EyeOff, KeyRound, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { api, formatApiErrorDetail } from "../lib/api.jsx";
import { toast } from "sonner";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // If no token in URL, show an error immediately
  const missingToken = !token;

  const passwordStrength = (() => {
    if (!password) return null;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { label: "Weak", color: "#ef4444", width: "33%" };
    if (score === 2) return { label: "Fair", color: "#f59e0b", width: "60%" };
    if (score === 3) return { label: "Good", color: "#10b981", width: "80%" };
    return { label: "Strong", color: "#059669", width: "100%" };
  })();

  const handle = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setDone(true);
      toast.success("Password reset successfully!");
    } catch (err) {
      const msg = formatApiErrorDetail(err.response?.data?.detail) || "Something went wrong.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Left decorative panel */}
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
          <Link to="/" className="flex items-center gap-2">
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

      {/* Right panel */}
      <div className="flex items-center justify-center bg-[#FAFAFA] p-6">
        <Card className="w-full max-w-md rounded-xl border-slate-200 p-8">

          {missingToken ? (
            /* Invalid link state */
            <div className="flex flex-col items-center text-center py-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full mb-5"
                style={{ background: "#FEF2F2" }}
              >
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-[#0A192F]">Invalid reset link</h1>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                This password reset link is missing or invalid.
                Please request a new one.
              </p>
              <Link
                to="/forgot-password"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-[#0A192F] px-6 text-sm font-medium text-white hover:bg-[#0A192F]/90 transition-colors"
              >
                Request new link
              </Link>
            </div>
          ) : done ? (
            /* Success state */
            <div className="flex flex-col items-center text-center py-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full mb-5"
                style={{ background: "linear-gradient(135deg, #D4AF37 0%, #f0d060 100%)" }}
              >
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-[#0A192F]">Password updated!</h1>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Your password has been reset successfully.
                You can now sign in with your new password.
              </p>
              <Link
                to="/login"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-[#0A192F] px-6 text-sm font-medium text-white hover:bg-[#0A192F]/90 transition-colors"
                data-testid="reset-go-to-login"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            /* Form state */
            <>
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl mb-5"
                style={{ background: "#0A192F" }}
              >
                <KeyRound className="h-6 w-6 text-[#D4AF37]" />
              </div>
              <h1 className="font-heading text-3xl font-bold text-[#0A192F]">New password</h1>
              <p className="mt-1 text-sm text-slate-600">
                Choose a strong password for your Royal Cars account.
              </p>

              <form onSubmit={handle} className="mt-6 space-y-4">
                {/* New password */}
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-500">New password</label>
                  <div className="relative mt-1">
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      className="h-11 rounded-md pr-10"
                      data-testid="reset-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 focus:outline-none transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>

                  {/* Strength indicator */}
                  {passwordStrength && (
                    <div className="mt-2">
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: passwordStrength.width, background: passwordStrength.color }}
                        />
                      </div>
                      <p className="mt-1 text-xs" style={{ color: passwordStrength.color }}>
                        {passwordStrength.label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-500">Confirm password</label>
                  <div className="relative mt-1">
                    <Input
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      type={showConfirm ? "text" : "password"}
                      required
                      minLength={6}
                      className="h-11 rounded-md pr-10"
                      data-testid="reset-confirm-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 focus:outline-none transition-colors"
                      aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {confirm && password !== confirm && (
                    <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                  )}
                  {confirm && password === confirm && confirm.length >= 6 && (
                    <p className="mt-1 text-xs text-emerald-600">✓ Passwords match</p>
                  )}
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-2 text-sm text-red-600" data-testid="reset-error">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-md bg-[#0A192F] text-white hover:bg-[#0A192F]/90"
                  data-testid="reset-submit-btn"
                >
                  {loading ? "Updating…" : "Reset password"}
                </Button>
              </form>

              <div className="mt-4 text-center text-sm text-slate-500">
                <Link to="/forgot-password" className="underline decoration-[#D4AF37] underline-offset-4 text-[#0A192F]">
                  Request a new link
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
