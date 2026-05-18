import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck, Clock, MapPin, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";

export default function Home() {
  const [locations, setLocations] = useState([]);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [dropoffDate, setDropoffDate] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/locations").then((r) => {
      setLocations(r.data);
      if (r.data[0]) {
        setPickup(r.data[0].id);
        setDropoff(r.data[0].id);
      }
    });
  }, []);

  const onSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (pickup) params.set("pickup", pickup);
    if (dropoff) params.set("dropoff", dropoff);
    if (pickupDate) params.set("pickupDate", pickupDate);
    if (dropoffDate) params.set("dropoffDate", dropoffDate);
    navigate(`/vehicles?${params.toString()}`);
  };

  return (
    <div>
      <Navbar />
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1767800890927-aebbe5540d61?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwyfHxsdXh1cnklMjBjYXIlMjBzaG93cm9vbSUyMGRhcmt8ZW58MHx8fHwxNzc2NzY1MTYwfDA&ixlib=rb-4.1.0&q=85)',
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A192F]/90 via-[#0A192F]/70 to-[#0A192F]/30" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 pb-28 pt-24 text-white lg:pt-32">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#D4AF37]">
              <Sparkles className="h-3 w-3" /> Premium fleet. Navi Mumbai.
            </div>
            <h1 className="font-heading text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl" data-testid="hero-title">
              Drive something <span className="italic text-[#D4AF37]">royal</span>.
            </h1>
            <p className="mt-6 max-w-xl text-base text-white/80 sm:text-lg">
              Hand-picked SUVs, sedans & hatchbacks for your next journey. Transparent pricing,
              verified KYC, and pickup right outside the mall.
            </p>
          </motion.div>

          {/* Search card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            <Card className="relative mt-12 max-w-5xl rounded-xl border-slate-200 bg-white p-6 shadow-xl" data-testid="home-search-card">
              <form onSubmit={onSearch} className="grid gap-4 md:grid-cols-5">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-slate-500">Pickup</label>
                  <Select value={pickup} onValueChange={setPickup}>
                    <SelectTrigger className="h-11 rounded-md" data-testid="home-pickup-select">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-slate-500">Drop-off</label>
                  <Select value={dropoff} onValueChange={setDropoff}>
                    <SelectTrigger className="h-11 rounded-md" data-testid="home-dropoff-select">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-slate-500">Pickup date</label>
                  <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className="h-11 rounded-md" data-testid="home-pickup-date" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-slate-500">Drop-off date</label>
                  <Input type="date" value={dropoffDate} onChange={(e) => setDropoffDate(e.target.value)} className="h-11 rounded-md" data-testid="home-dropoff-date" />
                </div>
                <div className="md:col-span-5 flex justify-end">
                  <Button type="submit" className="h-11 rounded-md bg-[#0A192F] px-8 text-white hover:bg-[#0A192F]/90" data-testid="home-search-btn">
                    Search vehicles <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Value props */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "Verified & insured", desc: "Every car documented and sanitised before handover." },
              { icon: Clock, title: "Book in minutes", desc: "Simple 5-step flow. Pay 20% now, rest at pickup." },
              { icon: MapPin, title: "Two mall pickups", desc: "Little World Kharghar & Orion Panvel — central & easy." },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="h-full rounded-lg border border-slate-200 bg-white p-6 card-hover" data-testid={`value-prop-${i}`}>
                  <f.icon className="h-6 w-6 text-[#D4AF37]" />
                  <h3 className="mt-4 font-heading text-xl text-[#0A192F]">{f.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-[#0A192F] py-10 text-center text-sm text-white/60">
        <div className="mx-auto max-w-7xl px-6">
          <div className="font-heading text-2xl text-white">Royal Cars</div>
          <div className="mt-2">© {new Date().getFullYear()} — Kharghar · Panvel</div>
          <div className="mt-4 flex items-center justify-center gap-4">
            <Link to="/vehicles" className="hover:text-[#D4AF37]">Browse fleet</Link>
            <span>·</span>
            <Link to="/login" className="hover:text-[#D4AF37]">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
