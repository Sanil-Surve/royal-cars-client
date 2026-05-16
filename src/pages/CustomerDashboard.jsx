import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, CreditCard, FileText } from "lucide-react";
import Navbar from "../components/Navbar";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { api, formatINR } from "../lib/api";
import { payForBooking } from "../lib/razorpay";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/bookings/my");
    setBookings(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const active = bookings.filter((b) => ["verified", "confirmed", "active", "pending_kyc"].includes(b.status));
  const past = bookings.filter((b) => ["completed", "cancelled"].includes(b.status));

  const payRemaining = async (booking) => {
    await payForBooking(booking, "balance", () => load());
  };

  const payForBookingFn = async (booking, type) => {
    await payForBooking(booking, type, () => load());
  };

  const handlePayAtSite = async (booking) => {
    try {
      await api.post("/payments/pay-at-site", { booking_id: booking.id });
      toast.success("Booking confirmed! Please pay at site.");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to confirm bookings");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-500">Hello {user?.name?.split(" ")[0]}</div>
            <h1 className="font-heading text-3xl font-bold text-[#0A192F] sm:text-4xl" data-testid="dashboard-title">My bookings</h1>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={user?.kyc_status || "not_submitted"} />
            <Link to="/kyc">
              <Button variant="outline" className="rounded-md" data-testid="dashboard-kyc-btn"><FileText className="mr-2 h-4 w-4" /> KYC</Button>
            </Link>
            <Link to="/vehicles">
              <Button className="rounded-md bg-[#0A192F] text-white" data-testid="dashboard-new-booking-btn">New booking</Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500" data-testid="dashboard-loading">Loading...</div>
        ) : bookings.length === 0 ? (
          <Card className="rounded-lg border-dashed border-slate-300 bg-white p-12 text-center" data-testid="dashboard-empty">
            <Calendar className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-4 font-heading text-xl text-[#0A192F]">No bookings yet</h3>
            <p className="mt-1 text-sm text-slate-600">Ready for your next drive?</p>
            <Link to="/vehicles"><Button className="mt-4 rounded-md bg-[#0A192F] text-white">Browse vehicles</Button></Link>
          </Card>
        ) : (
          <div className="space-y-10">
            <Section title="Active bookings" items={active} payForBooking={payForBookingFn} payRemaining={payRemaining} handlePayAtSite={handlePayAtSite} user={user} />
            <Section title="Past bookings" items={past} />
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, items, payForBooking, payRemaining, handlePayAtSite, user }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 className="mb-4 font-heading text-xl text-[#0A192F]">{title}</h2>
      <div className="grid gap-4">
        {items.map((b) => (
          <Card key={b.id} className="grid gap-4 rounded-lg border-slate-200 p-4 md:grid-cols-[140px_1fr_auto]" data-testid={`booking-${b.id}`}>
            <div className="aspect-[4/3] overflow-hidden rounded-md bg-slate-100">
              {b.vehicle_image ? <img src={b.vehicle_image} alt={b.vehicle_name} className="h-full w-full object-cover" /> : null}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-heading text-lg text-[#0A192F]">{b.vehicle_name}</h3>
                <StatusBadge status={b.status} />
              </div>
              <div className="mt-1 text-xs text-slate-500">Booking #{b.id.slice(0, 8)}</div>
              <div className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                <div>Pickup: {b.pickup_date} {b.pickup_time}</div>
                <div>Drop-off: {b.dropoff_date} {b.dropoff_time}</div>
              </div>
              <div className="mt-2 text-sm">
                <span className="text-slate-600">Total: </span><span className="font-heading text-[#0A192F]">{formatINR(b.total_amount)}</span>
                {b.balance_amount > 0 && b.paid_amount > 0 && (
                  <span className="ml-2 text-xs text-amber-700">Balance: {formatINR(b.balance_amount)}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end justify-between gap-2">
              {payForBooking && b.status === "verified" && user?.kyc_status === "approved" && (
                <div className="flex flex-col gap-2">
                  <Button size="sm" onClick={() => payForBooking(b, "full")} className="rounded-md bg-[#0A192F] text-white" data-testid={`pay-full-${b.id}`}>
                    <CreditCard className="mr-2 h-4 w-4" /> Pay {formatINR(b.total_amount)}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => payForBooking(b, "partial")} className="rounded-md" data-testid={`pay-partial-${b.id}`}>
                    Pay 20% advance
                  </Button>
                  {handlePayAtSite && (
                    <Button size="sm" variant="outline" onClick={() => handlePayAtSite(b)} className="rounded-md border-slate-300" data-testid={`pay-site-${b.id}`}>
                      Pay At Site
                    </Button>
                  )}
                </div>
              )}
              {payRemaining && b.balance_amount > 0 && b.paid_amount > 0 && b.status === "confirmed" && (
                <Button size="sm" onClick={() => payRemaining(b)} variant="outline" className="rounded-md border-[#D4AF37] text-[#0A192F]" data-testid={`pay-balance-${b.id}`}>
                  Pay balance {formatINR(b.balance_amount)}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
