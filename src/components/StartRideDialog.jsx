import { useState } from "react";
import { Play, Gauge, Fuel, Camera, StickyNote, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { api, formatApiErrorDetail } from "../lib/api";
import { toast } from "sonner";

const FUEL_LEVELS = ["Full", "3/4", "1/2", "1/4", "Empty"];

export default function StartRideDialog({ booking, open, onOpenChange, onSuccess }) {
  const [odometer, setOdometer] = useState("");
  const [fuelLevel, setFuelLevel] = useState("Full");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!odometer || parseFloat(odometer) < 0) {
      toast.error("Please enter a valid odometer reading");
      return;
    }
    setLoading(true);
    try {
      await api.post(`/admin/bookings/${booking.id}/start-ride`, {
        odometer_start: parseFloat(odometer),
        fuel_level_start: fuelLevel,
        photo_urls: [],
        notes: notes || null,
      });
      toast.success(`Ride started for ${booking.vehicle_name}`);
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
      <DialogContent className="sm:max-w-md" data-testid="start-ride-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl text-[#0A192F]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
              <Play className="h-4 w-4 text-emerald-600" />
            </div>
            Start Ride
          </DialogTitle>
          <DialogDescription>
            Record vehicle handover details for <strong>{booking?.vehicle_name}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Booking info summary */}
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-500">Customer</span>
                <p className="font-medium text-[#0A192F]">{booking?.customer_name || "—"}</p>
              </div>
              <div>
                <span className="text-slate-500">Vehicle</span>
                <p className="font-medium text-[#0A192F]">{booking?.vehicle_name}</p>
              </div>
              <div>
                <span className="text-slate-500">Pickup</span>
                <p className="font-medium text-[#0A192F]">{booking?.pickup_date} {booking?.pickup_time}</p>
              </div>
              <div>
                <span className="text-slate-500">Return</span>
                <p className="font-medium text-[#0A192F]">{booking?.dropoff_date} {booking?.dropoff_time}</p>
              </div>
            </div>
          </div>

          {/* Odometer */}
          <div className="space-y-1.5">
            <Label htmlFor="odometer-start" className="flex items-center gap-1.5 text-sm font-medium">
              <Gauge className="h-3.5 w-3.5 text-slate-500" />
              Odometer Reading (km) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="odometer-start"
              type="number"
              step="0.1"
              min="0"
              placeholder="e.g. 45230"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              required
              className="rounded-md"
              data-testid="start-ride-odometer"
            />
          </div>

          {/* Fuel Level */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Fuel className="h-3.5 w-3.5 text-slate-500" />
              Fuel Level
            </Label>
            <Select value={fuelLevel} onValueChange={setFuelLevel}>
              <SelectTrigger className="rounded-md" data-testid="start-ride-fuel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUEL_LEVELS.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="start-notes" className="flex items-center gap-1.5 text-sm font-medium">
              <StickyNote className="h-3.5 w-3.5 text-slate-500" />
              Notes <span className="text-xs text-slate-400">(optional)</span>
            </Label>
            <textarea
              id="start-notes"
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Vehicle condition, scratches, dents, accessories handed..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="start-ride-notes"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-md">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-md bg-emerald-600 hover:bg-emerald-700"
              data-testid="start-ride-submit"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting...</>
              ) : (
                <><Play className="mr-2 h-4 w-4" /> Start Ride</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
