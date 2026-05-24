import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Fuel,
  Users,
  Settings2
} from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { api, formatINR } from "../lib/api";

export default function Home() {
  const [locations, setLocations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [dropoffDate, setDropoffDate] = useState("");
  const navigate = useNavigate();
  const carouselRef = useRef(null);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const scroll = (direction) => {
    if (carouselRef.current) {
      const { scrollLeft, clientWidth } = carouselRef.current;
      const scrollTo = direction === "left" 
        ? scrollLeft - clientWidth * 0.75 
        : scrollLeft + clientWidth * 0.75;
      carouselRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  useEffect(() => {
    api.get("/locations").then((r) => {
      setLocations(r.data);
      if (r.data[0]) {
        setPickup(r.data[0].id);
        setDropoff(r.data[0].id);
      }
    });

    setLoadingVehicles(true);
    api.get("/vehicles")
      .then((r) => {
        setVehicles(r.data);
        setLoadingVehicles(false);
      })
      .catch(() => {
        setLoadingVehicles(false);
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
                  <Input 
                    type="date" 
                    value={pickupDate} 
                    min={todayStr}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPickupDate(val);
                      if (dropoffDate && val && val > dropoffDate) {
                        setDropoffDate("");
                      }
                    }} 
                    className="h-11 rounded-md" 
                    data-testid="home-pickup-date" 
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-slate-500">Drop-off date</label>
                  <Input 
                    type="date" 
                    value={dropoffDate} 
                    min={pickupDate || todayStr}
                    onChange={(e) => setDropoffDate(e.target.value)} 
                    className="h-11 rounded-md" 
                    data-testid="home-dropoff-date" 
                  />
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

      {/* Featured Fleet Carousel */}
      <section className="bg-slate-50 py-20 relative overflow-hidden">
        <style>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
        
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">Our Collection</div>
              <h2 className="font-heading text-3xl font-bold text-[#0A192F] sm:text-4xl mt-1">Our Royal Fleet</h2>
              <p className="mt-2 text-sm text-slate-600">Premium quality vehicles ready for any occasion.</p>
            </div>
            <Link 
              to="/vehicles" 
              className="group hidden sm:flex items-center gap-2 text-sm font-semibold text-[#0A192F] hover:text-[#D4AF37] transition"
            >
              View All Fleet <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Carousel container with relative positioning and fading masks */}
        <div className="relative group/carousel max-w-7xl mx-auto px-4 md:px-6">
          
          {/* Gradient Masks */}
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-slate-50 via-slate-50/50 to-transparent pointer-events-none z-10 hidden md:block" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-50 via-slate-50/50 to-transparent pointer-events-none z-10 hidden md:block" />

          {/* Navigation Arrows */}
          <button
            onClick={() => scroll("left")}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-20 h-11 w-11 bg-white/90 hover:bg-white text-[#0A192F] rounded-full flex items-center justify-center shadow-md border border-slate-200/80 transition-all opacity-0 group-hover/carousel:opacity-100 hover:scale-105 hidden md:flex"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => scroll("right")}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-20 h-11 w-11 bg-white/90 hover:bg-white text-[#0A192F] rounded-full flex items-center justify-center shadow-md border border-slate-200/80 transition-all opacity-0 group-hover/carousel:opacity-100 hover:scale-105 hidden md:flex"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Scrollable area */}
          <div
            ref={carouselRef}
            className="flex gap-6 overflow-x-auto pb-4 pt-2 snap-x snap-mandatory no-scrollbar px-2 md:px-10"
          >
            {loadingVehicles ? (
              <div className="w-full py-20 text-center text-slate-500">Loading our fleet...</div>
            ) : vehicles.length === 0 ? (
              <div className="w-full py-20 text-center text-slate-500">No vehicles available at the moment.</div>
            ) : (
              vehicles.map((v) => (
                <div 
                  key={v.id} 
                  className="min-w-[290px] sm:min-w-[340px] snap-start"
                >
                  <Card className="group/card overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 h-full flex flex-col">
                    <div className="aspect-[16/10] overflow-hidden bg-slate-100 relative">
                      <img 
                        src={v.image_urls?.[0]} 
                        alt={v.name} 
                        className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105" 
                      />
                      <span className="absolute top-3 left-3 bg-[#0A192F] text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-md shadow-sm">
                        {v.type || "Luxury"}
                      </span>
                    </div>
                    
                    <div className="flex flex-col flex-1 p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-heading text-lg sm:text-xl font-bold text-[#0A192F] group-hover/card:text-[#D4AF37] transition-colors">{v.name}</h3>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-heading text-xl font-bold text-[#0A192F]">{formatINR(v.price_per_24hrs)}</div>
                          <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">per 24 hrs</div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-b border-slate-100 py-3 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5 justify-center"><Fuel className="h-3.5 w-3.5 text-[#D4AF37]" /> {v.fuel_type}</span>
                        <span className="inline-flex items-center gap-1.5 justify-center border-x border-slate-100"><Users className="h-3.5 w-3.5 text-[#D4AF37]" /> {v.seats} Seats</span>
                        <span className="inline-flex items-center gap-1.5 justify-center"><Settings2 className="h-3.5 w-3.5 text-[#D4AF37]" /> {v.transmission}</span>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-4">
                        <div className="text-xs text-slate-500">
                          Refundable Deposit <span className="font-semibold text-slate-700">{formatINR(v.deposit_amount)}</span>
                        </div>
                        <Button 
                          onClick={() => {
                            const qs = new URLSearchParams();
                            qs.set("vehicleId", v.id);
                            navigate(`/book?${qs.toString()}`);
                          }} 
                          className="rounded-xl bg-[#0A192F] text-white hover:bg-[#D4AF37] hover:text-[#0A192F] transition-all duration-300 font-medium px-5"
                        >
                          Book Now
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 text-center mt-10 sm:hidden">
          <Link 
            to="/vehicles" 
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A192F] hover:text-[#D4AF37] transition"
          >
            View All Fleet <ArrowRight className="h-4 w-4" />
          </Link>
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
      <footer className="border-t border-white/10 bg-[#0A192F] py-12 text-sm text-white/60">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-3 text-center md:text-left">
            <div>
              <div className="font-heading text-2xl font-bold text-white tracking-wide">Royal Cars</div>
              <p className="mt-3 text-xs text-white/40 leading-relaxed max-w-xs mx-auto md:mx-0">
                Premium hand-picked fleet in Navi Mumbai. Experience premium comfort and hassle-free booking.
              </p>
              <div className="mt-4 text-xs text-white/40">
                © {new Date().getFullYear()} Royal Cars. All rights reserved.
              </div>
            </div>
            
            <div>
              <h3 className="text-white font-semibold uppercase tracking-wider text-xs">Quick Links</h3>
              <div className="mt-4 flex flex-col gap-2.5">
                <Link to="/vehicles" className="hover:text-[#D4AF37] transition">Browse Fleet</Link>
                <Link to="/login" className="hover:text-[#D4AF37] transition">Sign In</Link>
              </div>
            </div>
            
            <div>
              <h3 className="text-white font-semibold uppercase tracking-wider text-xs">Contact Us</h3>
              <div className="mt-4 flex flex-col gap-2 md:items-start items-center">
                <p className="text-white/80 font-medium">Sagar Putharan</p>
                <a href="mailto:Puthran999.spk@gmail.com" className="hover:text-[#D4AF37] transition">
                  Puthran999.spk@gmail.com
                </a>
                <a href="tel:+919892805777" className="hover:text-[#D4AF37] transition">
                  +91 98928 05777
                </a>
                <p className="text-xs text-white/40 mt-1">Kharghar · Panvel</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
