import { useState, useEffect, useRef } from "react";
import { Square, Gauge, Fuel, Camera, StickyNote, Loader2, AlertTriangle, IndianRupee, X, ImagePlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { api, formatApiErrorDetail, formatINR } from "../lib/api";
import { toast } from "sonner";

const MAX_PHOTOS = 10;

function fuelColor(pct) {
  if (pct >= 60) return "#22c55e";
  if (pct >= 30) return "#f59e0b";
  return "#ef4444";
}

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
  const [fuelLevel, setFuelLevel] = useState(100); // numeric 0-100
  const [notes, setNotes] = useState("");
  const [extraCharges, setExtraCharges] = useState("0");
  const [extraReason, setExtraReason] = useState("");
  const [photos, setPhotos] = useState([]); // { file, preview, url, uploading, error }
  const [odometerPhoto, setOdometerPhoto] = useState(null); // { file, preview, url, uploading, error }
  const [loading, setLoading] = useState(false);
  const [overtime, setOvertime] = useState(false);
  const fileInputRef = useRef(null);
  const odometerInputRef = useRef(null);

  useEffect(() => {
    if (booking) {
      setOvertime(isOvertime(booking));
    }
  }, [booking]);

  const kmDriven = odometer && booking?.odometer_start != null
    ? Math.max(0, parseFloat(odometer) - booking.odometer_start).toFixed(1)
    : null;

  const handleFiles = async (files) => {
    const remaining = MAX_PHOTOS - photos.length;
    const toAdd = Array.from(files).slice(0, remaining);
    if (toAdd.length === 0) {
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }

    const newPhotos = toAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      url: null,
      uploading: true,
      error: false,
    }));

    setPhotos((prev) => [...prev, ...newPhotos]);

    for (let i = 0; i < newPhotos.length; i++) {
      const photo = newPhotos[i];
      const formData = new FormData();
      formData.append("file", photo.file);
      try {
        const { data } = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setPhotos((prev) =>
          prev.map((p) =>
            p.preview === photo.preview ? { ...p, url: data.url, uploading: false } : p
          )
        );
      } catch (err) {
        setPhotos((prev) =>
          prev.map((p) =>
            p.preview === photo.preview ? { ...p, uploading: false, error: true } : p
          )
        );
        toast.error(`Failed to upload ${photo.file.name}`);
      }
    }
  };

  const removePhoto = (preview) => {
    setPhotos((prev) => {
      const removed = prev.find((p) => p.preview === preview);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((p) => p.preview !== preview);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer?.files;
    if (files?.length) handleFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // ── Odometer photo helpers ─────────────────────────────────────────────────
  const handleOdometerPhoto = async (file) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setOdometerPhoto({ file, preview, url: null, uploading: true, error: false });
    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data } = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setOdometerPhoto((prev) => ({ ...prev, url: data.url, uploading: false }));
    } catch {
      setOdometerPhoto((prev) => ({ ...prev, uploading: false, error: true }));
      toast.error("Failed to upload odometer photo");
    }
  };

  const removeOdometerPhoto = () => {
    if (odometerPhoto?.preview) URL.revokeObjectURL(odometerPhoto.preview);
    setOdometerPhoto(null);
  };

  const anyUploading = photos.some((p) => p.uploading) || odometerPhoto?.uploading;

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
    if (anyUploading) {
      toast.error("Please wait for photos to finish uploading");
      return;
    }
    setLoading(true);
    try {
      const photoUrls = photos.filter((p) => p.url).map((p) => p.url);
      const result = await api.post(`/admin/bookings/${booking.id}/end-ride`, {
        odometer_end: parseFloat(odometer),
        fuel_level_end: `${Math.min(100, Math.max(0, Number(fuelLevel) || 0))}%`,
        photo_urls: photoUrls,
        odometer_photo_url: odometerPhoto?.url ?? null,
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

  const fuelPct = Math.min(100, Math.max(0, Number(fuelLevel) || 0));
  const handleFuelChange = (e) => {
    const val = e.target.value;
    if (val === "" || (Number(val) >= 0 && Number(val) <= 100)) {
      setFuelLevel(val);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto border-0 shadow-2xl"
        style={{
          background: "rgba(255, 255, 255, 0.82)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.55)",
          boxShadow: "0 8px 40px rgba(10, 25, 47, 0.18), 0 1.5px 0 rgba(255,255,255,0.7) inset",
        }}
        data-testid="end-ride-dialog"
      >
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

          {/* Pickup photos preview (read-only) */}
          {booking?.pickup_photos?.length > 0 && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Camera className="h-3.5 w-3.5 text-slate-500" />
                Pickup Condition Photos
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {booking.pickup_photos.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 transition-transform hover:scale-105"
                  >
                    <img src={url} alt={`Pickup photo ${idx + 1}`} className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
              <p className="text-xs text-slate-400">Photos taken at pickup — click to enlarge</p>
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

            {/* Odometer photo uploader */}
            <div className="mt-2">
              <p className="text-xs text-slate-500 mb-1.5">Odometer photo <span className="text-slate-400">(optional)</span></p>
              {odometerPhoto ? (
                <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100" style={{ aspectRatio: "16/7" }}>
                  <img src={odometerPhoto.preview} alt="Odometer" className="h-full w-full object-cover" />
                  {odometerPhoto.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                  )}
                  {odometerPhoto.error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-900/40">
                      <p className="text-xs font-medium text-white">Upload failed</p>
                    </div>
                  )}
                  {odometerPhoto.url && !odometerPhoto.uploading && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-[10px] font-medium text-white">Uploaded</span>
                    </div>
                  )}
                  {!odometerPhoto.uploading && (
                    <button
                      type="button"
                      onClick={removeOdometerPhoto}
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors"
                      aria-label="Remove odometer photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => odometerInputRef.current?.click()}
                  className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-500 transition-colors hover:border-red-400 hover:bg-red-50/30 hover:text-red-600"
                >
                  <ImagePlus className="h-4 w-4 shrink-0" />
                  <span>Click to add odometer photo</span>
                </button>
              )}
              <input
                ref={odometerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleOdometerPhoto(e.target.files[0]);
                  e.target.value = "";
                }}
                data-testid="end-ride-odometer-photo-input"
              />
            </div>
          </div>


          {/* Fuel Level — manual percentage */}
          <div className="space-y-1.5">
            <Label htmlFor="fuel-level-end" className="flex items-center gap-1.5 text-sm font-medium">
              <Fuel className="h-3.5 w-3.5 text-slate-500" />
              Fuel Level (%)
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  id="fuel-level-end"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  placeholder="e.g. 50"
                  value={fuelLevel}
                  onChange={handleFuelChange}
                  className="rounded-md pr-8"
                  data-testid="end-ride-fuel"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">%</span>
              </div>
              <span
                className="min-w-[3rem] rounded-md px-2 py-1.5 text-center text-sm font-semibold tabular-nums"
                style={{
                  background: `${fuelColor(fuelPct)}22`,
                  color: fuelColor(fuelPct),
                }}
              >
                {fuelPct}%
              </span>
            </div>
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${fuelPct}%`, background: fuelColor(fuelPct) }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {fuelPct >= 80 ? "Full tank" : fuelPct >= 50 ? "Half or above" : fuelPct >= 25 ? "Below half" : fuelPct > 0 ? "Almost empty" : "Empty"}
            </p>
          </div>

          {/* Return Condition Photos */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Camera className="h-3.5 w-3.5 text-slate-500" />
              Return Condition Photos <span className="text-xs text-slate-400">(up to {MAX_PHOTOS})</span>
            </Label>

            <div
              className="relative flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 p-4 transition-colors hover:border-red-400 hover:bg-red-50/30"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              data-testid="end-ride-photo-dropzone"
            >
              <ImagePlus className="mb-2 h-8 w-8 text-slate-400" />
              <p className="text-sm text-slate-500">
                Click or drag photos here
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                JPG, PNG, WEBP • {photos.length}/{MAX_PHOTOS} uploaded
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) handleFiles(e.target.files);
                  e.target.value = "";
                }}
                data-testid="end-ride-photo-input"
              />
            </div>

            {photos.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {photos.map((photo, idx) => (
                  <div
                    key={photo.preview}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                  >
                    <img
                      src={photo.preview}
                      alt={`Return photo ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    {photo.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    )}
                    {photo.error && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-900/40">
                        <p className="text-[10px] font-medium text-white">Failed</p>
                      </div>
                    )}
                    {!photo.uploading && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePhoto(photo.preview);
                        }}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
                        aria-label="Remove photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    {photo.url && !photo.uploading && (
                      <div className="absolute bottom-1 left-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
              disabled={loading || anyUploading}
              className="rounded-md bg-red-600 hover:bg-red-700"
              data-testid="end-ride-submit"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ending...</>
              ) : anyUploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
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
