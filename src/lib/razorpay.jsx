import { api, formatApiErrorDetail } from "./api";
import { toast } from "sonner";

const RZP_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const s = document.createElement("script");
    s.src = RZP_SCRIPT_SRC;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/**
 * Opens Razorpay Checkout for a booking.
 * paymentType: "full" | "partial" | "balance"
 * Returns a promise that resolves with the updated booking on success, null on cancel/error.
 */
export async function payForBooking(booking, paymentType, onSuccess) {
  const ok = await loadRazorpayScript();
  if (!ok) {
    toast.error("Unable to load payment gateway. Check your connection.");
    return null;
  }

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

  return new Promise((resolve) => {
    const options = {
      key: init.key,
      order_id: init.order_id,
      amount: init.amount,
      currency: init.currency,
      name: "Royal Cars",
      description: `Booking #${booking.id.slice(0, 8)} · ${paymentType}`,
      prefill: init.prefill,
      notes: init.notes,
      theme: { color: "#0A192F" },
      handler: async (res) => {
        try {
          const verify = await api.post("/payments/verify", {
            booking_id: booking.id,
            razorpay_order_id: res.razorpay_order_id,
            razorpay_payment_id: res.razorpay_payment_id,
            razorpay_signature: res.razorpay_signature,
          });
          toast.success("Payment successful");
          onSuccess && onSuccess(verify.data);
          resolve(verify.data);
        } catch (e) {
          toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Verification failed");
          resolve(null);
        }
      },
      modal: { ondismiss: () => resolve(null) },
    };
    if (init.customer_id) options.customer_id = init.customer_id;
    if (init.save_token) {
      // Tokenize the payment method for later balance charge.
      // `save: 1` works on all cards; `recurring: 1` would require e-mandate support.
      options.save = 1;
    }
    try {
      const rz = new window.Razorpay(options);
      rz.on("payment.failed", (resp) => {
        toast.error(resp?.error?.description || "Payment failed");
        resolve(null);
      });
      rz.open();
    } catch (e) {
      toast.error(e.message || "Could not open checkout");
      resolve(null);
    }
  });
}
