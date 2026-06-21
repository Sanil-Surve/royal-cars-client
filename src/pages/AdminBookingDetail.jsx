import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Car,
  Camera,
  Download,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  Play,
  Square,
  CreditCard,
  Check,
  Gauge,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import StatusBadge from "../components/StatusBadge";
import StartRideDialog from "../components/StartRideDialog";
import EndRideDialog from "../components/EndRideDialog";
import { api, formatINR, formatApiErrorDetail } from "../lib/api";
import { toast } from "sonner";

const STATUSES = [
  "pending_kyc",
  "verified",
  "confirmed",
  "active",
  "completed",
  "cancelled",
];

export default function AdminBookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDialog, setStartDialog] = useState({ open: false });
  const [endDialog, setEndDialog] = useState({ open: false });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/bookings/${id}`);

      // Fetch customer info separately if not embedded
      if (!data.customer_name || !data.customer_email) {
        try {
          const adminRes = await api.get("/admin/bookings", { params: { status: data.status } });
          const match = adminRes.data.find((b) => b.id === id);
          if (match) {
            data.customer_name = match.customer_name;
            data.customer_email = match.customer_email;
            data.customer_phone = match.customer_phone;
          }
        } catch (_) {
          // ignore — customer info is optional
        }
      }

      setBooking(data);
    } catch (e) {
      toast.error("Failed to load booking details");
      navigate("/admin/bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const setStatus = async (status) => {
    try {
      await api.patch(`/admin/bookings/${id}/status`, { status });
      toast.success("Status updated");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    }
  };

  const markBalancePaid = async () => {
    if (!window.confirm("Mark balance as paid in cash at pickup?")) return;
    try {
      await api.post(`/admin/bookings/${id}/mark-balance-paid`);
      toast.success("Balance marked paid");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F6FA]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0A192F] border-t-transparent" />
          <p className="text-sm text-slate-500">Loading booking details…</p>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const days = (() => {
    const pickup = new Date(`${booking.pickup_date}T${booking.pickup_time || "10:00"}`);
    const dropoff = new Date(`${booking.dropoff_date}T${booking.dropoff_time || "10:00"}`);
    return Math.max(1, Math.ceil((dropoff - pickup) / (1000 * 60 * 60 * 24)));
  })();

  const bookingRef = `#B-${booking.id?.slice(0, 4).toUpperCase() || "----"}`;
  const customerInitials = booking.customer_name
    ? booking.customer_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  const rentalCharge = booking.base_amount || booking.total_amount || 0;
  const taxAmount = booking.tax_amount || 0;
  const totalAmount = booking.total_amount || 0;
  const balanceAmount = booking.balance_amount || 0;

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  /* ─── Shared sidebar content (Actions + Payment) ─── */
  const SidebarContent = () => (
    <>
      {/* Actions Card */}
      <Card className="rounded-xl border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-heading text-base font-semibold text-[#0A192F]">
          Actions
        </h2>

        {/* Booking Status */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold text-slate-500">Booking Status</p>
          <Select value={booking.status} onValueChange={setStatus}>
            <SelectTrigger className="w-full rounded-md" data-testid="detail-booking-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Start Ride */}
        {booking.status === "confirmed" && (
          <Button
            className="mb-3 w-full rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => setStartDialog({ open: true })}
            data-testid="detail-start-ride"
          >
            <Play className="mr-2 h-4 w-4" />
            Start Ride
          </Button>
        )}

        {/* End Ride */}
        {booking.status === "active" && (
          <Button
            className="mb-3 w-full rounded-md bg-red-600 text-white hover:bg-red-700"
            onClick={() => setEndDialog({ open: true })}
            data-testid="detail-end-ride"
          >
            <Square className="mr-2 h-4 w-4" />
            End Ride
          </Button>
        )}

        {/* Mark balance paid (cash at pickup) */}
        {balanceAmount > 0 && (
          <Button
            variant="outline"
            className="w-full rounded-md border-slate-300"
            onClick={markBalancePaid}
            data-testid="detail-mark-paid"
          >
            <Check className="mr-2 h-4 w-4" />
            Mark Balance Paid
          </Button>
        )}
      </Card>

      {/* Payment Summary */}
      <Card className="rounded-xl border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-heading text-base font-semibold text-[#0A192F]">
          Payment Summary
        </h2>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">
              Rental Charge ({days} {days === 1 ? "Day" : "Days"})
            </span>
            <span className="font-medium text-[#0A192F]">{formatINR(rentalCharge)}</span>
          </div>
          {taxAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Taxes &amp; Fees</span>
              <span className="font-medium text-[#0A192F]">{formatINR(taxAmount)}</span>
            </div>
          )}

          <div className="border-t border-slate-100 pt-3">
            <div className="flex justify-between">
              <span className="font-semibold text-[#0A192F]">Total</span>
              <span className="font-heading text-lg font-bold text-[#0A192F]">
                {formatINR(totalAmount)}
              </span>
            </div>
          </div>

          {balanceAmount > 0 ? (
            <div className="mt-2 flex items-center justify-between rounded-lg bg-red-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                <AlertCircle className="h-4 w-4" />
                Balance Due
              </div>
              <span className="font-heading text-base font-bold text-red-600">
                {formatINR(balanceAmount)}
              </span>
            </div>
          ) : (
            booking.paid_amount > 0 && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle className="h-4 w-4" />
                Fully Paid
              </div>
            )
          )}
        </div>
      </Card>
    </>
  );

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      {/* ── Top Header ── */}
      <div className="border-b border-slate-200 bg-white px-4 py-3 md:px-8 md:py-4">
        <div className="mx-auto max-w-6xl">
          {/* Mobile header: back arrow + booking ref + invoice icon */}
          <div className="flex items-center justify-between md:hidden">
            <button
              onClick={() => navigate("/admin/bookings")}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#0A192F] transition-colors"
              data-testid="back-to-bookings"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>Back</span>
            </button>

            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium leading-none">
                Operations
              </p>
              <h1 className="font-heading text-lg font-bold text-[#0A192F] leading-tight">
                Booking {bookingRef}
              </h1>
            </div>

            <button
              onClick={() => toast.info("Invoice download coming soon")}
              className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Invoice
            </button>
          </div>

          {/* Desktop header */}
          <div className="hidden md:flex md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/admin/bookings")}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#0A192F] transition-colors"
                data-testid="back-to-bookings-desktop"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Bookings
              </button>
              <div className="h-5 w-px bg-slate-200" />
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">
                  Operations
                </p>
                <h1 className="font-heading text-2xl font-bold text-[#0A192F]">
                  Booking {bookingRef}
                </h1>
              </div>
            </div>
            <Button
              variant="outline"
              className="flex items-center gap-2 rounded-md border-slate-300 text-slate-600 hover:bg-slate-50"
              onClick={() => toast.info("Invoice download coming soon")}
            >
              <Download className="h-4 w-4" />
              Invoice
            </Button>
          </div>
        </div>
      </div>

      {/* ── Page Body ── */}
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* ── LEFT COLUMN ── */}
          <motion.div
            className="space-y-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* ── Customer Information ── */}
            <Card className="rounded-xl border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-heading text-base font-semibold text-[#0A192F]">
                  Customer Information
                </h2>
                <button className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  Edit
                </button>
              </div>

              {/* Avatar + Name */}
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
                  {customerInitials}
                </div>
                <div>
                  <p className="font-semibold text-[#0A192F]">
                    {booking.customer_name || "—"}
                  </p>
                </div>
              </div>

              {/* Contact Info — stacked on mobile, side-by-side on sm+ */}
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:gap-6">
                <div className="min-w-0">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Email
                  </p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{booking.customer_email || "—"}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Phone
                  </p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>{booking.customer_phone || "—"}</span>
                  </div>
                </div>
              </div>

              {/* KYC Status */}
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  KYC Status
                </p>
                <StatusBadge status={booking.status === "pending_kyc" ? "pending_kyc" : "verified"} />
              </div>
            </Card>

            {/* ── Trip Details ── */}
            <Card className="rounded-xl border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-5 font-heading text-base font-semibold text-[#0A192F]">
                Trip Details
              </h2>

              {/* Stacked on mobile, side-by-side on md+ */}
              <div className="flex flex-col gap-6 md:flex-row md:gap-8">
                {/* Vehicle */}
                <div className="flex-1">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Vehicle
                  </p>
                  <div className="flex items-start gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                      <Car className="h-7 w-7 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0A192F] break-words">
                        {booking.vehicle_name || "—"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {[
                          booking.vehicle_transmission,
                          booking.vehicle_fuel_type,
                          booking.vehicle_seats ? `${booking.vehicle_seats} Seats` : null,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                      {booking.vehicle_registration && (
                        <span className="mt-2 inline-block rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono text-slate-600">
                          Reg: {booking.vehicle_registration}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Divider — horizontal on mobile, vertical on md+ */}
                <div className="border-t border-slate-100 md:hidden" />

                {/* Schedule */}
                <div className="flex-1">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Schedule
                  </p>
                  <div className="space-y-3">
                    {/* Pick-up */}
                    <div className="flex items-start gap-3">
                      <div className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-emerald-500 bg-white ring-2 ring-emerald-100" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Pick-up
                        </p>
                        <p className="text-sm font-semibold text-[#0A192F]">
                          {formatDate(booking.pickup_date)}
                        </p>
                        <p className="text-xs text-slate-500">{booking.pickup_time || "—"}</p>
                      </div>
                    </div>

                    {/* Dashed connector */}
                    <div className="ml-1.5 border-l-2 border-dashed border-slate-200 pb-0 pl-4">
                      {/* Drop-off */}
                      <div className="flex items-start gap-3">
                        <div className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-red-400 bg-white ring-2 ring-red-50" />
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Drop-off
                          </p>
                          <p className="text-sm font-semibold text-[#0A192F]">
                            {formatDate(booking.dropoff_date)}
                          </p>
                          <p className="text-xs text-slate-500">{booking.dropoff_time || "—"}</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500">
                      Duration:{" "}
                      <span className="font-semibold text-[#0A192F]">
                        {days} {days === 1 ? "Day" : "Days"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* ── Odometer Before / After ── */}
            {(booking.odometer_photo_start || booking.odometer_photo_end) && (
              <Card className="rounded-xl border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-5 font-heading text-base font-semibold text-[#0A192F] flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-slate-500" />
                  Odometer — Before &amp; After
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  {/* Start odometer */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
                        Pickup
                      </span>
                    </div>
                    {booking.odometer_photo_start ? (
                      <a
                        href={booking.odometer_photo_start}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 transition-all hover:shadow-md hover:ring-2 hover:ring-emerald-300"
                        style={{ aspectRatio: "16/9" }}
                      >
                        <img
                          src={booking.odometer_photo_start}
                          alt="Odometer at pickup"
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                        <span className="absolute bottom-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100">
                          Click to enlarge
                        </span>
                      </a>
                    ) : (
                      <div className="flex w-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50" style={{ aspectRatio: "16/9" }}>
                        <p className="text-xs text-slate-400">No photo</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Reading</span>
                      <span className="font-semibold text-[#0A192F]">
                        {booking.odometer_start != null ? `${booking.odometer_start} km` : "—"}
                      </span>
                    </div>
                    {booking.fuel_level_start && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Fuel</span>
                        <span className="font-medium text-emerald-700">{booking.fuel_level_start}</span>
                      </div>
                    )}
                  </div>

                  {/* End odometer */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-red-700">
                        Return
                      </span>
                    </div>
                    {booking.odometer_photo_end ? (
                      <a
                        href={booking.odometer_photo_end}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 transition-all hover:shadow-md hover:ring-2 hover:ring-red-300"
                        style={{ aspectRatio: "16/9" }}
                      >
                        <img
                          src={booking.odometer_photo_end}
                          alt="Odometer at return"
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                        <span className="absolute bottom-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100">
                          Click to enlarge
                        </span>
                      </a>
                    ) : (
                      <div className="flex w-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50" style={{ aspectRatio: "16/9" }}>
                        <p className="text-xs text-slate-400">
                          {booking.status === "active" ? "Pending return" : "No photo"}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Reading</span>
                      <span className="font-semibold text-[#0A192F]">
                        {booking.odometer_end != null ? `${booking.odometer_end} km` : "—"}
                      </span>
                    </div>
                    {booking.fuel_level_end && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Fuel</span>
                        <span className="font-medium text-red-600">{booking.fuel_level_end}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Distance summary */}
                {booking.km_driven != null && (
                  <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
                    <span className="text-slate-500">Total distance driven</span>
                    <span className="font-heading text-base font-bold text-[#0A192F]">{booking.km_driven} km</span>
                  </div>
                )}
              </Card>
            )}

            {/* ── Ride Condition Photos ── */}
            {(booking.pickup_photos?.length > 0 || booking.return_photos?.length > 0) && (
              <Card className="rounded-xl border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-5 font-heading text-base font-semibold text-[#0A192F] flex items-center gap-2">
                  <Camera className="h-4 w-4 text-slate-500" />
                  Ride Condition Photos
                </h2>

                <div className="space-y-5">
                  {/* Pickup Photos */}
                  {booking.pickup_photos?.length > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        Pickup Condition ({booking.pickup_photos.length} photos)
                      </p>
                      {booking.pickup_notes && (
                        <p className="mb-2 text-xs text-slate-500 italic">{booking.pickup_notes}</p>
                      )}
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {booking.pickup_photos.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 transition-all hover:shadow-md hover:ring-2 hover:ring-emerald-300"
                          >
                            <img
                              src={url}
                              alt={`Pickup condition ${idx + 1}`}
                              className="h-full w-full object-cover transition-transform group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                            <span className="absolute bottom-1 left-1 rounded bg-emerald-600/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                              Pickup
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Divider between pickup and return */}
                  {booking.pickup_photos?.length > 0 && booking.return_photos?.length > 0 && (
                    <div className="border-t border-slate-100" />
                  )}

                  {/* Return Photos */}
                  {booking.return_photos?.length > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        Return Condition ({booking.return_photos.length} photos)
                      </p>
                      {booking.return_notes && (
                        <p className="mb-2 text-xs text-slate-500 italic">{booking.return_notes}</p>
                      )}
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {booking.return_photos.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 transition-all hover:shadow-md hover:ring-2 hover:ring-red-300"
                          >
                            <img
                              src={url}
                              alt={`Return condition ${idx + 1}`}
                              className="h-full w-full object-cover transition-transform group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                            <span className="absolute bottom-1 left-1 rounded bg-red-600/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                              Return
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* ── Sidebar cards rendered inline on mobile (below Trip Details) ── */}
            <div className="space-y-5 lg:hidden">
              <SidebarContent />
            </div>
          </motion.div>

          {/* ── RIGHT COLUMN — desktop sidebar only ── */}
          <motion.div
            className="hidden space-y-5 lg:block"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <SidebarContent />
          </motion.div>
        </div>
      </div>

      {/* Dialogs */}
      {startDialog.open && (
        <StartRideDialog
          booking={booking}
          open={startDialog.open}
          onOpenChange={(open) => setStartDialog({ open })}
          onSuccess={load}
        />
      )}
      {endDialog.open && (
        <EndRideDialog
          booking={booking}
          open={endDialog.open}
          onOpenChange={(open) => setEndDialog({ open })}
          onSuccess={load}
        />
      )}
    </div>
  );
}
