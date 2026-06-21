import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { api, formatApiErrorDetail } from "./api";
import { toast } from "sonner";

const POLL_INTERVAL_MS = 4000; // poll every 4 seconds
const MAX_POLL_ATTEMPTS = 75;  // ~5 minutes max

/**
 * Renders a UPI QR code payment modal and polls for completion.
 * Returns a promise that resolves with the updated booking on success, null on cancel/timeout.
 */
export async function payForBooking(booking, paymentType, onSuccess) {
  // 1. Init payment server-side (generates hash + calls PayU)
  let init;
  try {
    const { data } = await api.post("/payments/init", {
      booking_id: booking.id,
      payment_type: paymentType,
    });
    init = data;
  } catch (e) {
    toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    return null;
  }

  if (!init.intentURIData) {
    toast.error("PayU did not return a UPI intent. Please try again.");
    return null;
  }

  // 2. Open QR modal and poll for payment
  return new Promise((resolve) => {
    const container = document.createElement("div");
    container.id = "payu-qr-modal-root";
    document.body.appendChild(container);

    let modalHandle = null;

    function cleanup() {
      if (modalHandle) {
        modalHandle.unmount();
      }
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }

    function onPaid(updatedBooking) {
      cleanup();
      toast.success("Payment successful! 🎉");
      onSuccess && onSuccess(updatedBooking);
      resolve(updatedBooking);
    }

    function onCancel() {
      cleanup();
      resolve(null);
    }

    // Render the React modal into the container
    modalHandle = renderPayUModal(container, {
      init,
      booking,
      paymentType,
      onPaid,
      onCancel,
    });
  });
}

/** Dynamically renders the PayU QR modal using vanilla DOM + React portal */
function renderPayUModal(container, props) {
  let root = null;
  const promise = import("react-dom/client").then(({ createRoot }) => {
    root = createRoot(container);
    root.render(<PayUQRModal {...props} />);
    return root;
  });

  return {
    unmount: () => {
      promise.then((r) => {
        if (r) {
          try {
            r.unmount();
          } catch (e) {
            console.error("Failed to unmount PayU root:", e);
          }
        }
      });
    }
  };
}

/** The actual QR modal component */
function PayUQRModal({ init, booking, paymentType, onPaid, onCancel }) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("waiting"); // waiting | verifying | success | failed
  const [pollCount, setPollCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minute countdown
  const pollRef = useRef(null);
  const timerRef = useRef(null);
  const statusRef = useRef(status);

  // Sync status ref to avoid stale closure
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Draw QR code on canvas
  useEffect(() => {
    if (canvasRef.current && init.intentURIData) {
      QRCode.toCanvas(canvasRef.current, init.intentURIData, {
        width: 220,
        margin: 2,
        color: { dark: "#0A192F", light: "#FFFFFF" },
      }).catch(console.error);
    }
  }, [init.intentURIData]);

  // Auto-poll for payment status
  useEffect(() => {
    let attempts = 0;

    async function poll() {
      if (attempts >= MAX_POLL_ATTEMPTS || statusRef.current === "success") {
        clearInterval(pollRef.current);
        if (attempts >= MAX_POLL_ATTEMPTS) {
          setStatus("failed");
          toast.error("Payment timed out. Please try again or pay at site.");
        }
        return;
      }
      attempts++;
      setPollCount(attempts);

      try {
        const { data } = await api.post("/payments/verify", {
          booking_id: booking.id,
          txnid: init.txnid,
        });
        clearInterval(pollRef.current);
        clearInterval(timerRef.current);
        setStatus("success");
        setTimeout(() => onPaid(data), 800);
      } catch (e) {
        const code = e.response?.status;
        if (code === 402) {
          // Not yet paid — keep polling silently
        } else if (code >= 400 && code < 500) {
          clearInterval(pollRef.current);
          clearInterval(timerRef.current);
          setStatus("failed");
          toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Verification failed");
        }
        // Network errors: keep retrying
      }
    }

    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);

    // Countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      clearInterval(pollRef.current);
      clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualVerify = async () => {
    setStatus("verifying");
    try {
      const { data } = await api.post("/payments/verify", {
        booking_id: booking.id,
        txnid: init.txnid,
      });
      setStatus("success");
      clearInterval(pollRef.current);
      clearInterval(timerRef.current);
      setTimeout(() => onPaid(data), 600);
    } catch (e) {
      const code = e.response?.status;
      if (code === 402) {
        toast.info("Payment not yet received. Please complete the UPI payment first.");
      } else {
        toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Verification failed");
      }
      setStatus("waiting");
    }
  };
 
  const handleSimulateSuccess = async () => {
    setStatus("verifying");
    try {
      await api.post("/payments/simulate-success", {
        booking_id: booking.id,
        txnid: init.txnid,
      });
      toast.success("Sandbox simulation active! Verifying...");
      handleManualVerify();
    } catch (e) {
      toast.error("Failed to simulate sandbox success");
      setStatus("waiting");
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const paymentLabel =
    paymentType === "partial" ? "20% Advance" :
    paymentType === "balance" ? "Balance Due" : "Full Payment";

  return (
    <>
      {/* Overlay */}
      <div
        onClick={status === "success" ? undefined : onCancel}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(10,25,47,0.65)",
          backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "payuFadeIn 0.2s ease",
        }}
      >
        {/* Modal Card */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "relative",
            background: "#fff",
            borderRadius: "20px",
            padding: "32px 28px 28px",
            width: "340px",
            maxWidth: "95vw",
            boxShadow: "0 24px 64px rgba(10,25,47,0.24), 0 0 0 1px rgba(10,25,47,0.06)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            animation: "payuSlideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {/* Close button */}
          {status !== "success" && (
            <button
              onClick={onCancel}
              style={{
                position: "absolute", top: 14, right: 14,
                background: "#f1f5f9", border: "none", borderRadius: "50%",
                width: 30, height: 30, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#64748b", fontSize: 16, fontWeight: 700,
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#e2e8f0"}
              onMouseLeave={e => e.currentTarget.style.background = "#f1f5f9"}
            >
              ✕
            </button>
          )}

          {/* Header */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "linear-gradient(135deg, #FF6B35 0%, #F7A73A 100%)",
              borderRadius: 12, padding: "6px 14px", marginBottom: 10,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="1" y="1" width="10" height="10" rx="2" stroke="white" strokeWidth="2"/>
                <rect x="13" y="1" width="10" height="10" rx="2" stroke="white" strokeWidth="2"/>
                <rect x="1" y="13" width="10" height="10" rx="2" stroke="white" strokeWidth="2"/>
                <rect x="15" y="15" width="2" height="2" fill="white"/>
                <rect x="19" y="15" width="2" height="2" fill="white"/>
                <rect x="15" y="19" width="2" height="2" fill="white"/>
                <rect x="19" y="19" width="2" height="2" fill="white"/>
              </svg>
              <span style={{ color: "white", fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}>
                UPI Payment
              </span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0A192F", lineHeight: 1.2 }}>
              ₹{init.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
              {paymentLabel} · Booking #{booking.id?.slice(0, 8).toUpperCase()}
            </div>
          </div>

          {/* QR Canvas */}
          {status !== "success" ? (
            <>
              <div style={{
                position: "relative",
                borderRadius: 16,
                padding: 10,
                background: "linear-gradient(135deg, #f8fafc, #f1f5f9)",
                border: "1.5px solid #e2e8f0",
                boxShadow: "inset 0 2px 8px rgba(10,25,47,0.04)",
              }}>
                <canvas ref={canvasRef} style={{ display: "block", borderRadius: 8 }} />
                {/* Corner accents */}
                {[
                  { top: 0, left: 0, borderTop: "3px solid #FF6B35", borderLeft: "3px solid #FF6B35", borderRadius: "8px 0 0 0" },
                  { top: 0, right: 0, borderTop: "3px solid #FF6B35", borderRight: "3px solid #FF6B35", borderRadius: "0 8px 0 0" },
                  { bottom: 0, left: 0, borderBottom: "3px solid #FF6B35", borderLeft: "3px solid #FF6B35", borderRadius: "0 0 0 8px" },
                  { bottom: 0, right: 0, borderBottom: "3px solid #FF6B35", borderRight: "3px solid #FF6B35", borderRadius: "0 0 8px 0" },
                ].map((s, i) => (
                  <div key={i} style={{ position: "absolute", width: 18, height: 18, ...s }} />
                ))}
              </div>

              {/* Instruction */}
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 13, color: "#374151", fontWeight: 600 }}>
                  Scan with any UPI app
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "#64748b" }}>
                  Google Pay · PhonePe · Paytm · BHIM · any UPI app
                </p>
              </div>

              {/* Status indicator */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "#f0fdf4", border: "1px solid #bbf7d0",
                borderRadius: 10, padding: "8px 14px", width: "100%",
                boxSizing: "border-box",
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: status === "verifying" ? "#f59e0b" : "#22c55e",
                  boxShadow: status === "verifying"
                    ? "0 0 0 3px rgba(245,158,11,0.2)"
                    : "0 0 0 3px rgba(34,197,94,0.2)",
                  animation: "payuPulse 1.5s ease infinite",
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 12, color: "#166534", fontWeight: 500, flex: 1 }}>
                  {status === "verifying"
                    ? "Checking payment status…"
                    : `Waiting for payment · ${formatTime(timeLeft)}`}
                </span>
              </div>

              {/* Sandbox Simulator */}
              {init.is_sandbox && (
                <button
                  onClick={handleSimulateSuccess}
                  disabled={status === "verifying"}
                  style={{
                    width: "100%", padding: "10px 0",
                    background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                    color: "white", border: "none", borderRadius: 10,
                    fontWeight: 700, fontSize: 13, cursor: status === "verifying" ? "not-allowed" : "pointer",
                    transition: "opacity 0.2s",
                    boxShadow: "0 4px 12px rgba(16,185,129,0.2)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
                  onMouseLeave={e => e.currentTarget.style.opacity = 1}
                >
                  {status === "verifying" ? "Simulating..." : "Simulate Sandbox Success 🧪"}
                </button>
              )}

              {/* Manual verify + cancel */}
              <div style={{ display: "flex", gap: 8, width: "100%" }}>
                <button
                  onClick={handleManualVerify}
                  disabled={status === "verifying"}
                  style={{
                    flex: 1, padding: "10px 0",
                    background: status === "verifying" ? "#94a3b8" : "#0A192F",
                    color: "white", border: "none", borderRadius: 10,
                    fontWeight: 700, fontSize: 13, cursor: status === "verifying" ? "not-allowed" : "pointer",
                    transition: "background 0.2s, transform 0.1s",
                  }}
                  onMouseEnter={e => { if (status !== "verifying") e.currentTarget.style.background = "#1e3a5f"; }}
                  onMouseLeave={e => { if (status !== "verifying") e.currentTarget.style.background = "#0A192F"; }}
                >
                  {status === "verifying" ? "Checking…" : "I've Paid ✓"}
                </button>
                <button
                  onClick={onCancel}
                  style={{
                    flex: 1, padding: "10px 0",
                    background: "transparent", color: "#64748b",
                    border: "1.5px solid #e2e8f0", borderRadius: 10,
                    fontWeight: 600, fontSize: 13, cursor: "pointer",
                    transition: "border-color 0.2s, color 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#94a3b8"; e.currentTarget.style.color = "#0A192F"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; }}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            /* Success State */
            <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
                boxShadow: "0 8px 24px rgba(34,197,94,0.35)",
                animation: "payuScalePop 0.4s cubic-bezier(0.34,1.56,0.64,1)",
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0A192F" }}>
                Payment Successful!
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
                Your booking has been confirmed.
              </p>
            </div>
          )}

          {/* Secure badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 11, color: "#94a3b8",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#94a3b8" strokeWidth="2"/>
            </svg>
            Secured by PayU · 256-bit SSL
          </div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes payuFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes payuSlideUp { from { transform: translateY(24px) scale(0.96); opacity: 0 } to { transform: translateY(0) scale(1); opacity: 1 } }
        @keyframes payuScalePop { from { transform: scale(0.5); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes payuPulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }
      `}</style>
    </>
  );
}
