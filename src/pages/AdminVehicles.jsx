import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Edit3, Upload } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { api, formatINR, formatApiErrorDetail } from "../lib/api";
import { toast } from "sonner";

const EMPTY = {
  name: "", type: "SUV", fuel_type: "Petrol", image_urls: [],
  price_per_24hrs: 0, deposit_amount: 0, overtime_rate_per_hour: 0, is_available: true,
  location_id: "", description: "", seats: 5, transmission: "Manual",
};

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const load = async () => {
    const [v, l] = await Promise.all([
      api.get("/vehicles", { params: { available_only: false } }),
      api.get("/locations"),
    ]);
    setVehicles(v.data);
    setLocations(l.data);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => { setForm({ ...EMPTY, location_id: locations[0]?.id || "" }); setEditingId(null); setOpen(true); };
  const openEdit = (v) => { setForm({ ...v }); setEditingId(v.id); setOpen(true); };

  const save = async () => {
    try {
      const payload = {
        ...form,
        price_per_24hrs: Number(form.price_per_24hrs),
        deposit_amount: Number(form.deposit_amount),
        overtime_rate_per_hour: Number(form.overtime_rate_per_hour || 0),
        seats: Number(form.seats),
      };
      if (editingId) await api.put(`/vehicles/${editingId}`, payload);
      else await api.post("/vehicles", payload);
      toast.success("Vehicle saved");
      setOpen(false);
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this vehicle?")) return;
    await api.delete(`/vehicles/${id}`);
    toast.success("Deleted");
    load();
  };

  const uploadImage = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload/vehicle-image", fd, { headers: { "Content-Type": "multipart/form-data" } });
      set("image_urls", [...(form.image_urls || []), data.url]);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">Fleet</div>
          <h1 className="font-heading text-3xl font-bold text-[#0A192F]" data-testid="admin-vehicles-title">Vehicles</h1>
        </div>
        <Button onClick={openNew} className="rounded-md bg-[#0A192F] text-white" data-testid="admin-add-vehicle-btn">
          <Plus className="mr-2 h-4 w-4" /> Add vehicle
        </Button>
      </div>

      <Card className="rounded-lg border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Fuel</TableHead>
              <TableHead>Price / 24hr</TableHead>
              <TableHead>Deposit</TableHead>
              <TableHead>O/T /hr</TableHead>
              <TableHead>Available</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((v) => (
              <TableRow key={v.id} data-testid={`admin-vehicle-row-${v.id}`}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {v.image_urls?.[0] && <img src={v.image_urls[0]} alt="" className="h-10 w-14 rounded object-cover" />}
                    <div className="font-medium">{v.name}</div>
                  </div>
                </TableCell>
                <TableCell>{v.type}</TableCell>
                <TableCell>{v.fuel_type}</TableCell>
                <TableCell>{formatINR(v.price_per_24hrs)}</TableCell>
                <TableCell>{formatINR(v.deposit_amount)}</TableCell>
                <TableCell>{formatINR(v.overtime_rate_per_hour || 0)}</TableCell>
                <TableCell>{v.is_available ? "Yes" : "No"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(v)} data-testid={`edit-vehicle-${v.id}`}><Edit3 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(v.id)} data-testid={`delete-vehicle-${v.id}`}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {vehicles.length === 0 && (
              <TableRow><TableCell colSpan={8} className="py-8 text-center text-slate-500">No vehicles yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit vehicle" : "Add vehicle"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="vehicle-name-input" /></Field>
            <Field label="Type">
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger data-testid="vehicle-type-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUV">SUV</SelectItem>
                  <SelectItem value="Sedan">Sedan</SelectItem>
                  <SelectItem value="Hatchback">Hatchback</SelectItem>
                  <SelectItem value="MPV">MPV</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Fuel type">
              <Select value={form.fuel_type} onValueChange={(v) => set("fuel_type", v)}>
                <SelectTrigger data-testid="vehicle-fuel-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Petrol">Petrol</SelectItem>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="Petrol + CNG">Petrol + CNG</SelectItem>
                  <SelectItem value="Electric">Electric</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Transmission">
              <Select value={form.transmission} onValueChange={(v) => set("transmission", v)}>
                <SelectTrigger data-testid="vehicle-trans-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manual">Manual</SelectItem>
                  <SelectItem value="Automatic">Automatic</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Price per 24 hrs (₹)"><Input type="number" value={form.price_per_24hrs} onChange={(e) => set("price_per_24hrs", e.target.value)} data-testid="vehicle-price-input" /></Field>
            <Field label="Deposit (₹)"><Input type="number" value={form.deposit_amount} onChange={(e) => set("deposit_amount", e.target.value)} data-testid="vehicle-deposit-input" /></Field>
            <Field label="Overtime rate (₹ / hour)"><Input type="number" value={form.overtime_rate_per_hour} onChange={(e) => set("overtime_rate_per_hour", e.target.value)} data-testid="vehicle-overtime-input" /></Field>
            <Field label="Seats"><Input type="number" value={form.seats} onChange={(e) => set("seats", e.target.value)} /></Field>
            <Field label="Location">
              <Select value={form.location_id} onValueChange={(v) => set("location_id", v)}>
                <SelectTrigger data-testid="vehicle-location-select"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <Textarea value={form.description || ""} onChange={(e) => set("description", e.target.value)} rows={2} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs uppercase tracking-widest text-slate-500">Images</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {form.image_urls?.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt="" className="h-20 w-28 rounded object-cover" />
                    <button type="button" onClick={() => set("image_urls", form.image_urls.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded bg-white/90 p-0.5 text-xs">✕</button>
                  </div>
                ))}
                <button type="button" onClick={() => fileRef.current?.click()} className="dropzone inline-flex h-20 w-28 flex-col items-center justify-center text-xs">
                  <Upload className="h-4 w-4" /> {uploading ? "..." : "Upload"}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0])} data-testid="vehicle-image-input" />
              </div>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch checked={form.is_available} onCheckedChange={(v) => set("is_available", v)} data-testid="vehicle-available-switch" />
              <span className="text-sm">Available for booking</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-md">Cancel</Button>
            <Button onClick={save} className="rounded-md bg-[#0A192F] text-white" data-testid="vehicle-save-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-slate-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
