import { useEffect, useState } from "react";
import {
  Ticket, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  IndianRupee, TrendingDown, Users, BadgePercent, CalendarDays,
  BarChart3, ChevronDown, ChevronUp, X, Check, AlertCircle,
} from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { api, formatINR } from "../lib/api";
import { toast } from "sonner";

const EMPTY_FORM = {
  code: "",
  discount_type: "percentage",
  discount_value: "",
  minimum_amount: "",
  maximum_discount: "",
  start_date: "",
  end_date: "",
  usage_limit: "",
  is_active: true,
};

function DiscountBadge({ type, value, maxDisc }) {
  const label =
    type === "percentage"
      ? `${value}% off${maxDisc > 0 ? ` (max ₹${maxDisc})` : ""}`
      : `₹${value} off`;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
      <BadgePercent className="h-3 w-3" />
      {label}
    </span>
  );
}

function StatusPill({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
      <Check className="h-3 w-3" /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 border border-slate-200">
      <X className="h-3 w-3" /> Inactive
    </span>
  );
}

function CouponModal({ coupon, onClose, onSave }) {
  const [form, setForm] = useState(coupon ? {
    code: coupon.code,
    discount_type: coupon.discount_type,
    discount_value: String(coupon.discount_value),
    minimum_amount: String(coupon.minimum_amount || ""),
    maximum_discount: String(coupon.maximum_discount || ""),
    start_date: coupon.start_date,
    end_date: coupon.end_date,
    usage_limit: String(coupon.usage_limit || ""),
    is_active: coupon.is_active,
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value) || 0,
        minimum_amount: parseFloat(form.minimum_amount) || 0,
        maximum_discount: parseFloat(form.maximum_discount) || 0,
        start_date: form.start_date,
        end_date: form.end_date,
        usage_limit: parseInt(form.usage_limit) || 0,
        is_active: form.is_active,
      };
      if (coupon) {
        const { data } = await api.put(`/coupons/${coupon.id}`, payload);
        toast.success("Coupon updated");
        onSave(data);
      } else {
        const { data } = await api.post("/coupons", payload);
        toast.success("Coupon created");
        onSave(data);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0A192F]">
              <Ticket className="h-4 w-4 text-[#D4AF37]" />
            </div>
            <h2 className="font-heading text-lg font-bold text-[#0A192F]">
              {coupon ? "Edit Coupon" : "Create Coupon"}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Code + Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Coupon Code *</label>
              <Input
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                placeholder="e.g. SAVE20"
                required
                maxLength={20}
                className="uppercase font-mono"
                disabled={!!coupon}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Discount Type *</label>
              <select
                value={form.discount_type}
                onChange={(e) => set("discount_type", e.target.value)}
                className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A192F]/20"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
          </div>

          {/* Value + Min amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
                {form.discount_type === "percentage" ? "Discount %" : "Discount ₹"} *
              </label>
              <Input
                type="number"
                value={form.discount_value}
                onChange={(e) => set("discount_value", e.target.value)}
                placeholder={form.discount_type === "percentage" ? "e.g. 10" : "e.g. 500"}
                required
                min="0.01"
                step="0.01"
                max={form.discount_type === "percentage" ? "100" : undefined}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Minimum Amount (₹)</label>
              <Input
                type="number"
                value={form.minimum_amount}
                onChange={(e) => set("minimum_amount", e.target.value)}
                placeholder="e.g. 2000 (0 = none)"
                min="0"
              />
            </div>
          </div>

          {/* Max discount + Usage limit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Max Discount (₹)</label>
              <Input
                type="number"
                value={form.maximum_discount}
                onChange={(e) => set("maximum_discount", e.target.value)}
                placeholder="e.g. 1000 (0 = no cap)"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Usage Limit</label>
              <Input
                type="number"
                value={form.usage_limit}
                onChange={(e) => set("usage_limit", e.target.value)}
                placeholder="e.g. 100 (0 = unlimited)"
                min="0"
              />
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Start Date *</label>
              <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">End Date *</label>
              <Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} required min={form.start_date} />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
            <button
              type="button"
              onClick={() => set("is_active", !form.is_active)}
              className={`relative flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? "bg-emerald-500" : "bg-slate-300"}`}
            >
              <span className={`absolute h-4 w-4 rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className="text-sm text-slate-700">{form.is_active ? "Active — coupon is visible to customers" : "Inactive — coupon will not be accepted"}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-lg">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1 rounded-lg bg-[#0A192F] hover:bg-[#0A192F]/90 text-white">
              {saving ? "Saving..." : coupon ? "Update Coupon" : "Create Coupon"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReportCard({ label, value, icon: Icon, money, color }) {
  return (
    <Card className="rounded-xl border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-widest text-slate-500">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="font-heading text-2xl font-bold text-[#0A192F]">
        {value == null ? "—" : money ? formatINR(value) : value}
      </div>
    </Card>
  );
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, coupon: null });
  const [showReport, setShowReport] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [toggling, setToggling] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([
        api.get("/coupons"),
        api.get("/admin/discount-report"),
      ]);
      setCoupons(c.data);
      setReport(r.data);
    } catch {
      toast.error("Failed to load coupon data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = (updated) => {
    setCoupons((prev) => {
      const idx = prev.findIndex((c) => c.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [updated, ...prev];
    });
    setModal({ open: false, coupon: null });
    load(); // refresh report too
  };

  const handleDelete = async (coupon) => {
    if (!window.confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return;
    setDeleting(coupon.id);
    try {
      await api.delete(`/coupons/${coupon.id}`);
      toast.success("Coupon deleted");
      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (coupon) => {
    setToggling(coupon.id);
    try {
      const { data } = await api.patch(`/coupons/${coupon.id}/toggle`);
      toast.success(`Coupon ${data.is_active ? "activated" : "deactivated"}`);
      setCoupons((prev) => prev.map((c) => (c.id === data.id ? data : c)));
    } catch (e) {
      toast.error(e.response?.data?.detail || "Toggle failed");
    } finally {
      setToggling(null);
    }
  };

  const isExpired = (c) => c.end_date < new Date().toISOString().slice(0, 10);
  const usageExhausted = (c) => c.usage_limit > 0 && c.used_count >= c.usage_limit;

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">Fleet Console</div>
          <h1 className="font-heading text-3xl font-bold text-[#0A192F]">Coupons & Discounts</h1>
        </div>
        <Button
          onClick={() => setModal({ open: true, coupon: null })}
          className="rounded-lg bg-[#0A192F] hover:bg-[#0A192F]/90 text-white gap-2"
          id="create-coupon-btn"
        >
          <Plus className="h-4 w-4" /> New Coupon
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <ReportCard label="Total Coupons" value={coupons.length} icon={Ticket} color="bg-blue-50 text-blue-600" />
        <ReportCard label="Active Coupons" value={coupons.filter((c) => c.is_active && !isExpired(c)).length} icon={Check} color="bg-emerald-50 text-emerald-600" />
        <ReportCard label="Total Discount Given" value={report?.total_discount_given} icon={TrendingDown} money color="bg-amber-50 text-amber-600" />
        <ReportCard label="Tax Collected" value={report?.total_tax_collected} icon={IndianRupee} money color="bg-violet-50 text-violet-600" />
      </div>

      {/* Coupon table */}
      <Card className="rounded-xl border-slate-200 mb-8 overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center gap-2">
          <Ticket className="h-4 w-4 text-[#D4AF37]" />
          <h2 className="font-heading text-lg font-semibold text-[#0A192F]">All Coupons</h2>
          <span className="ml-auto text-xs text-slate-400">{coupons.length} coupon{coupons.length !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading coupons...</div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center">
            <Ticket className="mx-auto h-10 w-10 text-slate-200 mb-3" />
            <p className="text-slate-500 text-sm">No coupons yet. Create your first one!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Code</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Discount</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Min. Amount</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Usage</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Validity</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coupons.map((c) => {
                  const expired = isExpired(c);
                  const exhausted = usageExhausted(c);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold text-[#0A192F] bg-slate-100 px-2 py-0.5 rounded text-xs tracking-wider">
                            {c.code}
                          </code>
                          {(expired || exhausted) && (
                            <span title={expired ? "Expired" : "Limit reached"}>
                              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <DiscountBadge type={c.discount_type} value={c.discount_value} maxDisc={c.maximum_discount} />
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {c.minimum_amount > 0 ? formatINR(c.minimum_amount) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[#0A192F]">{c.used_count}</span>
                          <span className="text-slate-400">/</span>
                          <span className="text-slate-500">{c.usage_limit > 0 ? c.usage_limit : "∞"}</span>
                        </div>
                        {c.usage_limit > 0 && (
                          <div className="mt-1 h-1 w-16 rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[#D4AF37]"
                              style={{ width: `${Math.min(100, (c.used_count / c.usage_limit) * 100)}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {c.start_date}
                        </div>
                        <div className={`flex items-center gap-1 mt-0.5 ${expired ? "text-red-500 font-semibold" : ""}`}>
                          <CalendarDays className="h-3 w-3" />
                          {c.end_date}
                          {expired && " (expired)"}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusPill active={c.is_active} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          {/* Toggle */}
                          <button
                            onClick={() => handleToggle(c)}
                            disabled={toggling === c.id}
                            title={c.is_active ? "Deactivate" : "Activate"}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#0A192F] transition disabled:opacity-50"
                          >
                            {c.is_active
                              ? <ToggleRight className="h-4 w-4 text-emerald-500" />
                              : <ToggleLeft className="h-4 w-4" />
                            }
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => setModal({ open: true, coupon: c })}
                            title="Edit"
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#0A192F] transition"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(c)}
                            disabled={deleting === c.id}
                            title="Delete"
                            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Discount Report */}
      <Card className="rounded-xl border-slate-200 overflow-hidden">
        <button
          className="w-full flex items-center gap-3 border-b border-slate-200 px-6 py-4 text-left hover:bg-slate-50 transition"
          onClick={() => setShowReport((p) => !p)}
          id="toggle-discount-report"
        >
          <BarChart3 className="h-4 w-4 text-[#D4AF37]" />
          <h2 className="font-heading text-lg font-semibold text-[#0A192F] flex-1">Discount Report</h2>
          {showReport ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>

        {showReport && report && (
          <div className="p-6 space-y-6">
            {/* Discount type breakdown */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                <div className="text-xs uppercase tracking-wider text-blue-500 mb-1">Long-Term Discounts</div>
                <div className="font-heading text-xl font-bold text-[#0A192F]">{formatINR(report.total_long_term_discount)}</div>
                <div className="text-xs text-blue-400 mt-1">{report.bookings_with_long_term} booking{report.bookings_with_long_term !== 1 ? "s" : ""}</div>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                <div className="text-xs uppercase tracking-wider text-emerald-500 mb-1">First Booking Discounts</div>
                <div className="font-heading text-xl font-bold text-[#0A192F]">{formatINR(report.total_first_booking_discount)}</div>
                <div className="text-xs text-emerald-400 mt-1">{report.bookings_with_first_booking} booking{report.bookings_with_first_booking !== 1 ? "s" : ""}</div>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                <div className="text-xs uppercase tracking-wider text-amber-500 mb-1">Coupon Discounts</div>
                <div className="font-heading text-xl font-bold text-[#0A192F]">{formatINR(report.total_coupon_discount)}</div>
                <div className="text-xs text-amber-400 mt-1">{report.bookings_with_coupon} booking{report.bookings_with_coupon !== 1 ? "s" : ""}</div>
              </div>
            </div>

            {/* Top coupons */}
            {report.top_coupons?.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">Top Coupons by Usage</span>
                </div>
                <div className="space-y-2">
                  {report.top_coupons.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5">
                      <code className="font-mono text-xs font-bold text-[#0A192F] w-24 shrink-0">{c.code}</code>
                      <div className="flex-1 h-1.5 rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-[#D4AF37]"
                          style={{
                            width: `${report.top_coupons[0]?.used_count
                              ? Math.min(100, (c.used_count / report.top_coupons[0].used_count) * 100)
                              : 0}%`
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 w-16 text-right">
                        {c.used_count} uses
                      </span>
                      <StatusPill active={c.is_active} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Long-term discount rules info */}
            <div className="rounded-xl border border-dashed border-slate-200 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Automatic Discount Rules (read-only)</div>
              <div className="grid gap-2 sm:grid-cols-3 text-sm">
                {[
                  { label: "7–14 days", pct: "5%" },
                  { label: "15–29 days", pct: "10%" },
                  { label: "30+ days", pct: "15%" },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
                    <span className="text-slate-600">{r.label}</span>
                    <span className="font-semibold text-[#D4AF37]">{r.pct} off</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
                  <span className="text-slate-600">First booking (new customers)</span>
                  <span className="font-semibold text-emerald-600">10% off</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
                  <span className="text-slate-600">GST Tax Rate</span>
                  <span className="font-semibold text-slate-700">18%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Modal */}
      {modal.open && (
        <CouponModal
          coupon={modal.coupon}
          onClose={() => setModal({ open: false, coupon: null })}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
