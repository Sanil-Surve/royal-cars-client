import { useState, useCallback, useRef } from "react";
import {
  Search, Car, Calendar, BarChart3, TrendingUp,
  Users, IndianRupee, Clock, Award, Download,
  FileSpreadsheet, FileText, AlertCircle, Loader2,
  ChevronDown, X, Star,
} from "lucide-react";
import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart,
  Pie, Cell, Legend, Area, AreaChart,
} from "recharts";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { api, formatINR } from "../lib/api";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_COLORS = {
  completed: "#10b981",
  active: "#3b82f6",
  confirmed: "#6366f1",
  cancelled: "#ef4444",
  pending_kyc: "#f59e0b",
  verified: "#8b5cf6",
};

const CHART_PALETTE = ["#0A192F", "#D4AF37", "#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = "#0A192F" }) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: color + "15" }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-[#0A192F]">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Custom Tooltip for charts ─────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-1">
          <span className="font-medium">{p.name}:</span>{" "}
          {p.name.toLowerCase().includes("revenue") ? formatINR(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Search Input with Dropdown ────────────────────────────────────────────────
function VehicleSearch({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);

  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/admin/vehicles/search", { params: { q: val } });
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, []);

  const selectVehicle = (v) => {
    setQuery(v.vehicle_number ? `${v.vehicle_number} — ${v.name}` : v.name);
    setOpen(false);
    setResults([]);
    onSelect(v);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
        <Input
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Type number plate (e.g. MH12AB, AB1234)..."
          className="pl-9 pr-9 h-11 rounded-lg border-slate-200 text-sm"
          id="vehicle-plate-search"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden">
          {results.map((v) => (
            <button
              key={v.id}
              onClick={() => selectVehicle(v)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition border-b border-slate-100 last:border-0"
            >
              {v.image_urls?.[0] ? (
                <img src={v.image_urls[0]} alt="" className="h-10 w-14 rounded-md object-cover shrink-0" />
              ) : (
                <div className="h-10 w-14 rounded-md bg-slate-100 shrink-0 flex items-center justify-center">
                  <Car className="h-4 w-4 text-slate-400" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-sm text-[#0A192F]">{v.name}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  {v.vehicle_number ? (
                    <span className="font-mono font-bold text-[#D4AF37]">{v.vehicle_number}</span>
                  ) : (
                    <span className="text-slate-400 italic">No plate set</span>
                  )}
                  <span className="text-slate-300">·</span>
                  <span>{v.type}</span>
                </p>
              </div>
            </button>
          ))}
          {results.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500">No vehicles found</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Monthly Analytics View ────────────────────────────────────────────────────
function MonthlyView({ vehicle, exportRef }) {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/admin/analytics/monthly", {
        params: { vehicle_id: vehicle.id, month, year },
      });
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  const statusData = data
    ? Object.entries(data.statusSummary)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1).replace("_", " "), value: v, key: k }))
    : [];

  return (
    <div className="space-y-6" ref={exportRef}>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs uppercase tracking-widest text-slate-500 block mb-1">Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white"
            id="analytics-month-select"
          >
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-slate-500 block mb-1">Year</label>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            min={2020}
            max={2100}
            className="h-10 w-28"
            id="analytics-year-input"
          />
        </div>
        <Button
          onClick={fetch}
          className="h-10 rounded-lg bg-[#0A192F] text-white"
          disabled={loading}
          id="analytics-monthly-search-btn"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
          Analyse
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {data && (
        <>
          {/* Header badge */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-mono font-bold text-[#D4AF37] text-base">{data.vehicleNumber || "—"}</span>
            <span>·</span>
            <span>{data.vehicleName}</span>
            <span>·</span>
            <span>{MONTHS[data.month - 1]} {data.year}</span>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={BarChart3} label="Total Bookings" value={data.totalBookings} color="#0A192F" />
            <StatCard icon={IndianRupee} label="Total Revenue" value={formatINR(data.totalRevenue)} color="#D4AF37" />
            <StatCard icon={Clock} label="Rental Days" value={`${data.totalRentalDays} days`} color="#10b981" />
            <StatCard icon={Users} label="Unique Customers" value={data.uniqueCustomers} color="#6366f1" />
          </div>

          {/* Charts */}
          {statusData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Donut chart - status breakdown */}
              <Card className="rounded-xl border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-[#0A192F] mb-4">Booking Status Breakdown</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell
                          key={entry.key}
                          fill={STATUS_COLORS[entry.key] || CHART_PALETTE[index % CHART_PALETTE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                    <Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              {/* Status breakdown bar */}
              <Card className="rounded-xl border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-[#0A192F] mb-4">Status Summary</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={statusData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Bookings" radius={[0, 4, 4, 0]}>
                      {statusData.map((entry, index) => (
                        <Cell
                          key={entry.key}
                          fill={STATUS_COLORS[entry.key] || CHART_PALETTE[index % CHART_PALETTE.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 py-12 text-center text-slate-400">
              <BarChart3 className="mx-auto h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">No bookings found for this period</p>
            </div>
          )}
        </>
      )}

      {!data && !loading && !error && (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-slate-400">
          <Search className="mx-auto h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">Select month & year, then click <strong>Analyse</strong></p>
        </div>
      )}
    </div>
  );
}

// ─── Yearly Analytics View ─────────────────────────────────────────────────────
function YearlyView({ vehicle, exportRef }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/admin/analytics/yearly", {
        params: { vehicle_id: vehicle.id, year },
      });
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" ref={exportRef}>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs uppercase tracking-widest text-slate-500 block mb-1">Year</label>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            min={2020}
            max={2100}
            className="h-10 w-28"
            id="analytics-year-yearly-input"
          />
        </div>
        <Button
          onClick={fetch}
          className="h-10 rounded-lg bg-[#0A192F] text-white"
          disabled={loading}
          id="analytics-yearly-search-btn"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
          Analyse
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {data && (
        <>
          {/* Header */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-mono font-bold text-[#D4AF37] text-base">{data.vehicleNumber || "—"}</span>
            <span>·</span>
            <span>{data.vehicleName}</span>
            <span>·</span>
            <span>FY {data.year}</span>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={BarChart3} label="Total Bookings" value={data.totalBookings} color="#0A192F" />
            <StatCard icon={IndianRupee} label="Total Revenue" value={formatINR(data.totalRevenue)} color="#D4AF37" />
            <StatCard icon={Clock} label="Rental Days" value={`${data.totalRentalDays} days`} color="#10b981" />
            <StatCard
              icon={Award}
              label="Most Active Month"
              value={data.mostActiveMonth || "—"}
              sub={data.mostActiveMonth ? "Highest bookings" : "No bookings yet"}
              color="#f59e0b"
            />
          </div>

          {/* Monthly trend chart */}
          <Card className="rounded-xl border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-[#0A192F] mb-1">Monthly Booking Trend</h3>
            <p className="text-xs text-slate-400 mb-4">Bookings count and revenue across all 12 months of {data.year}</p>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data.monthlyBookings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tickFormatter={(v) => v.slice(0, 3)}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12, fill: "#D4AF37" }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="bookings"
                  name="Bookings"
                  fill="#0A192F"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue (₹)"
                  stroke="#D4AF37"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#D4AF37" }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          {/* Revenue area chart */}
          <Card className="rounded-xl border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-[#0A192F] mb-1">Revenue Distribution</h3>
            <p className="text-xs text-slate-400 mb-4">Monthly rental revenue for {data.year}</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.monthlyBookings}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tickFormatter={(v) => v.slice(0, 3)} tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue (₹)"
                  stroke="#D4AF37"
                  strokeWidth={2.5}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Monthly data table */}
          <Card className="rounded-xl border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-[#0A192F]">Monthly Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Month</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Bookings</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Revenue</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Rental Days</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthlyBookings.map((row, i) => (
                    <tr
                      key={row.month}
                      className={`border-t border-slate-100 ${row.month === data.mostActiveMonth ? "bg-amber-50/50" : i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}
                    >
                      <td className="px-4 py-2.5 font-medium text-[#0A192F] flex items-center gap-1.5">
                        {row.month === data.mostActiveMonth && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                        {row.month}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">{row.bookings}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-700">{formatINR(row.revenue)}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{row.rentalDays}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                  <tr>
                    <td className="px-4 py-2.5 text-[#0A192F]">Total</td>
                    <td className="px-4 py-2.5 text-right font-mono">{data.totalBookings}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-700">{formatINR(data.totalRevenue)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{data.totalRentalDays}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}

      {!data && !loading && !error && (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-slate-400">
          <TrendingUp className="mx-auto h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">Enter a year and click <strong>Analyse</strong> to see trends</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminAnalytics() {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [tab, setTab] = useState("monthly"); // "monthly" | "yearly"
  const exportRef = useRef(null);

  // ── Excel export ────────────────────────────────────────────────────────────
  const exportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const el = exportRef.current;
      if (!el) { toast.error("Nothing to export"); return; }

      // Gather table rows if present
      const tables = el.querySelectorAll("table");
      if (tables.length > 0) {
        const wb = XLSX.utils.book_new();
        tables.forEach((tbl, idx) => {
          const ws = XLSX.utils.table_to_sheet(tbl);
          XLSX.utils.book_append_sheet(wb, ws, `Sheet${idx + 1}`);
        });
        XLSX.writeFile(wb, `royal-cars-analytics-${selectedVehicle?.vehicle_number || "vehicle"}.xlsx`);
        toast.success("Excel file downloaded");
      } else {
        // Gather stat cards text
        const texts = [...el.querySelectorAll("p, td, th")].map((n) => n.innerText).filter(Boolean);
        const ws = XLSX.utils.aoa_to_sheet(texts.map((t) => [t]));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Analytics");
        XLSX.writeFile(wb, `royal-cars-analytics-${selectedVehicle?.vehicle_number || "vehicle"}.xlsx`);
        toast.success("Excel file downloaded");
      }
    } catch (e) {
      console.error(e);
      toast.error("Export failed: " + e.message);
    }
  };

  // ── PDF export ───────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const el = exportRef.current;
      if (!el) { toast.error("Nothing to export"); return; }
      toast("Generating PDF…", { duration: 2000 });
      const canvas = await html2canvas(el, { scale: 1.5, useCORS: true, backgroundColor: "#fff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 20;
      const imgH = (canvas.height * imgW) / canvas.width;
      let y = 10;
      let remaining = imgH;
      while (remaining > 0) {
        pdf.addImage(imgData, "PNG", 10, y, imgW, imgH);
        remaining -= pageH - 20;
        if (remaining > 0) { pdf.addPage(); y = 10 - (imgH - remaining); }
      }
      pdf.save(`royal-cars-analytics-${selectedVehicle?.vehicle_number || "vehicle"}.pdf`);
      toast.success("PDF downloaded");
    } catch (e) {
      console.error(e);
      toast.error("PDF export failed: " + e.message);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 min-h-screen bg-[#FAFAFA]">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">Insights</p>
          <h1 className="font-heading text-3xl font-bold text-[#0A192F]" id="analytics-page-title">
            Vehicle Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Search by number plate · Monthly & yearly booking insights
          </p>
        </div>
        {selectedVehicle && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportExcel}
              className="rounded-lg border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
              id="analytics-export-excel-btn"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Export Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportPDF}
              className="rounded-lg border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              id="analytics-export-pdf-btn"
            >
              <FileText className="h-4 w-4 mr-1.5" /> Export PDF
            </Button>
          </div>
        )}
      </div>

      {/* Search */}
      <Card className="rounded-xl border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A192F]/10">
            <Car className="h-4 w-4 text-[#0A192F]" />
          </div>
          <p className="font-semibold text-sm text-[#0A192F]">Search by Number Plate</p>
        </div>
        <VehicleSearch onSelect={(v) => { setSelectedVehicle(v); }} />
        {selectedVehicle && (
          <div className="mt-3 flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5">
            {selectedVehicle.image_urls?.[0] && (
              <img src={selectedVehicle.image_urls[0]} alt="" className="h-9 w-14 rounded object-cover shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#0A192F]">{selectedVehicle.name}</p>
              <p className="text-xs text-slate-500">
                <span className="font-mono font-bold text-[#D4AF37]">{selectedVehicle.vehicle_number || "No plate"}</span>
                {" · "}{selectedVehicle.type}{" · "}{selectedVehicle.fuel_type}
              </p>
            </div>
            <button
              onClick={() => setSelectedVehicle(null)}
              className="p-1 rounded hover:bg-slate-200 transition"
              title="Clear selection"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        )}
      </Card>

      {/* Analytics Tabs & Content */}
      {selectedVehicle ? (
        <div className="space-y-4">
          {/* Tab switcher */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit shadow-sm">
            {[
              { key: "monthly", label: "Monthly", icon: Calendar },
              { key: "yearly", label: "Yearly", icon: TrendingUp },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition ${
                  tab === key
                    ? "bg-[#0A192F] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
                id={`analytics-tab-${key}`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <Card className="rounded-xl border-slate-200 p-6 shadow-sm">
            {tab === "monthly" ? (
              <MonthlyView vehicle={selectedVehicle} exportRef={exportRef} />
            ) : (
              <YearlyView vehicle={selectedVehicle} exportRef={exportRef} />
            )}
          </Card>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 py-20 text-center text-slate-400">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <BarChart3 className="h-8 w-8 opacity-40" />
          </div>
          <p className="text-base font-medium">Search for a vehicle to get started</p>
          <p className="text-sm mt-1">Type a number plate like <span className="font-mono text-[#D4AF37]">MH12</span> or <span className="font-mono text-[#D4AF37]">AB1234</span></p>
        </div>
      )}
    </div>
  );
}
