import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Switch } from "../components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { api, formatApiErrorDetail } from "../lib/api";
import { toast } from "sonner";

export default function AdminLocations() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", is_active: true });

  const load = async () => {
    const { data } = await api.get("/locations");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await api.post("/locations", form);
      toast.success("Location added");
      setForm({ name: "", address: "", is_active: true });
      setOpen(false);
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Deactivate this location?")) return;
    await api.delete(`/locations/${id}`);
    load();
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">Network</div>
          <h1 className="font-heading text-3xl font-bold text-[#0A192F]" data-testid="admin-locations-title">Pickup locations</h1>
        </div>
        <Button onClick={() => setOpen(true)} className="rounded-md bg-[#0A192F] text-white" data-testid="admin-add-location-btn">
          <Plus className="mr-2 h-4 w-4" /> Add location
        </Button>
      </div>

      <Card className="rounded-lg border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((l) => (
              <TableRow key={l.id} data-testid={`location-row-${l.id}`}>
                <TableCell className="font-medium">{l.name}</TableCell>
                <TableCell className="text-slate-600">{l.address}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => remove(l.id)} data-testid={`delete-location-${l.id}`}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add location</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-500">Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" data-testid="location-name-input" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-500">Address</label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1" data-testid="location-address-input" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <span className="text-sm">Active</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-md">Cancel</Button>
            <Button onClick={save} className="rounded-md bg-[#0A192F] text-white" data-testid="location-save-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
