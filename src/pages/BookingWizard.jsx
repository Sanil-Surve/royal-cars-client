import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Check, ChevronRight, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { api, formatINR, formatApiErrorDetail } from "../lib/api";
import { payForBooking } from "../lib/razorpay";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import { toast } from "sonner";

const STEPS = ["Location", "Date & time", "Summary", "KYC", "Payment"];
const MIN_TIME = "05:00";
const MAX_TIME = "23:00";

// Generate 30-minute slots from 5:00 AM to 11:00 PM (inclusive)
function buildTimeSlots() {
  const slots = [];
  for (let h = 5; h <= 23; h++) {
    for (const m of [0, 30]) {
      if (h === 23 && m > 0) break;
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const period = h >= 12 ? "PM" : "AM";
      const hr12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${hr12}:${String(m).padStart(2, "0")} ${period}`;
      slots.push({ value, label });
    }
  }
  return slots;
}
const TIME_SLOTS = buildTimeSlots();

function isWithinBusinessHours(t) {
  if (!t) return false;
  const [h, m] = t.split(":").map(Number);
  const mins = h * 60 + (m || 0);
  return mins >= 5 * 60 && mins <= 23 * 60;
}

export default function BookingWizard() {
  const { user, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const vehicleId = sp.get("vehicleId") || "";
  const [step, setStep] = useState(0);
  const [locations, setLocations] = useState([]);
  const [vehicle, setVehicle] = useState(null);

  const [pickup, setPickup] = useState(sp.get("pickup") || "");
  const [dropoff, setDropoff] = useState(sp.get("dropoff") || "");
  const [pickupDate, setPickupDate] = useState(sp.get("pickupDate") || "");
  const [bookingTime, setBookingTime] = useState(sp.get("pickupTime") || "10:00");
  const [dropoffDate, setDropoffDate] = useState(sp.get("dropoffDate") || "");
  const [booking, setBooking] = useState(null);
  const [creating, setCreating] = useState(false);

  // Pickup time and drop-off time are the same (24-hour block rentals)
  const pickupTime = bookingTime;
  const dropoffTime = bookingTime;

  // Vehicle is mandatory — must come from the /vehicles "Book now" button
  useEffect(() => {
    if (!vehicleId) {
      toast.error("Please select a vehicle first");
      navigate("/vehicles", { replace: true });
      return;
    }
    api.get(`/vehicles/${vehicleId}`).then((r) => setVehicle(r.data)).catch(() => {
      toast.error("Vehicle not found");
      navigate("/vehicles", { replace: true });
    });
  }, [vehicleId, navigate]);

  // Auto-jump to Summary when wizard opens with full context
  useEffect(() => {
    if (vehicleId && sp.get("pickup") && sp.get("dropoff") && sp.get("pickupDate") && sp.get("dropoffDate")) {
      setStep(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.get("/locations").then((r) => {
      setLocations(r.data);
      if (!pickup && r.data[0]) setPickup(r.data[0].id);
      if (!dropoff && r.data[0]) setDropoff(r.data[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pricing = useMemo(() => {
    if (!vehicle || !pickupDate || !dropoffDate) return null;
    const p = new Date(`${pickupDate}T${pickupTime}`);
    const d = new Date(`${dropoffDate}T${dropoffTime}`);
    const hrs = Math.max((d - p) / 36e5, 24);
    const days = Math.max(1, Math.ceil(hrs / 24));
    const rent = vehicle.price_per_24hrs * days;
    const deposit = vehicle.deposit_amount;
    return { days, rent, deposit, total: rent + deposit };
  }, [vehicle, pickupDate, pickupTime, dropoffDate, dropoffTime]);

  const goNext = async () => {
    if (step === 0) {
      if (!pickup || !dropoff) return toast.error("Select both locations");
      setStep(1);
    } else if (step === 1) {
      if (!pickupDate || !dropoffDate) return toast.error("Select both dates");
      if (!isWithinBusinessHours(bookingTime)) {
        return toast.error("Pickup time must be between 5:00 AM and 11:00 PM");
      }
      // Drop-off must be on a date AFTER pickup date (24-hour blocks)
      if (new Date(dropoffDate) <= new Date(pickupDate)) {
        return toast.error("Drop-off date must be after pickup date (minimum 24-hour rental)");
      }
      setStep(2);
    } else if (step === 2) {
      if (!user) {
        navigate("/login", { state: { from: `/book?${sp.toString()}` } });
        return;
      }
      if (!vehicle) return;
      setCreating(true);
      try {
        const { data } = await api.post("/bookings", {
          vehicle_id: vehicle.id,
          pickup_location_id: pickup,
          dropoff_location_id: dropoff,
          pickup_date: pickupDate,
          pickup_time: pickupTime,
          dropoff_date: dropoffDate,
          dropoff_time: dropoffTime,
        });
        setBooking(data);
        await refreshMe();
        setStep(3);
      } catch (e) {
        toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
      } finally {
        setCreating(false);
      }
    } else if (step === 3) {
      setStep(4);
    }
  };

  const pay = async (type) => {
    if (!booking) return;
    const result = await payForBooking(booking, type, (updated) => setBooking(updated));
    if (result) setTimeout(() => navigate("/dashboard"), 900);
  };

  const payAtSite = async () => {
    if (!booking) return;
    try {
      await api.post("/payments/pay-at-site", { booking_id: booking.id });
      toast.success("Booking confirmed! Please pay at site.");
      setTimeout(() => navigate("/dashboard"), 900);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to confirm booking");
    }
  };

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <Navbar />
        <div className="py-20 text-center text-slate-500" data-testid="wizard-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar />
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Step tracker */}
        <div className="mb-10 flex items-center gap-2" data-testid="booking-stepper">
          {STEPS.map((label, i) => (
            <div key={i} className="flex flex-1 items-center gap-2">
              <div className={`step-dot ${i < step ? "done" : i === step ? "active" : ""}`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <div className="hidden text-xs font-medium sm:block">{label}</div>
              {i < STEPS.length - 1 && <div className={`step-line ${i < step ? "done" : ""}`} />}
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Main */}
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
              >
                {step === 0 && (
                  <Card className="rounded-lg border-slate-200 p-6">
                    <h2 className="font-heading text-2xl text-[#0A192F]">Choose pickup & drop-off</h2>
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-xs uppercase tracking-widest text-slate-500">Pickup location</label>
                        <Select value={pickup} onValueChange={setPickup}>
                          <SelectTrigger className="mt-1 h-11 rounded-md" data-testid="book-pickup"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-widest text-slate-500">Drop-off location</label>
                        <Select value={dropoff} onValueChange={setDropoff}>
                          <SelectTrigger className="mt-1 h-11 rounded-md" data-testid="book-dropoff"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                )}

                {step === 1 && (
                  <Card className="rounded-lg border-slate-200 p-6">
                    <h2 className="font-heading text-2xl text-[#0A192F]">Pick your dates</h2>
                    <p className="mt-1 text-sm text-slate-500">All rentals are in <b>24-hour blocks</b>. You'll return the car at the same time on your drop-off date. Slots run between <b>5:00 AM and 11:00 PM</b>.</p>
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-xs uppercase tracking-widest text-slate-500">Pickup date</label>
                        <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className="mt-1 h-11 rounded-md" data-testid="book-pickup-date" />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-widest text-slate-500">Drop-off date</label>
                        <Input type="date" value={dropoffDate} onChange={(e) => setDropoffDate(e.target.value)} className="mt-1 h-11 rounded-md" data-testid="book-dropoff-date" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs uppercase tracking-widest text-slate-500">Pickup &amp; drop-off time</label>
                        <Select value={bookingTime} onValueChange={setBookingTime}>
                          <SelectTrigger className="mt-1 h-11 rounded-md" data-testid="book-time"><SelectValue placeholder="Select time" /></SelectTrigger>
                          <SelectContent className="max-h-64">
                            {TIME_SLOTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <p className="mt-2 text-xs text-slate-500">Same time for both pickup and return.</p>
                      </div>
                    </div>
                    {vehicle.overtime_rate_per_hour ? (
                      <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                        <b>Overtime fee:</b> {formatINR(vehicle.overtime_rate_per_hour)}/hour if you return the car after the scheduled drop-off time.
                      </div>
                    ) : null}
                  </Card>
                )}

                {step === 2 && pricing && (
                  <Card className="rounded-lg border-slate-200 p-6">
                    <h2 className="font-heading text-2xl text-[#0A192F]">Review & confirm</h2>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <InfoRow label="Vehicle" value={vehicle.name} />
                      <InfoRow label="Duration" value={`${pricing.days} day${pricing.days > 1 ? "s" : ""}`} />
                      <InfoRow label="Pickup" value={`${locations.find(l => l.id === pickup)?.name || "-"} · ${pickupDate} ${pickupTime}`} />
                      <InfoRow label="Drop-off" value={`${locations.find(l => l.id === dropoff)?.name || "-"} · ${dropoffDate} ${dropoffTime}`} />
                    </div>
                    <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
                      <div className="flex justify-between py-1"><span className="text-slate-600">Rent ({pricing.days} × {formatINR(vehicle.price_per_24hrs)})</span><span>{formatINR(pricing.rent)}</span></div>
                      <div className="flex justify-between py-1"><span className="text-slate-600">Refundable deposit</span><span>{formatINR(pricing.deposit)}</span></div>
                      {vehicle.overtime_rate_per_hour ? (
                        <div className="flex justify-between py-1 text-xs text-slate-500"><span>Overtime (beyond drop-off)</span><span>{formatINR(vehicle.overtime_rate_per_hour)}/hr</span></div>
                      ) : null}
                      <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-heading text-lg text-[#0A192F]"><span>Total</span><span data-testid="summary-total">{formatINR(pricing.total)}</span></div>
                    </div>
                    {!user && (
                      <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        You'll need to <Link to="/login" className="underline">sign in</Link> to confirm this booking.
                      </div>
                    )}
                  </Card>
                )}

                {step === 3 && booking && (
                  <Card className="rounded-lg border-slate-200 p-6">
                    <div className="flex items-center justify-between">
                      <h2 className="font-heading text-2xl text-[#0A192F]">KYC verification</h2>
                      <StatusBadge status={user?.kyc_status || "not_submitted"} />
                    </div>
                    {user?.kyc_status === "approved" ? (
                      <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                        <ShieldCheck className="mb-1 h-5 w-5" />
                        Your KYC is already approved. You can proceed to payment.
                      </div>
                    ) : (
                      <>
                        <p className="mt-2 text-sm text-slate-600">Upload the 6 required documents. Our fleet team reviews them within a few hours.</p>
                        <Button onClick={() => navigate("/kyc?from=book")} className="mt-6 rounded-md bg-[#0A192F] text-white" data-testid="wizard-goto-kyc">
                          Go to KYC upload <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </Card>
                )}

                {step === 4 && booking && (
                  <Card className="rounded-lg border-slate-200 p-6">
                    <h2 className="font-heading text-2xl text-[#0A192F]">Payment</h2>
                    {user?.kyc_status !== "approved" ? (
                      <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        Please wait until your KYC is approved to pay. You can return here from <Link to="/dashboard" className="underline">My Bookings</Link>.
                      </div>
                    ) : (
                      <div className="mt-6 grid gap-4 md:grid-cols-3">
                        <PayOption
                          title="Pay in full"
                          amount={booking.total_amount}
                          caption="Single payment, nothing to carry."
                          onClick={() => pay("full")}
                          testid="pay-full"
                        />
                        <PayOption
                          title="Pay 20% now"
                          amount={Math.round(booking.total_amount * 0.2)}
                          caption={`Pay remaining ${formatINR(booking.total_amount - Math.round(booking.total_amount * 0.2))} at pickup.`}
                          onClick={() => pay("partial")}
                          testid="pay-partial"
                          accent
                        />
                        <PayOption
                          title="Pay At Site"
                          amount={booking.total_amount}
                          caption="Pay total amount when you pick up the vehicle."
                          onClick={() => payAtSite()}
                          testid="pay-site"
                        />
                      </div>
                    )}
                  </Card>
                )}

                {/* Footer nav */}
                <div className="mt-6 flex items-center justify-between">
                  <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || creating} className="rounded-md" data-testid="wizard-back-btn">
                    Back
                  </Button>
                  {step < 4 && (
                    <Button onClick={goNext} disabled={creating} className="rounded-md bg-[#0A192F] text-white hover:bg-[#0A192F]/90" data-testid="wizard-next-btn">
                      {creating ? "Creating..." : step === 2 ? "Confirm booking" : "Continue"}
                    </Button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Summary sidebar */}
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <Card className="rounded-lg border-slate-200 p-5">
              <div className="mb-4 text-xs uppercase tracking-widest text-slate-500">Your booking</div>
              <div className="overflow-hidden rounded-md border border-slate-200">
                <img src={vehicle.image_urls?.[0]} alt={vehicle.name} className="aspect-[4/3] w-full object-cover" />
                <div className="p-3">
                  <div className="font-heading text-lg text-[#0A192F]">{vehicle.name}</div>
                  <div className="text-xs text-slate-500">{vehicle.type} · {vehicle.fuel_type}</div>
                </div>
              </div>
              {pricing && (
                <div className="mt-5 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-600">Rent ({pricing.days}d)</span><span>{formatINR(pricing.rent)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Deposit</span><span>{formatINR(pricing.deposit)}</span></div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-heading text-base text-[#0A192F]"><span>Total</span><span>{formatINR(pricing.total)}</span></div>
                </div>
              )}
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-[#0A192F]">{value}</div>
    </div>
  );
}

function PayOption({ title, amount, caption, onClick, accent, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`rounded-lg border p-5 text-left transition hover:-translate-y-0.5 ${accent ? "border-[#D4AF37] bg-[#FFFBEA]" : "border-slate-200 bg-white"}`}
    >
      <div className="text-xs uppercase tracking-widest text-slate-500">{title}</div>
      <div className="mt-2 font-heading text-2xl text-[#0A192F]">{formatINR(amount)}</div>
      <div className="mt-2 text-sm text-slate-600">{caption}</div>
    </button>
  );
}
