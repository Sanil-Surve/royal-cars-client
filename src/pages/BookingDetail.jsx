import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Shield,
  CreditCard,
  Car,
  Users,
  Briefcase,
  Zap,
  Settings2,
  Headphones,
  CheckCircle2,
  ChevronRight,
  Building2,
} from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import StatusBadge from "../components/StatusBadge";
import { api, formatINR, fileUrl } from "../lib/api";
import { payForBooking } from "../lib/payu";
import { toast } from "sonner";

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [bookingsRes, locationsRes] = await Promise.all([
        api.get(`/bookings/my`),
        api.get(`/locations`),
      ]);
      const found = bookingsRes.data.find((b) => b.id === id);
      if (!found) {
        toast.error("Booking not found");
        navigate("/dashboard");
        return;
      }
      
      // Resolve location IDs to names
      const locations = locationsRes.data || [];
      const pickupLoc = locations.find((l) => l.id === found.pickup_location_id);
      const dropoffLoc = locations.find((l) => l.id === found.dropoff_location_id);
      
      found.pickup_location = pickupLoc ? pickupLoc.name : null;
      found.dropoff_location = dropoffLoc ? dropoffLoc.name : null;

      setBooking(found);
    } catch (e) {
      toast.error("Failed to load booking");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handlePay = async (type) => {
    await payForBooking(booking, type, () => load());
  };

  const handlePayAtSite = async () => {
    try {
      await api.post("/payments/pay-at-site", { booking_id: booking.id });
      toast.success("Booking confirmed! Please pay at site.");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to confirm booking");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0A192F] border-t-transparent" />
            <p className="text-sm text-slate-500">Loading booking details…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const days = (() => {
    const pickup = new Date(`${booking.pickup_date}T${booking.pickup_time}`);
    const dropoff = new Date(`${booking.dropoff_date}T${booking.dropoff_time}`);
    return Math.max(1, Math.ceil((dropoff - pickup) / (1000 * 60 * 60 * 24)));
  })();

  const vehicleImg = booking.vehicle_image ? fileUrl(booking.vehicle_image) : null;

  const specItems = [
    { icon: <Zap className="h-5 w-5" />, label: "ENGINE", value: booking.vehicle_fuel_type || "Petrol" },
    { icon: <Settings2 className="h-5 w-5" />, label: "TRANSMISSION", value: booking.vehicle_transmission || "Manual" },
    { icon: <Users className="h-5 w-5" />, label: "SEATS", value: booking.vehicle_seats ? `${booking.vehicle_seats} Adults` : "5 Adults" },
    { icon: <Briefcase className="h-5 w-5" />, label: "LUGGAGE", value: booking.vehicle_luggage || "2 Large" },
  ];

  const canPayFull = booking.status === "verified";
  const canPayBalance = booking.balance_amount > 0 && booking.paid_amount > 0 && booking.status === "confirmed";

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <Navbar />

      {/* ── Mobile back bar ── */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1 text-sm font-medium text-[#0A192F]"
        >
          <ArrowLeft className="h-4 w-4" />
          Booking Details
        </button>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
        {/* ── Desktop: Booking ID header ── */}
        <div className="mb-6 hidden md:flex md:items-center md:justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#0A192F]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Bookings
          </button>
          <div className="flex items-center gap-3">
            <StatusBadge status={booking.status} />
            <span className="text-sm text-slate-500">
              Booking ID: <span className="font-mono font-semibold text-[#0A192F]">#{booking.id.slice(0, 8).toUpperCase()}</span>
            </span>
          </div>
        </div>

        {/* ── Mobile: Status + Booking ID ── */}
        <div className="mb-5 flex flex-col items-center gap-1 md:hidden">
          <StatusBadge status={booking.status} />
          <p className="text-xs text-slate-500">
            Booking ID: <span className="font-mono font-semibold text-[#0A192F]">#{booking.id.slice(0, 8).toUpperCase()}</span>
          </p>
        </div>

        {/* ── Desktop: page title ── */}
        <div className="mb-6 hidden md:flex md:items-center md:justify-between">
          <h1 className="font-heading text-3xl font-bold text-[#0A192F]">{booking.vehicle_name}</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="rounded-md border-slate-300"
              onClick={() => toast.info("Modify feature coming soon")}
            >
              <Settings2 className="mr-2 h-4 w-4" /> Modify
            </Button>
            <Button className="rounded-md bg-[#0A192F] text-white hover:bg-[#0A192F]/90">
              <Car className="mr-2 h-4 w-4" /> Get Key
            </Button>
          </div>
        </div>

        {/* ── Two-column layout (desktop) / stacked (mobile) ── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* ── LEFT COLUMN ── */}
          <motion.div
            className="space-y-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Vehicle image */}
            <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-sm">
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 md:aspect-[16/7]">
                {vehicleImg ? (
                  <img
                    src={vehicleImg}
                    alt={booking.vehicle_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Car className="h-20 w-20 text-slate-300" />
                  </div>
                )}
              </div>

              {/* Mobile: vehicle name + tags below image */}
              <div className="p-4 md:hidden">
                <h1 className="font-heading text-2xl font-bold text-[#0A192F]">{booking.vehicle_name}</h1>
                <div className="mt-2 flex flex-wrap gap-2">
                  {booking.vehicle_fuel_type && (
                    <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                      <Zap className="h-3 w-3" />
                      {booking.vehicle_fuel_type}
                    </span>
                  )}
                  {booking.vehicle_transmission && (
                    <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                      <Settings2 className="h-3 w-3" />
                      {booking.vehicle_transmission}
                    </span>
                  )}
                </div>
              </div>
            </Card>

            {/* Vehicle Specifications (desktop only) */}
            <Card className="hidden rounded-2xl border-slate-200 bg-white p-6 shadow-sm md:block">
              <h2 className="mb-4 font-heading text-lg font-semibold text-[#0A192F]">Vehicle Specifications</h2>
              <div className="grid grid-cols-4 divide-x divide-slate-100">
                {specItems.map((s) => (
                  <div key={s.label} className="flex flex-col items-center gap-2 px-4 py-3 text-center">
                    <span className="text-slate-400">{s.icon}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{s.label}</span>
                    <span className="text-sm font-medium text-[#0A192F]">{s.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Mobile: Pickup & Drop-off */}
            <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm md:hidden">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0A192F]">
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pickup</p>
                    <p className="mt-0.5 text-sm font-medium text-[#0A192F]">{booking.pickup_location || "See booking details"}</p>
                    <p className="text-xs text-slate-500">{booking.pickup_date}, {booking.pickup_time}</p>
                  </div>
                </div>
                <div className="ml-4 border-l-2 border-dashed border-slate-200 pl-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white">
                      <MapPin className="h-4 w-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Drop-off</p>
                      <p className="mt-0.5 text-sm font-medium text-[#0A192F]">{booking.dropoff_location || "Same location"}</p>
                      <p className="text-xs text-slate-500">{booking.dropoff_date}, {booking.dropoff_time}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Mobile: Reservation Details */}
            <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm md:hidden">
              <h2 className="mb-4 font-heading text-base font-semibold text-[#0A192F]">Reservation Details</h2>
              <div className="divide-y divide-slate-100">
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Building2 className="h-4 w-4" />
                    Rental Provider
                  </div>
                  <span className="text-sm font-medium text-[#0A192F]">{booking.provider_name || "Royal Cars"}</span>
                </div>
              </div>
            </Card>

            {/* Mobile: Price Breakdown */}
            <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm md:hidden">
              <h2 className="mb-4 font-heading text-base font-semibold text-[#0A192F]">Price Breakdown</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal ({days} {days === 1 ? "Day" : "Days"})</span>
                  <span className="font-medium text-[#0A192F]">{formatINR(booking.base_amount || booking.total_amount)}</span>
                </div>
                {booking.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fees & Taxes</span>
                    <span className="font-medium text-[#0A192F]">{formatINR(booking.tax_amount)}</span>
                  </div>
                )}
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-[#0A192F]">Total Price</span>
                    <span className="font-heading text-lg font-bold text-[#0A192F]">{formatINR(booking.total_amount)}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Provided by (desktop) */}
            <Card className="hidden rounded-2xl border-slate-200 bg-white p-5 shadow-sm md:flex md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A192F]">
                  <Car className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Provided By</p>
                  <p className="font-heading text-base font-semibold text-[#0A192F]">{booking.provider_name || "Royal Cars"}</p>
                </div>
              </div>
              <button className="flex items-center gap-1 text-sm font-medium text-[#0A192F] hover:text-[#D4AF37] transition">
                View Profile <ChevronRight className="h-4 w-4" />
              </button>
            </Card>

            {/* Mobile: action buttons */}
            <div className="flex flex-col gap-3 md:hidden">
              {canPayFull && (
                <>
                  <Button
                    className="w-full rounded-xl bg-[#0A192F] py-3 text-white hover:bg-[#0A192F]/90"
                    onClick={() => handlePay("full")}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay {formatINR(booking.total_amount)}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl py-3"
                    onClick={() => handlePay("partial")}
                  >
                    Pay 20% Advance
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl border-slate-300 py-3"
                    onClick={handlePayAtSite}
                  >
                    Pay At Site
                  </Button>
                </>
              )}
              {canPayBalance && (
                <Button
                  variant="outline"
                  className="w-full rounded-xl border-[#D4AF37] py-3 text-[#0A192F]"
                  onClick={() => handlePay("balance")}
                >
                  Pay Balance {formatINR(booking.balance_amount)}
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full rounded-xl py-3"
                onClick={() => toast.info("Modify feature coming soon")}
              >
                <Settings2 className="mr-2 h-4 w-4" />
                Modify Booking
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-xl border-slate-300 py-3 text-slate-600"
              >
                <Headphones className="mr-2 h-4 w-4" />
                Contact Support
              </Button>
            </div>
          </motion.div>

          {/* ── RIGHT COLUMN (desktop sidebar) ── */}
          <motion.div
            className="hidden space-y-5 md:flex md:flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {/* Trip Details card */}
            <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 font-heading text-lg font-semibold text-[#0A192F]">Trip Details</h2>
              <div className="space-y-5">
                {/* Pickup */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-3 w-3 shrink-0 rounded-full bg-[#0A192F] ring-4 ring-[#0A192F]/10" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pickup</p>
                    <p className="mt-0.5 font-semibold text-[#0A192F]">
                      {booking.pickup_date && booking.pickup_time
                        ? `${new Date(`${booking.pickup_date}T${booking.pickup_time}`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${booking.pickup_time}`
                        : "—"}
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" />
                      {booking.pickup_location || "Location TBD"}
                    </div>
                  </div>
                </div>

                {/* Dashed connector */}
                <div className="ml-[5px] border-l-2 border-dashed border-slate-200 pb-1 pl-6">
                  {/* Drop-off */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-3 w-3 shrink-0 rounded-full border-2 border-slate-300 bg-white ring-4 ring-slate-50" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Drop-off</p>
                      <p className="mt-0.5 font-semibold text-[#0A192F]">
                        {booking.dropoff_date && booking.dropoff_time
                          ? `${new Date(`${booking.dropoff_date}T${booking.dropoff_time}`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${booking.dropoff_time}`
                          : "—"}
                      </p>
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" />
                        {booking.dropoff_location || "Same location"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Price Breakdown card */}
            <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 font-heading text-lg font-semibold text-[#0A192F]">Price Breakdown</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Vehicle Rental ({days} {days === 1 ? "Day" : "Days"})</span>
                  <span className="font-medium text-[#0A192F]">{formatINR(booking.base_amount || booking.total_amount)}</span>
                </div>
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex justify-between">
                    <span className="font-heading text-base font-bold text-[#0A192F]">Total</span>
                    <span className="font-heading text-xl font-bold text-[#0A192F]">{formatINR(booking.total_amount)}</span>
                  </div>
                </div>
                {booking.paid_amount > 0 && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    Payment has been processed successfully
                    {booking.paid_amount < booking.total_amount && (
                      <span className="ml-1 font-medium text-amber-600">(Balance: {formatINR(booking.balance_amount)})</span>
                    )}
                  </div>
                )}
              </div>

              {/* Payment actions */}
              <div className="mt-5 space-y-3">
                {canPayFull && (
                  <>
                    <Button
                      className="w-full rounded-xl bg-[#0A192F] text-white hover:bg-[#0A192F]/90"
                      onClick={() => handlePay("full")}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay {formatINR(booking.total_amount)}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={() => handlePay("partial")}
                    >
                      Pay 20% Advance
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-slate-300"
                      onClick={handlePayAtSite}
                    >
                      Pay At Site
                    </Button>
                  </>
                )}
                {canPayBalance && (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl border-[#D4AF37] text-[#0A192F]"
                    onClick={() => handlePay("balance")}
                  >
                    Pay Balance {formatINR(booking.balance_amount)}
                  </Button>
                )}
              </div>

              {/* Contact Support */}
              <Button
                variant="outline"
                className="mt-3 w-full rounded-xl border-slate-200 text-slate-600"
              >
                <Headphones className="mr-2 h-4 w-4" />
                Contact Support
              </Button>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
