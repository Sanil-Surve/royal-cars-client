import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Car,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Eye,
  X,
  ExternalLink,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "../components/ui/card";
import StatusBadge from "../components/StatusBadge";
import { api, formatINR } from "../lib/api";
import { toast } from "sonner";

const KYC_DOC_LABELS = {
  dl_front: "Driving Licence (Front)",
  dl_back: "Driving Licence (Back)",
  aadhar_front: "Aadhaar (Front)",
  aadhar_back: "Aadhaar (Back)",
  rent_agreement: "Rent Agreement",
  light_bill: "Electricity Bill",
};

function kycStatusIcon(status) {
  if (status === "approved")
    return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  if (status === "rejected")
    return <XCircle className="h-4 w-4 text-red-500" />;
  return <Clock className="h-4 w-4 text-amber-400" />;
}

function kycBadgeClass(status) {
  if (status === "approved")
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (status === "rejected")
    return "bg-red-50 text-red-700 border border-red-200";
  return "bg-amber-50 text-amber-700 border border-amber-200";
}

function overallKycBadge(status) {
  if (status === "approved")
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (status === "rejected")
    return "bg-red-50 text-red-700 border border-red-200";
  if (status === "pending")
    return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-slate-100 text-slate-500 border border-slate-200";
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isPdf(doc) {
  return (
    doc.content_type === "application/pdf" ||
    doc.resource_type === "raw" ||
    (doc.file_url && doc.file_url.toLowerCase().includes(".pdf"))
  );
}

/* ── Document Viewer Modal ── */
function DocViewerModal({ doc, onClose }) {
  const label = KYC_DOC_LABELS[doc.document_type] || doc.document_type;
  const pdf = isPdf(doc);

  // Close on backdrop click or Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* Modal panel */}
        <motion.div
          className="relative z-10 flex w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
          style={{ maxHeight: "90vh" }}
          initial={{ scale: 0.94, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <FileText className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <p className="font-semibold text-[#0A192F] leading-tight">{label}</p>
                <div
                  className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${kycBadgeClass(
                    doc.verification_status
                  )}`}
                >
                  {kycStatusIcon(doc.verification_status)}
                  <span className="capitalize">{doc.verification_status}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Open</span>
              </a>
              <a
                href={doc.file_url}
                download
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                title="Download"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center min-h-0">
            {doc.file_url ? (
              pdf ? (
                <iframe
                  src={doc.file_url}
                  title={label}
                  className="h-full w-full"
                  style={{ minHeight: "60vh" }}
                />
              ) : (
                <div className="p-4 flex items-center justify-center">
                  <img
                    src={doc.file_url}
                    alt={label}
                    className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-md"
                  />
                </div>
              )
            ) : (
              <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
                <FileText className="h-10 w-10" />
                <p className="text-sm">No file URL available</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function AdminCustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [kycDocs, setKycDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingDoc, setViewingDoc] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/admin/customers/${id}`);
        setCustomer(data.customer);
        setBookings(data.bookings);
        setKycDocs(data.kyc_documents);
      } catch {
        toast.error("Failed to load customer details");
        navigate("/admin/customers");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F6FA]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0A192F] border-t-transparent" />
          <p className="text-sm text-slate-500">Loading customer…</p>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  const initials = customer.name
    ? customer.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const kycLabel =
    customer.kyc_status === "approved"
      ? "KYC Approved"
      : customer.kyc_status === "rejected"
      ? "KYC Rejected"
      : customer.kyc_status === "pending"
      ? "KYC Pending"
      : "KYC Not Submitted";

  /* ── Sidebar content ── */
  const StatsContent = () => (
    <>
      {/* Account Overview */}
      <Card className="rounded-xl border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-heading text-base font-semibold text-[#0A192F]">
          Account Overview
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Car className="h-4 w-4 text-slate-400" />
              Total Bookings
            </div>
            <span className="font-heading text-lg font-bold text-[#0A192F]">
              {customer.booking_count ?? bookings.length}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CreditCard className="h-4 w-4 text-slate-400" />
              Total Spent
            </div>
            <span className="font-heading text-lg font-bold text-[#0A192F]">
              {formatINR(customer.total_spent || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="h-4 w-4 text-slate-400" />
              Member Since
            </div>
            <span className="text-sm font-medium text-[#0A192F]">
              {formatDate(customer.created_at)}
            </span>
          </div>
        </div>
      </Card>

      {/* KYC Documents — each row is clickable */}
      <Card className="rounded-xl border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-heading text-base font-semibold text-[#0A192F]">
          KYC Documents
        </h2>
        {kycDocs.length === 0 ? (
          <p className="text-sm text-slate-400">No documents uploaded.</p>
        ) : (
          <ul className="space-y-2">
            {kycDocs.map((doc) => (
              <li key={doc.id}>
                <button
                  onClick={() => setViewingDoc(doc)}
                  className="w-full flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-left hover:border-slate-300 hover:bg-slate-100 transition-all group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isPdf(doc) ? (
                      <FileText className="h-4 w-4 shrink-0 text-red-400" />
                    ) : (
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded border border-slate-200 bg-white">
                        <img
                          src={doc.file_url}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    <span className="truncate text-sm font-medium text-slate-700">
                      {KYC_DOC_LABELS[doc.document_type] || doc.document_type}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <div
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${kycBadgeClass(
                        doc.verification_status
                      )}`}
                    >
                      {kycStatusIcon(doc.verification_status)}
                      <span className="capitalize hidden sm:inline">
                        {doc.verification_status}
                      </span>
                    </div>
                    <Eye className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      {/* ── Top Header ── */}
      <div className="border-b border-slate-200 bg-white px-4 py-3 md:px-8 md:py-4">
        <div className="mx-auto max-w-6xl">
          {/* Mobile header */}
          <div className="flex items-center justify-between md:hidden">
            <button
              onClick={() => navigate("/admin/customers")}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#0A192F] transition-colors"
              data-testid="back-to-customers"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>Back</span>
            </button>

            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium leading-none">
                Directory
              </p>
              <h1 className="font-heading text-lg font-bold text-[#0A192F] leading-tight">
                Customer
              </h1>
            </div>

            <div className="w-16" />
          </div>

          {/* Desktop header */}
          <div className="hidden md:flex md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/admin/customers")}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#0A192F] transition-colors"
                data-testid="back-to-customers-desktop"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Customers
              </button>
              <div className="h-5 w-px bg-slate-200" />
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">
                  Directory
                </p>
                <h1 className="font-heading text-2xl font-bold text-[#0A192F]">
                  {customer.name}
                </h1>
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${overallKycBadge(
                customer.kyc_status
              )}`}
            >
              {kycLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ── Page Body ── */}
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          {/* ── LEFT COLUMN ── */}
          <motion.div
            className="space-y-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* Profile Card */}
            <Card className="rounded-xl border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-heading text-base font-semibold text-[#0A192F]">
                Customer Profile
              </h2>

              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0A192F] to-slate-500 text-lg font-bold text-white">
                  {initials}
                </div>
                <div>
                  <p className="font-semibold text-[#0A192F] text-lg leading-tight">
                    {customer.name || "—"}
                  </p>
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${overallKycBadge(
                      customer.kyc_status
                    )}`}
                  >
                    {customer.kyc_status === "approved" ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : customer.kyc_status === "rejected" ? (
                      <XCircle className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {kycLabel}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
                <div className="min-w-0">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Email
                  </p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="break-all">{customer.email || "—"}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Phone
                  </p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>{customer.phone || "—"}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Joined
                  </p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>{formatDate(customer.created_at)}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Sidebar inline on mobile */}
            <div className="space-y-5 lg:hidden">
              <StatsContent />
            </div>

            {/* Booking History */}
            <Card className="rounded-xl border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <h2 className="font-heading text-base font-semibold text-[#0A192F]">
                  Booking History
                  {bookings.length > 0 && (
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">
                      {bookings.length}
                    </span>
                  )}
                </h2>
              </div>

              {bookings.length === 0 ? (
                <div className="px-5 pb-6 text-sm text-slate-400 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  No bookings yet.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {bookings.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-start justify-between gap-3 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/admin/bookings/${b.id}`)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[#0A192F] truncate">
                          {b.vehicle_name || "—"}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {b.pickup_date} → {b.dropoff_date}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-700 md:hidden">
                          {formatINR(b.total_amount || 0)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="hidden text-sm font-medium text-[#0A192F] md:block">
                          {formatINR(b.total_amount || 0)}
                        </span>
                        <StatusBadge status={b.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </motion.div>

          {/* ── RIGHT COLUMN (desktop sidebar) ── */}
          <motion.div
            className="hidden space-y-5 lg:block"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <StatsContent />
          </motion.div>
        </div>
      </div>

      {/* ── Document Viewer Modal ── */}
      {viewingDoc && (
        <DocViewerModal doc={viewingDoc} onClose={() => setViewingDoc(null)} />
      )}
    </div>
  );
}
