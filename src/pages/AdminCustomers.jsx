import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPlus,
  Loader2,
  Upload,
  FileText,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import { Card } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { api, formatApiErrorDetail } from "../lib/api";
import StatusBadge from "../components/StatusBadge";

// ─── KYC document definitions ──────────────────────────────────────────────
const KYC_DOCS = [
  { key: "dl_front", label: "Driving License — Front", required: true },
  { key: "dl_back", label: "Driving License — Back", required: true },
  { key: "aadhar_front", label: "Aadhar Card — Front", required: true },
  { key: "aadhar_back", label: "Aadhar Card — Back", required: true },
  { key: "rent_agreement", label: "Rent Agreement", required: false },
  { key: "light_bill", label: "Electricity / Light Bill", required: false },
];

const EMPTY_FORM = { name: "", email: "", phone: "", password: "" };

// ─── Main page ─────────────────────────────────────────────────────────────
export default function AdminCustomers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);

  // Dialog state
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1 = details, 2 = KYC docs

  // Step-1 form
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Step-2 KYC – created customer id
  const [newCustomerId, setNewCustomerId] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState({}); // key → true
  const [uploadingKey, setUploadingKey] = useState(null);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    api.get("/admin/customers").then((r) => setCustomers(r.data));
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function handleFieldChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setCreateError("");
  }

  function closeDialog() {
    setOpen(false);
    setStep(1);
    setForm(EMPTY_FORM);
    setCreating(false);
    setCreateError("");
    setNewCustomerId(null);
    setUploadedDocs({});
    setUploadingKey(null);
    setUploadError("");
  }

  // ── Step 1 — create customer ──────────────────────────────────────────────
  async function handleCreateCustomer(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setCreateError("Name, email and password are required.");
      return;
    }
    if (form.password.length < 6) {
      setCreateError("Password must be at least 6 characters.");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const { data } = await api.post("/admin/customers", {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        password: form.password,
      });
      setCustomers((prev) => [data, ...prev]);
      setNewCustomerId(data.id);
      setStep(2);
    } catch (err) {
      setCreateError(
        formatApiErrorDetail(err?.response?.data?.detail) ||
          "Failed to create customer."
      );
    } finally {
      setCreating(false);
    }
  }

  // ── Step 2 — upload a KYC doc ────────────────────────────────────────────
  async function handleKycFile(docKey, file) {
    if (!file || !newCustomerId) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File too large (max 10 MB).");
      return;
    }
    setUploadingKey(docKey);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("document_type", docKey);
      fd.append("file", file);
      await api.post(`/admin/customers/${newCustomerId}/kyc`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadedDocs((prev) => ({ ...prev, [docKey]: true }));
    } catch (err) {
      setUploadError(
        formatApiErrorDetail(err?.response?.data?.detail) ||
          "Upload failed. Please try again."
      );
    } finally {
      setUploadingKey(null);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">
            Directory
          </div>
          <h1
            className="font-heading text-3xl font-bold text-[#0A192F]"
            data-testid="admin-customers-title"
          >
            Customers
          </h1>
        </div>
        <Button
          id="add-customer-btn"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-[#0A192F] text-white hover:bg-[#112240] transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Customer table */}
      <Card className="rounded-lg border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
              <TableHead className="hidden sm:table-cell">Bookings</TableHead>
              <TableHead className="hidden md:table-cell">KYC</TableHead>
              <TableHead className="hidden md:table-cell">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow
                key={c.id}
                data-testid={`admin-customer-row-${c.id}`}
                className="cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => navigate(`/admin/customers/${c.id}`)}
              >
                <TableCell>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-slate-500 hidden md:block">
                    {c.email}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-slate-600">
                  {c.email}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {c.phone || "—"}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {c.booking_count}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <StatusBadge status={c.kyc_status || "not_submitted"} />
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-slate-500">
                  {c.created_at?.slice(0, 10)}
                </TableCell>
              </TableRow>
            ))}
            {customers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-slate-500"
                >
                  No customers yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ── Add Customer Dialog ── */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-1">
            <StepPip active={step === 1} done={step > 1} label="1" />
            <div className={`h-px flex-1 ${step > 1 ? "bg-[#0A192F]" : "bg-slate-200"}`} />
            <StepPip active={step === 2} done={false} label="2" />
          </div>

          {step === 1 ? (
            /* ── Step 1: customer details ── */
            <>
              <DialogHeader className="mt-2">
                <DialogTitle className="text-[#0A192F] text-xl font-bold">
                  Add Customer
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-sm">
                  Step 1 of 2 — Create the account. You'll upload documents next.
                </DialogDescription>
              </DialogHeader>

              <form
                id="add-customer-form"
                onSubmit={handleCreateCustomer}
                className="space-y-4 py-2"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="cust-name">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cust-name"
                    name="name"
                    placeholder="e.g. Raj Sharma"
                    value={form.name}
                    onChange={handleFieldChange}
                    disabled={creating}
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cust-email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cust-email"
                    name="email"
                    type="email"
                    placeholder="customer@example.com"
                    value={form.email}
                    onChange={handleFieldChange}
                    disabled={creating}
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cust-phone">Phone</Label>
                  <Input
                    id="cust-phone"
                    name="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={handleFieldChange}
                    disabled={creating}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cust-password">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cust-password"
                    name="password"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={handleFieldChange}
                    disabled={creating}
                    autoComplete="new-password"
                  />
                </div>

                {createError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {createError}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDialog}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="bg-[#0A192F] text-white hover:bg-[#112240] flex items-center gap-2"
                    id="add-customer-submit-btn"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating…
                      </>
                    ) : (
                      <>
                        Next: Upload Documents
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            /* ── Step 2: KYC documents ── */
            <>
              <DialogHeader className="mt-2">
                <DialogTitle className="text-[#0A192F] text-xl font-bold">
                  Upload KYC Documents
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-sm">
                  Step 2 of 2 — Upload documents on behalf of this customer. You
                  can skip and do this later from the customer's profile.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                {KYC_DOCS.map((doc) => (
                  <KycUploadRow
                    key={doc.key}
                    doc={doc}
                    uploaded={!!uploadedDocs[doc.key]}
                    uploading={uploadingKey === doc.key}
                    onFile={(file) => handleKycFile(doc.key, file)}
                  />
                ))}

                {uploadError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {uploadError}
                  </p>
                )}
              </div>

              {/* Upload count summary */}
              <div className="text-xs text-slate-500 text-center py-1">
                {Object.keys(uploadedDocs).length} of {KYC_DOCS.length} documents
                uploaded
              </div>

              <div className="flex justify-between gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDialog}
                    id="kyc-skip-btn"
                  >
                    Skip & Close
                  </Button>
                  <Button
                    type="button"
                    onClick={closeDialog}
                    className="bg-[#0A192F] text-white hover:bg-[#112240]"
                    id="kyc-done-btn"
                  >
                    Done
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Step pip indicator ────────────────────────────────────────────────────
function StepPip({ active, done, label }) {
  const base =
    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors";
  if (done)
    return (
      <div className={`${base} bg-[#0A192F] text-white`}>
        <CheckCircle2 className="h-4 w-4" />
      </div>
    );
  if (active)
    return <div className={`${base} bg-[#0A192F] text-white`}>{label}</div>;
  return (
    <div className={`${base} border-2 border-slate-300 text-slate-400`}>
      {label}
    </div>
  );
}

// ─── KYC upload row ────────────────────────────────────────────────────────
function KycUploadRow({ doc, uploaded, uploading, onFile }) {
  const inputRef = useRef();

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
        uploaded
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileText
          className={`h-4 w-4 flex-shrink-0 ${uploaded ? "text-emerald-600" : "text-slate-400"}`}
        />
        <div className="min-w-0">
          <p
            className={`text-sm font-medium truncate ${
              uploaded ? "text-emerald-800" : "text-slate-700"
            }`}
          >
            {doc.label}
          </p>
          {!doc.required && (
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Optional
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
        {uploaded ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs font-medium text-[#0A192F] border border-slate-300 rounded-md px-2.5 py-1.5 hover:bg-slate-100 disabled:opacity-50 transition-colors"
            id={`kyc-upload-btn-${doc.key}`}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {uploading ? "Uploading…" : "Upload"}
          </button>
        )}
        {uploaded && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            title="Replace file"
            className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
          data-testid={`kyc-input-${doc.key}`}
        />
      </div>
    </div>
  );
}
