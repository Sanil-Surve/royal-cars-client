import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Upload, FileText, CheckCircle2, XCircle, Clock } from "lucide-react";
import Navbar from "../components/Navbar";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { api, formatApiErrorDetail } from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const DOCS = [
  { key: "dl_front", label: "Driving License — Front" },
  { key: "dl_back", label: "Driving License — Back" },
  { key: "aadhar_front", label: "Aadhar — Front" },
  { key: "aadhar_back", label: "Aadhar — Back" },
  { key: "rent_agreement", label: "Rent Agreement" },
  { key: "light_bill", label: "Electricity / Light Bill" },
];

export default function KYCUpload() {
  const [docs, setDocs] = useState([]);
  const [kycStatus, setKycStatus] = useState("not_submitted");
  const [uploading, setUploading] = useState("");
  const { refreshMe } = useAuth();
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const load = async () => {
    const { data } = await api.get("/kyc/my");
    setDocs(data.documents);
    setKycStatus(data.kyc_status);
  };
  useEffect(() => { load(); }, []);

  const docFor = (key) => docs.find((d) => d.document_type === key);

  const onFile = async (key, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }
    setUploading(key);
    try {
      const fd = new FormData();
      fd.append("document_type", key);
      fd.append("file", file);
      await api.post("/kyc/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      await load();
      await refreshMe();
      toast.success(`Uploaded ${key.replace("_", " ")}`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setUploading("");
    }
  };

  const allUploaded = DOCS.every((d) => docFor(d.key));

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-[#0A192F] sm:text-4xl" data-testid="kyc-page-title">KYC documents</h1>
            <p className="mt-1 text-sm text-slate-600">Upload clear JPG/PNG/PDF scans. Fleet team verifies within hours.</p>
          </div>
          <StatusBadge status={kycStatus} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {DOCS.map((d) => {
            const existing = docFor(d.key);
            return <DocCard key={d.key} doc={d} existing={existing} uploading={uploading === d.key} onFile={(f) => onFile(d.key, f)} />;
          })}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <Link to="/dashboard" className="text-sm text-slate-600 underline" data-testid="kyc-back-link">Back to dashboard</Link>
          {sp.get("from") === "book" && (
            <Button onClick={() => navigate("/dashboard")} disabled={!allUploaded} className="rounded-md bg-[#0A192F] text-white" data-testid="kyc-done-btn">
              {allUploaded ? "I'm done — go to bookings" : `Upload all ${DOCS.length} documents`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function DocCard({ doc, existing, uploading, onFile }) {
  const ref = useRef();
  const statusIcon = existing?.verification_status === "approved" ? (
    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
  ) : existing?.verification_status === "rejected" ? (
    <XCircle className="h-4 w-4 text-red-600" />
  ) : existing ? (
    <Clock className="h-4 w-4 text-amber-600" />
  ) : null;

  return (
    <Card className="rounded-lg border-slate-200 p-5" data-testid={`kyc-doc-${doc.key}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 font-heading text-base text-[#0A192F]">
            <FileText className="h-4 w-4 text-slate-500" /> {doc.label}
          </div>
          {existing && (
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              {statusIcon}
              <span>Status: {existing.verification_status}</span>
            </div>
          )}
          {existing?.admin_notes && <div className="mt-1 text-xs text-red-600">Notes: {existing.admin_notes}</div>}
        </div>
      </div>
      <div
        className="dropzone mt-4 text-center"
        onClick={() => ref.current?.click()}
      >
        <Upload className="mx-auto h-6 w-6 text-slate-400" />
        <div className="mt-2 text-sm text-slate-600">
          {uploading ? "Uploading..." : existing ? "Replace document" : "Click to upload (JPG/PNG/PDF)"}
        </div>
        <input
          ref={ref}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
          data-testid={`kyc-input-${doc.key}`}
        />
      </div>
    </Card>
  );
}
