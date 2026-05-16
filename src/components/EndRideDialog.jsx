import { useState, useEffect } from "react";
import { Square, Gauge, Fuel, StickyNote, Loader2, AlertTriangle, IndianRupee } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { api, formatApiErrorDetail, formatINR } from "../lib/api";
import { toast } from "sonner";

const FUEL_LEVELS = ["Full", "3/4", "1/2", "1/4", "Empty"];

function getElapsedTime(startIso) {
  if (!startIso) return "—";
  const start = new Date(startIso);
  const now = new Date();
  const diffMs = now - start;
  const hrs = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  return `${hrs}h ${mins}m`;
}

function isOvertime(booking) {
  if (!booking) return false;
  try {
    const dropoff = new Date(`${booking.dropoff_date}T${booking.dropoff_time}`);
    return new Date() > dropoff;
  } catch {
    return false;
  }
}

export default function EndRideDialog({ booking, open, onOpenChange, onSuccess }) {
  const [odometer, setOdometer] = useState("");
  const [fuelLevel, setFuelLevel] = useState("Full");
  const [notes, setNotes] = useState("");
  const [extraCharges, setExtraCharges] = useState("0");
  const [extraReason, setExtraReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [overtime, setOvertime] = useState(false);

  useEffect(() => {
    if (booking) {
      setOvertime(isOvertime(booking));
    }
  }, [booking]);

  const kmDriven = odometer && booking?.odometer_start != null
    ? Math.max(0, parseFloat(odometer) - booking.odometer_start).toFixed(1)
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!odometer || parseFloat(odometer) < 0) {
      toast.error("Please enter a valid odometer reading");
      return;
    }
    if (booking?.odometer_start != null && parseFloat(odometer) < booking.odometer_start) {
      toast.error("End odometer cannot be less than start reading");
      return;
    }
    setLoading(true);
    try {
      const result = await api.post(`/admin/bookings/${booking.id}/end-ride`, {
        odometer_end: parseFloat(odometer),
        fuel_level_end: fuelLevel,
        photo_urls: [],
        notes: notes || null,
        extra_charges: parseFloat(extraCharges) || 0,
        extra_charges_reason: extraReason || null,
      });
      const data = result.data;
      let msg = `Ride ended for ${booking.vehicle_name}`;
      if (data.overtime_hours > 0) msg += ` · ${data.overtime_hours}h overtime`;
      toast.success(msg);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="end-ride-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl text-[#0A192F]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
              <Square className="h-4 w-4 text-red-600" />
            </div>
            End Ride
          </DialogTitle>
          <DialogDescription>
            Record vehicle return details for <strong>{booking?.vehicle_name}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Ride info summary */}
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-500">Customer</span>
                <p className="font-medium text-[#0A192F]">{booking?.customer_name || "—"}</p>
              </div>
              <div>
                <span className="text-slate-500">Duration</span>
                <p className="font-medium text-[#0A192F]">{getElapsedTime(booking?.ride_started_at)}</p>
              </div>
              <div>
                <span className="text-slate-500">Start odometer</span>
                <p className="font-medium text-[#0A192F]">{booking?.odometer_start ?? "—"} km</p>
              </div>
              <div>
                <span className="text-slate-500">Fuel at pickup</span>
                <p className="font-medium text-[#0A192F]">{booking?.fuel_level_start || "—"}</p>
              </div>
            </div>
          </div>

          {/* Overtime warning */}
          {overtime && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm" data-testid="overtime-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">Vehicle returned late</p>
                <p className="text-amber-700">Scheduled return was {booking?.dropoff_date} {booking?.dropoff_time}. Overtime charges will be calculated automatically.</p>
              </div>
            </div>
          )}

          {/* Odometer */}
          <div className="space-y-1.5">
            <Label htmlFor="odometer-end" className="flex items-center gap-1.5 text-sm font-medium">
              <Gauge className="h-3.5 w-3.5 text-slate-500" />
              Odometer Reading (km) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="odometer-end"
              type="number"
              step="0.1"
              min={booking?.odometer_start || 0}
              placeholder="e.g. 45780"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              required
              className="rounded-md"
              data-testid="end-ride-odometer"
            />
            {kmDriven !== null && (
              <p className="text-xs text-slate-500">
                Distance driven: <span className="font-semibold text-[#0A192F]">{kmDriven} km</span>
              </p>
            )}
          </div>

          {/* Fuel Level */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Fuel className="h-3.5 w-3.5 text-slate-500" />
              Fuel Level
            </Label>
            <Select value={fuelLevel} onValueChange={setFuelLevel}>
              <SelectTrigger className="rounded-md" data-testid="end-ride-fuel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUEL_LEVELS.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Extra charges */}
          <div className="space-y-1.5">
            <Label htmlFor="extra-charges" className="flex items-center gap-1.5 text-sm font-medium">
              <IndianRupee className="h-3.5 w-3.5 text-slate-500" />
              Extra Charges <span className="text-xs text-slate-400">(damage, cleaning, etc.)</span>
            </Label>
            <Input
              id="extra-charges"
              type="number"
              step="1"
              min="0"
              placeholder="0"
              value={extraCharges}
              onChange={(e) => setExtraCharges(e.target.value)}
              className="rounded-md"
              data-testid="end-ride-extra-charges"
            />
            {parseFloat(extraCharges) > 0 && (
              <Input
                placeholder="Reason for extra charges"
                value={extraReason}
                onChange={(e) => setExtraReason(e.target.value)}
                className="mt-1.5 rounded-md"
                data-testid="end-ride-extra-reason"
              />
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="end-notes" className="flex items-center gap-1.5 text-sm font-medium">
              <StickyNote className="h-3.5 w-3.5 text-slate-500" />
              Notes <span className="text-xs text-slate-400">(optional)</span>
            </Label>
            <textarea
              id="end-notes"
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Return condition, any damage observed..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="end-ride-notes"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-md">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-md bg-red-600 hover:bg-red-700"
              data-testid="end-ride-submit"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ending...</>
              ) : (
                <><Square className="mr-2 h-4 w-4" /> End Ride</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
