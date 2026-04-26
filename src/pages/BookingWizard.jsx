import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Check, ChevronRight, ShieldCheck } from "lucide-react";
import Navbar from "../components/Navbar";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { api, formatINR, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import { toast } from "sonner";

const STEPS = ["Location", "Date & time", "Vehicle", "Summary", "KYC", "Payment"];

export default function BookingWizard() {
  const { user, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const [step, setStep] = useState(0);
  const [locations, setLocations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vehicle, setVehicle] = useState(null);

  const [pickup, setPickup] = useState(sp.get("pickup") || "");
  const [dropoff, setDropoff] = useState(sp.get("dropoff") || "");
  const [pickupDate, setPickupDate] = useState(sp.get("pickupDate") || "");
  const [pickupTime, setPickupTime] = useState("10:00");
  const [dropoffDate, setDropoffDate] = useState(sp.get("dropoffDate") || "");
  const [dropoffTime, setDropoffTime] = useState("10:00");
  const [selectedVehicleId, setSelectedVehicleId] = useState(sp.get("vehicleId") || "");
  const [booking, setBooking] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get("/locations").then((r) => {
      setLocations(r.data);
      if (!pickup && r.data[0]) setPickup(r.data[0].id);
      if (!dropoff && r.data[0]) setDropoff(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (step === 2 || selectedVehicleId) {
      api.get("/vehicles", { params: pickup ? { location_id: pickup } : {} }).then((r) => {
        setVehicles(r.data);
        if (selectedVehicleId) {
          const found = r.data.find((v) => v.id === selectedVehicleId);
          if (found) setVehicle(found);
        }
      });
    }
  }, [step, pickup]);

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
      if (new Date(`${dropoffDate}T${dropoffTime}`) <= new Date(`${pickupDate}T${pickupTime}`)) {
        return toast.error("Drop-off must be after pickup");
      }
      setStep(2);
    } else if (step === 2) {
      if (!vehicle) return toast.error("Select a vehicle");
      setStep(3);
    } else if (step === 3) {
      if (!user) {
        navigate("/login", { state: { from: "/book" } });
        return;
      }
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
        setStep(4);
      } catch (e) {
        toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
      } finally {
        setCreating(false);
      }
    } else if (step === 4) {
      setStep(5);
    }
  };

  const pay = async (type) => {
    if (!booking) return;
    try {
      const init = await api.post("/payments/init", { booking_id: booking.id, payment_type: type });
      const mockId = `pay_mock_${Date.now()}`;
      const verify = await api.post("/payments/verify", { booking_id: booking.id, payment_id: mockId });
      setBooking(verify.data);
      toast.success("Payment successful");
      setTimeout(() => navigate("/dashboard"), 800);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    }
  };

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
          <div className="fade-up">
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
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-slate-500">Pickup date</label>
                    <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className="mt-1 h-11 rounded-md" data-testid="book-pickup-date" />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest text-slate-500">Pickup time</label>
                    <Input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="mt-1 h-11 rounded-md" data-testid="book-pickup-time" />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest text-slate-500">Drop-off date</label>
                    <Input type="date" value={dropoffDate} onChange={(e) => setDropoffDate(e.target.value)} className="mt-1 h-11 rounded-md" data-testid="book-dropoff-date" />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest text-slate-500">Drop-off time</label>
                    <Input type="time" value={dropoffTime} onChange={(e) => setDropoffTime(e.target.value)} className="mt-1 h-11 rounded-md" data-testid="book-dropoff-time" />
                  </div>
                </div>
              </Card>
            )}

            {step === 2 && (
              <div>
                <h2 className="font-heading text-2xl text-[#0A192F]">Choose a vehicle</h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {vehicles.map((v) => (
                    <Card
                      key={v.id}
                      onClick={() => { setVehicle(v); setSelectedVehicleId(v.id); }}
                      className={`cursor-pointer overflow-hidden rounded-lg border bg-white card-hover ${vehicle?.id === v.id ? "ring-2 ring-[#D4AF37] border-[#D4AF37]" : "border-slate-200"}`}
                      data-testid={`book-vehicle-${v.id}`}
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                        <img src={v.image_urls?.[0]} alt={v.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs uppercase tracking-widest text-slate-500">{v.type}</div>
                            <div className="font-heading text-lg text-[#0A192F]">{v.name}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-heading text-xl text-[#0A192F]">{formatINR(v.price_per_24hrs)}</div>
                            <div className="text-[10px] uppercase tracking-widest text-slate-500">/24hrs</div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {vehicles.length === 0 && (
                    <div className="col-span-2 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">No vehicles available.</div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && vehicle && pricing && (
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
                  <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-heading text-lg text-[#0A192F]"><span>Total</span><span data-testid="summary-total">{formatINR(pricing.total)}</span></div>
                </div>
                {!user && (
                  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    You'll need to <Link to="/login" className="underline">sign in</Link> to confirm this booking.
                  </div>
                )}
              </Card>
            )}

            {step === 4 && booking && (
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

            {step === 5 && booking && (
              <Card className="rounded-lg border-slate-200 p-6">
                <h2 className="font-heading text-2xl text-[#0A192F]">Payment</h2>
                {user?.kyc_status !== "approved" ? (
                  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Please wait until your KYC is approved to pay. You can return here from <Link to="/dashboard" className="underline">My Bookings</Link>.
                  </div>
                ) : (
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
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
                  </div>
                )}
              </Card>
            )}

            {/* Footer nav */}
            <div className="mt-6 flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || creating} className="rounded-md" data-testid="wizard-back-btn">
                Back
              </Button>
              {step < 5 && (
                <Button onClick={goNext} disabled={creating} className="rounded-md bg-[#0A192F] text-white hover:bg-[#0A192F]/90" data-testid="wizard-next-btn">
                  {creating ? "Creating..." : step === 3 ? "Confirm booking" : "Continue"}
                </Button>
              )}
            </div>
          </div>

          {/* Summary sidebar */}
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <Card className="rounded-lg border-slate-200 p-5">
              <div className="mb-4 text-xs uppercase tracking-widest text-slate-500">Your booking</div>
              {vehicle ? (
                <div className="overflow-hidden rounded-md border border-slate-200">
                  <img src={vehicle.image_urls?.[0]} alt={vehicle.name} className="aspect-[4/3] w-full object-cover" />
                  <div className="p-3">
                    <div className="font-heading text-lg text-[#0A192F]">{vehicle.name}</div>
                    <div className="text-xs text-slate-500">{vehicle.type} · {vehicle.fuel_type}</div>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-500">Pick a vehicle to preview</div>
              )}
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
