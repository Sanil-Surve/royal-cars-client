import { useEffect, useState } from "react";
import {
  Car, CalendarCheck, Users, IndianRupee, FileCheck2, TrendingUp,
  Play, Square, Clock, Gauge, MapPin, Phone, Timer,
} from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { api, formatINR } from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import StartRideDialog from "../components/StartRideDialog";
import EndRideDialog from "../components/EndRideDialog";

const CARDS = [
  { key: "revenue", label: "Revenue collected", icon: IndianRupee, money: true },
  { key: "pending_balance", label: "Pending balance", icon: TrendingUp, money: true },
  { key: "active_bookings", label: "Active bookings", icon: CalendarCheck },
  { key: "pending_kyc", label: "Pending KYC", icon: FileCheck2 },
  { key: "total_customers", label: "Customers", icon: Users },
  { key: "available_vehicles", label: "Available vehicles", icon: Car },
];

function getElapsedTime(startIso) {
  if (!startIso) return "—";
  const start = new Date(startIso);
  const now = new Date();
  const diffMs = now - start;
  const hrs = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hrs < 1) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

function isOverdue(booking) {
  try {
    const dropoff = new Date(`${booking.dropoff_date}T${booking.dropoff_time}`);
    return new Date() > dropoff;
  } catch {
    return false;
  }
}

function getTimeUntilPickup(booking) {
  try {
    const pickup = new Date(`${booking.pickup_date}T${booking.pickup_time}`);
    const now = new Date();
    const diffMs = pickup - now;
    if (diffMs < 0) return "Now";
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    if (hrs < 1) return `${mins}m`;
    if (hrs < 24) return `${hrs}h ${mins}m`;
    const days = Math.floor(hrs / 24);
    return `${days}d ${hrs % 24}h`;
  } catch {
    return "—";
  }
}

export default function AdminDashboard() {
  const [m, setM] = useState(null);
  const [activeRides, setActiveRides] = useState([]);
  const [confirmedRides, setConfirmedRides] = useState([]);
  const [startDialog, setStartDialog] = useState({ open: false, booking: null });
  const [endDialog, setEndDialog] = useState({ open: false, booking: null });

  const loadMetrics = () => api.get("/admin/metrics").then((r) => setM(r.data));
  const loadActiveRides = () => api.get("/admin/active-rides").then((r) => setActiveRides(r.data));
  const loadConfirmedRides = () => api.get("/admin/confirmed-rides").then((r) => setConfirmedRides(r.data));

  const loadAll = () => {
    loadMetrics();
    loadActiveRides();
    loadConfirmedRides();
  };

  useEffect(() => {
    loadAll();
    // Refresh active rides every 60 seconds to keep elapsed time updated
    const interval = setInterval(loadAll, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <div className="text-xs uppercase tracking-widest text-slate-500">Fleet Console</div>
        <h1 className="font-heading text-3xl font-bold text-[#0A192F]" data-testid="admin-dashboard-title">Dashboard</h1>
      </div>

      {/* Metrics */}
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

      {/* Fleet Utilization */}
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

      {/* Active Rides - Live */}
      <div className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100">
            <Car className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-[#0A192F]">Active Rides</h2>
            <p className="text-xs text-slate-500">Vehicles currently on the road</p>
          </div>
          {activeRides.length > 0 && (
            <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-bold text-white">
              {activeRides.length}
            </span>
          )}
        </div>

        {activeRides.length === 0 ? (
          <Card className="rounded-lg border-slate-200 p-8 text-center">
            <Car className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No active rides right now</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activeRides.map((ride) => {
              const overdue = isOverdue(ride);
              return (
                <Card
                  key={ride.id}
                  className={`card-hover rounded-lg p-5 ${overdue ? "border-red-300 bg-red-50/50" : "border-slate-200"}`}
                  data-testid={`active-ride-${ride.id}`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-heading text-lg font-bold text-[#0A192F]">{ride.vehicle_name}</p>
                      <p className="text-sm text-slate-600">{ride.customer_name || "—"}</p>
                    </div>
                    <StatusBadge status={overdue ? "overdue" : "active"} />
                  </div>

                  {/* Ride details */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Timer className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-slate-600">Elapsed:</span>
                      <span className="font-semibold text-[#0A192F]">{getElapsedTime(ride.ride_started_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Gauge className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-slate-600">Start ODO:</span>
                      <span className="font-semibold text-[#0A192F]">{ride.odometer_start?.toLocaleString() ?? "—"} km</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-slate-600">Return by:</span>
                      <span className={`font-semibold ${overdue ? "text-red-600" : "text-[#0A192F]"}`}>
                        {ride.dropoff_date} {ride.dropoff_time}
                      </span>
                    </div>
                    {ride.customer_phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <a href={`tel:${ride.customer_phone}`} className="text-blue-600 hover:underline">{ride.customer_phone}</a>
                      </div>
                    )}
                  </div>

                  {overdue && (
                    <div className="mt-3 rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700">
                      ⚠ Vehicle overdue for return
                    </div>
                  )}

                  <Button
                    onClick={() => setEndDialog({ open: true, booking: ride })}
                    className="mt-4 w-full rounded-md bg-red-600 hover:bg-red-700"
                    data-testid={`end-ride-btn-${ride.id}`}
                  >
                    <Square className="mr-2 h-4 w-4" /> End Ride
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Ready to Start */}
      <div className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
            <Play className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-[#0A192F]">Ready to Start</h2>
            <p className="text-xs text-slate-500">Confirmed bookings awaiting vehicle handover</p>
          </div>
          {confirmedRides.length > 0 && (
            <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-600 px-1.5 text-xs font-bold text-white">
              {confirmedRides.length}
            </span>
          )}
        </div>

        {confirmedRides.length === 0 ? (
          <Card className="rounded-lg border-slate-200 p-8 text-center">
            <CalendarCheck className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No confirmed bookings ready to start</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {confirmedRides.map((ride) => (
              <Card
                key={ride.id}
                className="card-hover rounded-lg border-slate-200 p-5"
                data-testid={`confirmed-ride-${ride.id}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-heading text-lg font-bold text-[#0A192F]">{ride.vehicle_name}</p>
                    <p className="text-sm text-slate-600">{ride.customer_name || "—"}</p>
                  </div>
                  <StatusBadge status="confirmed" />
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-600">Pickup:</span>
                    <span className="font-semibold text-[#0A192F]">{ride.pickup_date} {ride.pickup_time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-600">Starts in:</span>
                    <span className="font-semibold text-[#0A192F]">{getTimeUntilPickup(ride)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <IndianRupee className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-600">Total:</span>
                    <span className="font-semibold text-[#0A192F]">{formatINR(ride.total_amount)}</span>
                    {ride.balance_amount > 0 && (
                      <span className="text-xs text-amber-600">(Balance: {formatINR(ride.balance_amount)})</span>
                    )}
                  </div>
                  {ride.customer_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <a href={`tel:${ride.customer_phone}`} className="text-blue-600 hover:underline">{ride.customer_phone}</a>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => setStartDialog({ open: true, booking: ride })}
                  className="mt-4 w-full rounded-md bg-emerald-600 hover:bg-emerald-700"
                  data-testid={`start-ride-btn-${ride.id}`}
                >
                  <Play className="mr-2 h-4 w-4" /> Start Ride
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {startDialog.booking && (
        <StartRideDialog
          booking={startDialog.booking}
          open={startDialog.open}
          onOpenChange={(open) => setStartDialog((s) => ({ ...s, open }))}
          onSuccess={loadAll}
        />
      )}
      {endDialog.booking && (
        <EndRideDialog
          booking={endDialog.booking}
          open={endDialog.open}
          onOpenChange={(open) => setEndDialog((s) => ({ ...s, open }))}
          onSuccess={loadAll}
        />
      )}
    </div>
  );
}
