import { useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { api, formatApiErrorDetail } from "../lib/api.jsx";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handle = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(
        formatApiErrorDetail(err.response?.data?.detail) || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Left panel */}
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
          {/* Back to login */}
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0A192F] transition-colors mb-6"
            data-testid="forgot-back-to-login"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>

          {sent ? (
            /* Success state */
            <div className="flex flex-col items-center text-center py-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full mb-5"
                style={{ background: "linear-gradient(135deg, #D4AF37 0%, #f0d060 100%)" }}
              >
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-[#0A192F]">Check your inbox</h1>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                We've sent a password reset link to{" "}
                <span className="font-semibold text-[#0A192F]">{email}</span>.
                <br />
                The link expires in <span className="font-semibold">1 hour</span>.
              </p>
              <p className="mt-4 text-xs text-slate-400">
                Didn't receive it? Check your spam folder or{" "}
                <button
                  className="underline decoration-[#D4AF37] underline-offset-2 text-[#0A192F] hover:opacity-80 transition-opacity"
                  onClick={() => { setSent(false); setEmail(""); }}
                >
                  try again
                </button>.
              </p>
            </div>
          ) : (
            /* Form state */
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl mb-5" style={{ background: "#0A192F" }}>
                <Mail className="h-6 w-6 text-[#D4AF37]" />
              </div>
              <h1 className="font-heading text-3xl font-bold text-[#0A192F]">Forgot password?</h1>
              <p className="mt-1 text-sm text-slate-600">
                Enter your registered email and we'll send you a reset link.
              </p>

              <form onSubmit={handle} className="mt-6 space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-500">
                    Email address
                  </label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="mt-1 h-11 rounded-md"
                    data-testid="forgot-email-input"
                  />
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-2 text-sm text-red-600" data-testid="forgot-error">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-md bg-[#0A192F] text-white hover:bg-[#0A192F]/90"
                  data-testid="forgot-submit-btn"
                >
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
