import { useEffect, useState } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { api, formatINR, formatApiErrorDetail } from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import { toast } from "sonner";

const STATUSES = ["pending_kyc", "verified", "confirmed", "active", "completed", "cancelled"];

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("all");

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
                  <Select value={b.status} onValueChange={(v) => setStatus(b.id, v)}>
                    <SelectTrigger className="h-8 w-36 rounded-md" data-testid={`admin-booking-status-${b.id}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {bookings.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-slate-500">No bookings</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
