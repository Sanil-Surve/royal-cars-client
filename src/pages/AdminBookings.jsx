import { useEffect, useState } from "react";
import { CreditCard, Check, Play, Square } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { api, formatINR, formatApiErrorDetail } from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import StartRideDialog from "../components/StartRideDialog";
import EndRideDialog from "../components/EndRideDialog";
import { toast } from "sonner";

const STATUSES = ["pending_kyc", "verified", "confirmed", "active", "completed", "cancelled"];

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("all");
  const [startDialog, setStartDialog] = useState({ open: false, booking: null });
  const [endDialog, setEndDialog] = useState({ open: false, booking: null });

  const load = async () => {
    const params = filter !== "all" ? { status: filter } : {};
    const { data } = await api.get("/admin/bookings", { params });
    setBookings(data);
  };
  useEffect(() => { load(); }, [filter]);

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/admin/bookings/${id}/status`, { status });
      toast.success("Status updated");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    }
  };

  const chargeBalance = async (id) => {
    try {
      await api.post(`/admin/bookings/${id}/charge-balance`);
      toast.success("Balance charged to saved card");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    }
  };

  const markBalancePaid = async (id) => {
    if (!window.confirm("Mark balance as paid in cash at pickup?")) return;
    try {
      await api.post(`/admin/bookings/${id}/mark-balance-paid`);
      toast.success("Balance marked paid");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">Operations</div>
          <h1 className="font-heading text-3xl font-bold text-[#0A192F]" data-testid="admin-bookings-title">Bookings</h1>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48 rounded-md" data-testid="admin-bookings-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-lg border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((b) => (
              <TableRow key={b.id} data-testid={`admin-booking-row-${b.id}`}>
                <TableCell>
                  <div className="font-medium">{b.customer_name || "—"}</div>
                  <div className="text-xs text-slate-500">{b.customer_email}</div>
                </TableCell>
                <TableCell>{b.vehicle_name}</TableCell>
                <TableCell className="text-xs text-slate-600">{b.pickup_date} → {b.dropoff_date}</TableCell>
                <TableCell>{formatINR(b.total_amount)}</TableCell>
                <TableCell>{formatINR(b.balance_amount || 0)}</TableCell>
                <TableCell><StatusBadge status={b.status} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Start Ride button — only for confirmed bookings */}
                    {b.status === "confirmed" && (
                      <Button
                        size="sm"
                        onClick={() => setStartDialog({ open: true, booking: b })}
                        className="h-8 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                        data-testid={`start-ride-${b.id}`}
                        title="Start ride for this booking"
                      >
                        <Play className="mr-1 h-3 w-3" /> Start
                      </Button>
                    )}
                    {/* End Ride button — only for active bookings */}
                    {b.status === "active" && (
                      <Button
                        size="sm"
                        onClick={() => setEndDialog({ open: true, booking: b })}
                        className="h-8 rounded-md bg-red-600 text-white hover:bg-red-700"
                        data-testid={`end-ride-${b.id}`}
                        title="End ride for this booking"
                      >
                        <Square className="mr-1 h-3 w-3" /> End
                      </Button>
                    )}
                    {b.balance_amount > 0 && b.razorpay_token_id && (
                      <Button size="sm" onClick={() => chargeBalance(b.id)} className="h-8 rounded-md bg-[#D4AF37] text-[#0A192F] hover:bg-[#D4AF37]/90" data-testid={`charge-balance-${b.id}`} title="Auto-charge balance to saved card">
                        <CreditCard className="mr-1 h-3 w-3" /> Charge {formatINR(b.balance_amount)}
                      </Button>
                    )}
                    {b.balance_amount > 0 && !b.razorpay_token_id && (
                      <Button size="sm" variant="outline" onClick={() => markBalancePaid(b.id)} className="h-8 rounded-md" data-testid={`mark-paid-${b.id}`} title="Cash collected at pickup">
                        <Check className="mr-1 h-3 w-3" /> Mark paid
                      </Button>
                    )}
                    <Select value={b.status} onValueChange={(v) => setStatus(b.id, v)}>
                      <SelectTrigger className="h-8 w-36 rounded-md" data-testid={`admin-booking-status-${b.id}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {bookings.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-slate-500">No bookings</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialogs */}
      {startDialog.booking && (
        <StartRideDialog
          booking={startDialog.booking}
          open={startDialog.open}
          onOpenChange={(open) => setStartDialog((s) => ({ ...s, open }))}
          onSuccess={load}
        />
      )}
      {endDialog.booking && (
        <EndRideDialog
          booking={endDialog.booking}
          open={endDialog.open}
          onOpenChange={(open) => setEndDialog((s) => ({ ...s, open }))}
          onSuccess={load}
        />
      )}
    </div>
  );
}
