import { useEffect, useState } from "react";
import { Car, CalendarCheck, Users, IndianRupee, FileCheck2, TrendingUp } from "lucide-react";
import { Card } from "../components/ui/card";
import { api, formatINR } from "../lib/api";

const CARDS = [
  { key: "revenue", label: "Revenue collected", icon: IndianRupee, money: true },
  { key: "pending_balance", label: "Pending balance", icon: TrendingUp, money: true },
  { key: "active_bookings", label: "Active bookings", icon: CalendarCheck },
  { key: "pending_kyc", label: "Pending KYC", icon: FileCheck2 },
  { key: "total_customers", label: "Customers", icon: Users },
  { key: "available_vehicles", label: "Available vehicles", icon: Car },
];

export default function AdminDashboard() {
  const [m, setM] = useState(null);
  useEffect(() => {
    api.get("/admin/metrics").then((r) => setM(r.data));
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-widest text-slate-500">Fleet Console</div>
        <h1 className="font-heading text-3xl font-bold text-[#0A192F]" data-testid="admin-dashboard-title">Dashboard</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Card key={c.key} className="rounded-lg border-slate-200 p-5" data-testid={`metric-${c.key}`}>
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-slate-500">{c.label}</div>
              <c.icon className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-3 font-heading text-3xl text-[#0A192F]">
              {m == null ? "—" : c.money ? formatINR(m[c.key]) : m[c.key]}
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 rounded-lg border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-slate-500">Fleet utilization</div>
        </div>
        <div className="mt-3 font-heading text-3xl text-[#0A192F]">
          {m ? `${m.fleet_utilization}%` : "—"}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#D4AF37]" style={{ width: `${Math.min(100, m?.fleet_utilization || 0)}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">Share of fleet currently held in active bookings.</p>
      </Card>
    </div>
  );
}
