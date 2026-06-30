import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, User, Car, MapPin, CalendarDays, Tag, X,
  Loader2, CheckCircle2, Clock, CreditCard, StickyNote, Plus
} from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { api, formatINR, formatApiErrorDetail } from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import { toast } from "sonner";

// ── Time slots: 30-min slots from 5 AM to 11 PM ─────────────────────────────
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

// ── today string helper ───────────────────────────────────────────────────────
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const TODAY = todayStr();

// ── Pricing summary row ───────────────────────────────────────────────────────
function SummaryRow({ label, value, isDiscount, isTotal, isTax }) {
  return (
    <div
      className={`flex justify-between py-1.5 text-sm ${
        isTotal
          ? "border-t border-slate-200 pt-2.5 mt-1 font-heading text-base font-bold text-[#0A192F]"
          : "text-slate-600"
      }`}
    >
      <span>{label}</span>
      <span className={isDiscount ? "text-emerald-600 font-semibold" : isTax ? "text-slate-700" : ""}>
        {isDiscount && value > 0 ? `−${formatINR(value)}` : formatINR(value)}
      </span>
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ icon: Icon, title, children }) {
  return (
    <Card className="rounded-lg border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-5">
        <Icon className="h-4 w-4 text-[#D4AF37]" />
        <h2 className="font-heading text-lg font-semibold text-[#0A192F]">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

// ── Payment option button ──────────────────────────────────────────────────────
function PaymentOption({ label, sublabel, selected, onClick, testid }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      className={`flex-1 rounded-lg border p-4 text-left transition-all hover:-translate-y-0.5 ${
        selected
          ? "border-[#0A192F] bg-[#0A192F] text-white shadow-md"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-wider">{label}</div>
      {sublabel && (
        <div className={`mt-1 text-xs ${selected ? "text-slate-300" : "text-slate-500"}`}>{sublabel}</div>
      )}
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AdminManualBooking() {
  const navigate = useNavigate();

  // ── Data from server ──
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // ── Customer search & selection ──
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // ── Vehicle selection ──
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // ── Booking details ──
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [dropoffDate, setDropoffDate] = useState("");
  const [bookingTime, setBookingTime] = useState("10:00");

  // ── Pricing ──
  const [pricing, setPricing] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  // ── Coupon ──
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  // ── Payment collection ──
  const [paymentCollection, setPaymentCollection] = useState("none");

  // ── Admin notes ──
  const [adminNotes, setAdminNotes] = useState("");

  // ── Submission ──
  const [submitting, setSubmitting] = useState(false);

  // ── Load all initial data in parallel (async-parallel skill rule) ──────────
  useEffect(() => {
    let mounted = true;
    setDataLoading(true);
    Promise.all([
      api.get("/admin/customers"),
      api.get("/vehicles"),
      api.get("/locations"),
    ])
      .then(([custRes, vehRes, locRes]) => {
        if (!mounted) return;
        setCustomers(custRes.data);
        setVehicles(vehRes.data);
        const locs = locRes.data;
        setLocations(locs);
        if (locs[0]) {
          setPickup(locs[0].id);
          setDropoff(locs[0].id);
        }
      })
      .catch(() => toast.error("Failed to load data"))
      .finally(() => { if (mounted) setDataLoading(false); });
    return () => { mounted = false; };
  }, []);

  // ── Filtered customers (js-index-maps: derive during render, no effect) ───
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
    );
  }, [customers, customerSearch]);

  // ── Fetch pricing (useCallback with primitive deps per skill rules) ────────
  const fetchPricing = useCallback(
    async (withCoupon = null) => {
      if (!selectedVehicle || !pickupDate || !dropoffDate) return;
      const p = new Date(`${pickupDate}T${bookingTime}`);
      const d = new Date(`${dropoffDate}T${bookingTime}`);
      if (d <= p) return;

      setPricingLoading(true);
      try {
        const endpoint = withCoupon ? "/bookings/apply-coupon" : "/bookings/calculate";
        const body = {
          vehicle_id: selectedVehicle.id,
          pickup_date: pickupDate,
          pickup_time: bookingTime,
          dropoff_date: dropoffDate,
          dropoff_time: bookingTime,
          ...(withCoupon ? { coupon_code: withCoupon } : {}),
        };
        const { data } = await api.post(endpoint, body);
        setPricing(data);
        if (withCoupon) {
          setCouponApplied({ code: withCoupon, discount: data.coupon_discount });
          setCouponError("");
        } else if (couponApplied) {
          setCouponApplied(null);
        }
      } catch (e) {
        if (withCoupon) {
          const msg = formatApiErrorDetail(e.response?.data?.detail) || "Invalid coupon";
          setCouponError(msg);
          toast.error(msg);
          await fetchPricing(null);
        }
      } finally {
        setPricingLoading(false);
      }
    },
    // primitive string/boolean deps per rerender-dependencies rule
    [selectedVehicle?.id, pickupDate, dropoffDate, bookingTime] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Refetch pricing when dependencies change ──────────────────────────────
  useEffect(() => {
    if (selectedVehicle && pickupDate && dropoffDate) {
      fetchPricing(couponApplied?.code || null);
    } else {
      setPricing(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicle?.id, pickupDate, dropoffDate, bookingTime]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      await fetchPricing(couponCode.trim().toUpperCase());
      toast.success(`Coupon "${couponCode.toUpperCase()}" applied!`);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponCode("");
    setCouponApplied(null);
    setCouponError("");
    await fetchPricing(null);
    toast.info("Coupon removed");
  };

  // ── Payment computed amounts ──────────────────────────────────────────────
  const totalPayable = pricing?.total_payable ?? 0;
  const partialAmount = useMemo(() => Math.round(totalPayable * 0.2), [totalPayable]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedCustomer) return toast.error("Please select a customer");
    if (!selectedVehicle) return toast.error("Please select a vehicle");
    if (!pickup || !dropoff) return toast.error("Please select pickup and drop-off locations");
    if (!pickupDate || !dropoffDate) return toast.error("Please select pickup and drop-off dates");
    if (new Date(dropoffDate) <= new Date(pickupDate))
      return toast.error("Drop-off date must be after pickup date");

    setSubmitting(true);
    try {
      const { data } = await api.post("/admin/bookings/manual", {
        customer_id: selectedCustomer.id,
        vehicle_id: selectedVehicle.id,
        pickup_location_id: pickup,
        dropoff_location_id: dropoff,
        pickup_date: pickupDate,
        pickup_time: bookingTime,
        dropoff_date: dropoffDate,
        dropoff_time: bookingTime,
        coupon_code: couponApplied?.code || null,
        payment_collection: paymentCollection,
        admin_notes: adminNotes.trim() || null,
      });
      toast.success(`Booking created & confirmed for ${selectedCustomer.name}`);
      navigate(`/admin/bookings/${data.id}`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (dataLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-500">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      {/* ── Page Header ── */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => navigate("/admin/bookings")}
          className="mb-3 flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0A192F] transition-colors"
          data-testid="admin-manual-booking-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Bookings
        </button>
        <div className="text-xs uppercase tracking-widest text-slate-500">Fleet Console</div>
        <h1 className="font-heading text-3xl font-bold text-[#0A192F]" data-testid="admin-manual-booking-title">
          New Manual Booking
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a confirmed booking on behalf of a registered customer. Bypasses KYC & payment gateway.
        </p>
      </div>

      <div className="flex flex-col gap-6">

        {/* ── Section 1: Customer ── */}
        <Section icon={User} title="Customer">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search by name, email or phone…"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="pl-9 h-10 rounded-md"
              data-testid="admin-manual-booking-customer-search"
            />
          </div>
          <div
            className="max-h-56 overflow-y-auto rounded-md border border-slate-200 divide-y divide-slate-100"
            data-testid="admin-manual-booking-customer-list"
          >
            {filteredCustomers.length === 0 && (
              <div className="py-6 text-center text-sm text-slate-400">No customers found</div>
            )}
            {filteredCustomers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCustomer(c)}
                data-testid={`admin-manual-booking-customer-${c.id}`}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                  selectedCustomer?.id === c.id
                    ? "bg-[#0A192F] text-white"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div>
                  <div className="font-medium text-sm">{c.name}</div>
                  <div className={`text-xs mt-0.5 ${selectedCustomer?.id === c.id ? "text-slate-300" : "text-slate-500"}`}>
                    {c.email} {c.phone ? `· ${c.phone}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={c.kyc_status || "not_submitted"} />
                  {selectedCustomer?.id === c.id && (
                    <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" />
                  )}
                </div>
              </button>
            ))}
          </div>
          {selectedCustomer && (
            <div className="mt-3 rounded-md bg-slate-50 border border-slate-200 px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm font-medium text-[#0A192F]">
                Selected: <span className="font-semibold">{selectedCustomer.name}</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-red-500 transition"
                data-testid="admin-manual-booking-clear-customer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </Section>

        {/* ── Section 2: Vehicle ── */}
        <Section icon={Car} title="Vehicle">
          {vehicles.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">No vehicles available</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2" data-testid="admin-manual-booking-vehicle-list">
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setSelectedVehicle(v);
                    setPricing(null);
                    setCouponApplied(null);
                  }}
                  data-testid={`admin-manual-booking-vehicle-${v.id}`}
                  className={`rounded-lg border p-4 text-left transition-all hover:-translate-y-0.5 ${
                    selectedVehicle?.id === v.id
                      ? "border-[#0A192F] bg-[#0A192F]/5 ring-1 ring-[#0A192F]"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  {v.image_urls?.[0] && (
                    <img
                      src={v.image_urls[0]}
                      alt={v.name}
                      className="mb-3 aspect-video w-full rounded-md object-cover"
                    />
                  )}
                  <div className="font-heading font-semibold text-[#0A192F] text-sm">{v.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{v.type} · {v.fuel_type}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#0A192F]">{formatINR(v.price_per_24hrs)}/day</span>
                    <span className="text-xs text-slate-400">Deposit: {formatINR(v.deposit_amount)}</span>
                  </div>
                  {selectedVehicle?.id === v.id && (
                    <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#0A192F]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#D4AF37]" /> Selected
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </Section>

        {/* ── Section 3: Booking Details ── */}
        <Section icon={CalendarDays} title="Booking Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-500 mb-1.5 block">
                Pickup Location
              </label>
              <Select value={pickup} onValueChange={setPickup}>
                <SelectTrigger className="h-11 rounded-md" data-testid="admin-manual-booking-pickup-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-500 mb-1.5 block">
                Drop-off Location
              </label>
              <Select value={dropoff} onValueChange={setDropoff}>
                <SelectTrigger className="h-11 rounded-md" data-testid="admin-manual-booking-dropoff-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-500 mb-1.5 block">
                Pickup Date
              </label>
              <Input
                type="date"
                value={pickupDate}
                min={TODAY}
                onChange={(e) => {
                  const val = e.target.value;
                  setPickupDate(val);
                  if (dropoffDate && val && val >= dropoffDate) setDropoffDate("");
                }}
                className="h-11 rounded-md"
                data-testid="admin-manual-booking-pickup-date"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-500 mb-1.5 block">
                Drop-off Date
              </label>
              <Input
                type="date"
                value={dropoffDate}
                min={pickupDate || TODAY}
                onChange={(e) => setDropoffDate(e.target.value)}
                className="h-11 rounded-md"
                data-testid="admin-manual-booking-dropoff-date"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs uppercase tracking-widest text-slate-500 mb-1.5 block">
                <Clock className="inline h-3 w-3 mr-1" />
                Pickup &amp; Return Time
              </label>
              <Select value={bookingTime} onValueChange={setBookingTime}>
                <SelectTrigger className="h-11 rounded-md" data-testid="admin-manual-booking-time">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {TIME_SLOTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-xs text-slate-400">Same time applies to both pickup and return.</p>
            </div>
          </div>
        </Section>

        {/* ── Section 4: Pricing ── */}
        <Section icon={MapPin} title="Pricing Summary">
          <div className="relative min-h-[80px] rounded-xl border border-slate-200 bg-slate-50 p-4">
            {pricingLoading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 z-10">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            )}
            {pricing ? (
              <>
                <SummaryRow label={`Rental (${pricing.rental_days}d × ${formatINR(selectedVehicle?.price_per_24hrs)})`} value={pricing.rental_amount} />
                {pricing.long_term_discount > 0 && (
                  <SummaryRow label={`Long-term discount (${pricing.long_term_discount_pct}%)`} value={pricing.long_term_discount} isDiscount />
                )}
                {pricing.first_booking_discount > 0 && (
                  <SummaryRow label={`First booking discount (${pricing.first_booking_discount_pct}%)`} value={pricing.first_booking_discount} isDiscount />
                )}
                {pricing.coupon_discount > 0 && (
                  <SummaryRow label={`Coupon (${pricing.applied_coupon_code})`} value={pricing.coupon_discount} isDiscount />
                )}
                <SummaryRow label={`GST (${pricing.tax_rate_pct}%)`} value={pricing.tax_amount} isTax />
                <SummaryRow label="Rental total" value={pricing.final_amount} />
                <SummaryRow label="Refundable deposit" value={pricing.deposit_amount} />
                <SummaryRow label="Total payable" value={pricing.total_payable} isTotal />
              </>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">
                Select a vehicle and dates to see pricing
              </p>
            )}
          </div>

          {/* Coupon */}
          <div className="mt-4">
            <label className="text-xs uppercase tracking-widest text-slate-500 mb-1.5 block">
              Coupon Code (optional)
            </label>
            {couponApplied ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <Tag className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="flex-1 text-sm font-semibold text-emerald-700">
                  {couponApplied.code} — saved {formatINR(couponApplied.discount)}
                </span>
                <button type="button" onClick={handleRemoveCoupon} className="text-slate-400 hover:text-red-500 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                  placeholder="e.g. SAVE10"
                  className={`flex-1 font-mono uppercase ${couponError ? "border-red-300 focus:ring-red-200" : ""}`}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                  data-testid="admin-manual-booking-coupon-input"
                />
                <Button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim() || !pricing}
                  variant="outline"
                  className="rounded-md border-[#0A192F] text-[#0A192F] hover:bg-[#0A192F] hover:text-white transition"
                  data-testid="admin-manual-booking-apply-coupon"
                >
                  {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
            )}
            {couponError && <p className="mt-1.5 text-xs text-red-500">{couponError}</p>}
          </div>
        </Section>

        {/* ── Section 5: Payment Collection ── */}
        <Section icon={CreditCard} title="Payment Collection">
          <p className="text-sm text-slate-500 mb-4">
            How will you collect payment from the customer?
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <PaymentOption
              label="Not Collected Yet"
              sublabel="Balance due at pickup"
              selected={paymentCollection === "none"}
              onClick={() => setPaymentCollection("none")}
              testid="admin-manual-booking-payment-none"
            />
            <PaymentOption
              label="Cash Partial (20%)"
              sublabel={pricing ? `${formatINR(partialAmount)} collected` : "Select dates for amount"}
              selected={paymentCollection === "partial"}
              onClick={() => setPaymentCollection("partial")}
              testid="admin-manual-booking-payment-partial"
            />
            <PaymentOption
              label="Cash Full Payment"
              sublabel={pricing ? `${formatINR(totalPayable)} collected` : "Select dates for amount"}
              selected={paymentCollection === "full"}
              onClick={() => setPaymentCollection("full")}
              testid="admin-manual-booking-payment-full"
            />
          </div>
          {pricing && (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
              {paymentCollection === "none" && (
                <span>Customer will pay <strong>{formatINR(totalPayable)}</strong> at pickup.</span>
              )}
              {paymentCollection === "partial" && (
                <span>
                  Collected <strong>{formatINR(partialAmount)}</strong> now.
                  Balance of <strong>{formatINR(totalPayable - partialAmount)}</strong> due at pickup.
                </span>
              )}
              {paymentCollection === "full" && (
                <span>Full payment of <strong>{formatINR(totalPayable)}</strong> collected. No balance due.</span>
              )}
            </div>
          )}
        </Section>

        {/* ── Section 6: Admin Notes ── */}
        <Section icon={StickyNote} title="Admin Notes (optional)">
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="e.g. Customer called in, verified passport in person, special arrangement…"
            rows={3}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A192F]/20 focus:border-[#0A192F] transition resize-none"
            data-testid="admin-manual-booking-notes"
          />
        </Section>

        {/* ── Submit ── */}
        <div className="flex items-center justify-between py-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/bookings")}
            className="rounded-md"
            data-testid="admin-manual-booking-cancel"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedCustomer || !selectedVehicle || !pickupDate || !dropoffDate}
            className="rounded-md bg-[#0A192F] text-white hover:bg-[#0A192F]/90 disabled:opacity-50"
            data-testid="admin-manual-booking-submit"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Booking
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
