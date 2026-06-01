import { useState, useRef } from "react";
import { Play, Gauge, Fuel, Camera, StickyNote, Loader2, X, ImagePlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { api, formatApiErrorDetail } from "../lib/api";
import { toast } from "sonner";

const FUEL_LEVELS = ["Full", "3/4", "1/2", "1/4", "Empty"];
const MAX_PHOTOS = 10;

export default function StartRideDialog({ booking, open, onOpenChange, onSuccess }) {
  const [odometer, setOdometer] = useState("");
  const [fuelLevel, setFuelLevel] = useState("Full");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState([]); // { file, preview, url, uploading, error }
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

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

    // Upload each photo
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

  const anyUploading = photos.some((p) => p.uploading);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!odometer || parseFloat(odometer) < 0) {
      toast.error("Please enter a valid odometer reading");
      return;
    }
    if (anyUploading) {
      toast.error("Please wait for photos to finish uploading");
      return;
    }
    setLoading(true);
    try {
      const photoUrls = photos.filter((p) => p.url).map((p) => p.url);
      await api.post(`/admin/bookings/${booking.id}/start-ride`, {
        odometer_start: parseFloat(odometer),
        fuel_level_start: fuelLevel,
        photo_urls: photoUrls,
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="start-ride-dialog">
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

          {/* Car Condition Photos */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Camera className="h-3.5 w-3.5 text-slate-500" />
              Car Condition Photos <span className="text-xs text-slate-400">(up to {MAX_PHOTOS})</span>
            </Label>

            {/* Drop zone */}
            <div
              className="relative flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 p-4 transition-colors hover:border-emerald-400 hover:bg-emerald-50/30"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              data-testid="start-ride-photo-dropzone"
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
                data-testid="start-ride-photo-input"
              />
            </div>

            {/* Photo previews */}
            {photos.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {photos.map((photo, idx) => (
                  <div
                    key={photo.preview}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                  >
                    <img
                      src={photo.preview}
                      alt={`Car photo ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    {/* Upload overlay */}
                    {photo.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    )}
                    {/* Error overlay */}
                    {photo.error && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-900/40">
                        <p className="text-[10px] font-medium text-white">Failed</p>
                      </div>
                    )}
                    {/* Remove button */}
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
                    {/* Success checkmark */}
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
              disabled={loading || anyUploading}
              className="rounded-md bg-emerald-600 hover:bg-emerald-700"
              data-testid="start-ride-submit"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting...</>
              ) : anyUploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
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
