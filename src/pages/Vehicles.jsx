import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Fuel, Users, Settings2 } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { api, formatINR } from "../lib/api";

export default function Vehicles() {
  const [sp, setSp] = useSearchParams();
  const [locations, setLocations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const pickup = sp.get("pickup") || "";
  const dropoff = sp.get("dropoff") || "";
  const pickupDate = sp.get("pickupDate") || "";
  const dropoffDate = sp.get("dropoffDate") || "";
  const fuel = sp.get("fuel") || "all";

  useEffect(() => {
    api.get("/locations").then((r) => setLocations(r.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (pickup) params.location_id = pickup;
    api.get("/vehicles", { params }).then((r) => {
      let items = r.data;
      if (fuel !== "all") items = items.filter((v) => v.fuel_type === fuel);
      setVehicles(items);
      setLoading(false);
    });
  }, [pickup, fuel]);

  const updateParam = (k, v) => {
    const next = new URLSearchParams(sp);
    if (v) next.set(k, v);
    else next.delete(k);
    setSp(next);
  };

  const book = (vehicle) => {
    const qs = new URLSearchParams();
    qs.set("vehicleId", vehicle.id);
    if (pickup) qs.set("pickup", pickup);
    if (dropoff) qs.set("dropoff", dropoff);
    if (pickupDate) qs.set("pickupDate", pickupDate);
    if (dropoffDate) qs.set("dropoffDate", dropoffDate);
    navigate(`/book?${qs.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-[#0A192F] sm:text-4xl" data-testid="vehicles-page-title">Browse the fleet</h1>
            <p className="mt-1 text-sm text-slate-600">Curated cars, clear pricing per 24 hours.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={pickup || "all"} onValueChange={(v) => updateParam("pickup", v === "all" ? "" : v)}>
              <SelectTrigger className="h-10 w-60 rounded-md" data-testid="filter-location">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fuel} onValueChange={(v) => updateParam("fuel", v === "all" ? "" : v)}>
              <SelectTrigger className="h-10 w-40 rounded-md" data-testid="filter-fuel">
                <SelectValue placeholder="Fuel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All fuels</SelectItem>
                <SelectItem value="Petrol">Petrol</SelectItem>
                <SelectItem value="Diesel">Diesel</SelectItem>
                <SelectItem value="Petrol + CNG">Petrol + CNG</SelectItem>
                <SelectItem value="Electric">Electric</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500" data-testid="vehicles-loading">Loading fleet...</div>
        ) : vehicles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500" data-testid="vehicles-empty">
            No vehicles match your filters.
          </div>
        ) : (
          <motion.div 
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
          >
            {vehicles.map((v) => (
              <motion.div 
                key={v.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 }
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <Card className="group overflow-hidden rounded-lg border-slate-200 bg-white card-hover h-full flex flex-col" data-testid={`vehicle-card-${v.id}`}>
                  <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                    <img src={v.image_urls?.[0]} alt={v.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                  </div>
                  <div className="flex flex-col flex-1 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs uppercase tracking-widest text-slate-500">{v.type}</div>
                        <h3 className="font-heading text-xl text-[#0A192F]">{v.name}</h3>
                      </div>
                      <div className="text-right">
                        <div className="font-heading text-2xl text-[#0A192F]">{formatINR(v.price_per_24hrs)}</div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-500">per 24 hrs</div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-4 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1"><Fuel className="h-3.5 w-3.5" /> {v.fuel_type}</span>
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {v.seats} seats</span>
                      <span className="inline-flex items-center gap-1"><Settings2 className="h-3.5 w-3.5" /> {v.transmission}</span>
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        Deposit {formatINR(v.deposit_amount)}
                        {v.overtime_rate_per_hour ? <span className="ml-2">· O/T {formatINR(v.overtime_rate_per_hour)}/hr</span> : null}
                      </div>
                      <Button onClick={() => book(v)} className="rounded-md bg-[#0A192F] text-white hover:bg-[#0A192F]/90" data-testid={`vehicle-book-${v.id}`}>
                        Book now
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
}
