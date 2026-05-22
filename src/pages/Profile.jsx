import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  User, Mail, Phone, Calendar, Shield, FileText, 
  CheckCircle2, XCircle, Clock, ExternalLink, Copy, Check,
  ChevronRight, ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const DOCS_CONFIG = [
  { key: "dl_front", label: "Driving License — Front", required: true },
  { key: "dl_back", label: "Driving License — Back", required: true },
  { key: "aadhar_front", label: "Aadhar — Front", required: true },
  { key: "aadhar_back", label: "Aadhar — Back", required: true },
  { key: "rent_agreement", label: "Rent Agreement", required: false },
  { key: "light_bill", label: "Electricity / Light Bill", required: false },
];

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [kycStatus, setKycStatus] = useState("not_submitted");
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [activeTab, setActiveTab] = useState("personal"); // "personal" | "kyc"
  const [copiedEmail, setCopiedEmail] = useState(false);

  const loadKycData = async () => {
    try {
      setLoadingDocs(true);
      const { data } = await api.get("/kyc/my");
      setDocs(data.documents || []);
      setKycStatus(data.kyc_status || "not_submitted");
    } catch (e) {
      toast.error("Failed to load KYC documents data.");
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadKycData();
    }
  }, [user]);

  const handleCopyEmail = () => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      setCopiedEmail(true);
      toast.success("Email copied to clipboard!");
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const getDocFile = (key) => docs.find((d) => d.document_type === key);

  // Format Created At date nicely
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar />
      
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Back Link */}
        <div className="mb-6">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#0A192F] transition-colors"
            data-testid="profile-back-link"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Profile Premium Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="overflow-hidden border-slate-200 bg-white p-6 md:p-8 rounded-xl shadow-sm mb-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4 md:gap-6">
                {/* luxury initials avatar */}
                <div className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-full bg-gradient-to-tr from-[#0A192F] to-[#1A365D] text-xl md:text-2xl font-heading font-semibold text-[#D4AF37] border-2 border-[#D4AF37]/30 shadow-inner">
                  {user?.name ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "RC"}
                </div>
                
                <div>
                  <h1 className="font-heading text-2xl font-bold text-[#0A192F] md:text-3xl" data-testid="profile-user-name">
                    {user?.name || "Royal Customer"}
                  </h1>
                  <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {user?.email}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                      {user?.role === "admin" ? "Fleet Manager" : "Client Account"}
                    </span>
                    <StatusBadge status={kycStatus} />
                  </div>
                </div>
              </div>

              {kycStatus !== "approved" && (
                <div className="flex flex-col gap-2 self-start md:self-center">
                  <Button 
                    onClick={() => navigate("/kyc")} 
                    className="rounded-md bg-[#0A192F] text-white hover:bg-[#0A192F]/90"
                    data-testid="profile-upload-kyc-cta"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {kycStatus === "rejected" ? "Update KYC Documents" : "Upload KYC Documents"}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Profile Sub-Navbar (Custom Navigation Tabs) */}
        <div className="border-b border-slate-200 mb-8 sticky top-[80px] bg-[#FAFAFA] z-30 py-2">
          <div className="flex gap-6" data-testid="profile-sub-navbar">
            <button
              onClick={() => setActiveTab("personal")}
              className={`pb-3 text-sm font-heading font-semibold tracking-wide transition-all relative ${
                activeTab === "personal" 
                  ? "text-[#0A192F]" 
                  : "text-slate-400 hover:text-slate-600"
              }`}
              data-testid="tab-personal-info"
            >
              Personal Details
              {activeTab === "personal" && (
                <motion.div 
                  layoutId="activeTabUnderline" 
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37]" 
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab("kyc")}
              className={`pb-3 text-sm font-heading font-semibold tracking-wide transition-all relative ${
                activeTab === "kyc" 
                  ? "text-[#0A192F]" 
                  : "text-slate-400 hover:text-slate-600"
              }`}
              data-testid="tab-kyc-docs"
            >
              KYC Documents
              {activeTab === "kyc" && (
                <motion.div 
                  layoutId="activeTabUnderline" 
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37]" 
                />
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Tab Contents */}
        <AnimatePresence mode="wait">
          {activeTab === "personal" ? (
            <motion.div
              key="personal-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <div className="grid gap-6 md:grid-cols-2">
                {/* Full Name Card */}
                <Card className="p-6 border-slate-200 bg-white rounded-lg flex items-start gap-4 transition-all hover:border-[#D4AF37]/35">
                  <div className="p-3 rounded-lg bg-blue-50 text-[#0A192F]">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Full Name</div>
                    <div className="mt-1 font-heading text-lg font-bold text-[#0A192F]">{user?.name || "N/A"}</div>
                  </div>
                </Card>

                {/* Email Address Card */}
                <Card className="p-6 border-slate-200 bg-white rounded-lg flex items-start gap-4 transition-all hover:border-[#D4AF37]/35">
                  <div className="p-3 rounded-lg bg-purple-50 text-purple-700">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email Address</div>
                    <div className="mt-1 font-heading text-lg font-bold text-[#0A192F] flex items-center justify-between gap-2">
                      <span className="break-all">{user?.email || "N/A"}</span>
                      {user?.email && (
                        <button 
                          onClick={handleCopyEmail}
                          className="p-1.5 rounded text-slate-400 hover:bg-slate-50 hover:text-[#0A192F] transition-all"
                          title="Copy Email"
                        >
                          {copiedEmail ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Phone Number Card */}
                <Card className="p-6 border-slate-200 bg-white rounded-lg flex items-start gap-4 transition-all hover:border-[#D4AF37]/35">
                  <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Phone Number</div>
                    <div className="mt-1 font-heading text-lg font-bold text-[#0A192F]">{user?.phone || "Not Provided"}</div>
                  </div>
                </Card>

                {/* Registration Date Card */}
                <Card className="p-6 border-slate-200 bg-white rounded-lg flex items-start gap-4 transition-all hover:border-[#D4AF37]/35">
                  <div className="p-3 rounded-lg bg-amber-50 text-amber-700">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Member Since</div>
                    <div className="mt-1 font-heading text-lg font-bold text-[#0A192F]">{formatDate(user?.created_at)}</div>
                  </div>
                </Card>

                {/* Verification Level Card */}
                <Card className="p-6 border-slate-200 bg-white rounded-lg flex items-start gap-4 transition-all hover:border-[#D4AF37]/35 md:col-span-2">
                  <div className="p-3 rounded-lg bg-slate-50 text-[#0A192F]">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Trust & Verification</div>
                    <div className="mt-2 font-body text-sm text-slate-600">
                      {kycStatus === "approved" ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" />
                          Fully Verified. You have unlimited booking capability and site check-out options active.
                        </span>
                      ) : kycStatus === "pending" ? (
                        <span className="text-amber-700 font-semibold flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          KYC Review In Progress. Our fleet verification desk is actively examining your documents.
                        </span>
                      ) : kycStatus === "rejected" ? (
                        <span className="text-red-700 font-semibold flex items-center gap-1.5">
                          <XCircle className="h-4 w-4" />
                          Verification Rejected. Please review the KYC Documents tab for detailed coordinator feedback and re-upload correct documents.
                        </span>
                      ) : (
                        <span className="text-slate-600 flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-slate-400" />
                          KYC Documents Not Uploaded. You must upload required identification prior to driving vehicles.
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="kyc-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              {loadingDocs ? (
                <div className="py-12 text-center text-slate-500 font-body">
                  <Clock className="h-8 w-8 animate-spin mx-auto text-slate-400 mb-3" />
                  <span>Loading KYC verification profile...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Info alert */}
                  <div className="p-4 rounded-lg bg-[#0A192F]/5 border border-[#0A192F]/10 flex gap-3 text-slate-700 text-sm leading-relaxed">
                    <Shield className="h-5 w-5 text-[#D4AF37] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[#0A192F]">KYC Requirements:</span> To confirm booking verification, you must upload front and back scans of both your <strong className="text-[#0A192F]">Driving License</strong> and <strong className="text-[#0A192F]">Aadhar Card</strong>. Rental agreement and electricity bills are optional but support faster local approvals.
                    </div>
                  </div>

                  {/* Grid list of Documents */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {DOCS_CONFIG.map((d) => {
                      const docFile = getDocFile(d.key);
                      return (
                        <Card 
                          key={d.key} 
                          className={`p-5 bg-white border rounded-lg transition-all flex flex-col justify-between ${
                            docFile?.verification_status === "approved" 
                              ? "border-emerald-100 hover:border-emerald-200" 
                              : docFile?.verification_status === "rejected"
                              ? "border-red-100 hover:border-red-200 bg-red-50/5"
                              : docFile 
                              ? "border-amber-100 hover:border-amber-200"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                          data-testid={`profile-doc-${d.key}`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-heading font-bold text-slate-800 text-base flex items-center gap-1.5">
                                <FileText className="h-4.5 w-4.5 text-slate-400" />
                                {d.label}
                              </div>
                              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                                d.required ? "bg-red-50 text-red-700 border border-red-100" : "bg-slate-100 text-slate-500"
                              }`}>
                                {d.required ? "Required" : "Optional"}
                              </span>
                            </div>

                            {/* Verification status and dates */}
                            <div className="mt-3 flex flex-col gap-1.5">
                              <div className="flex items-center gap-2 text-xs font-body">
                                <span className="text-slate-500">Status:</span>
                                {docFile ? (
                                  <span className={`font-semibold capitalize flex items-center gap-1 ${
                                    docFile.verification_status === "approved" 
                                      ? "text-emerald-700" 
                                      : docFile.verification_status === "rejected"
                                      ? "text-red-700"
                                      : "text-amber-700"
                                  }`}>
                                    {docFile.verification_status === "approved" && <CheckCircle2 className="h-3 w-3" />}
                                    {docFile.verification_status === "rejected" && <XCircle className="h-3 w-3" />}
                                    {docFile.verification_status === "pending" && <Clock className="h-3 w-3" />}
                                    {docFile.verification_status}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Not Uploaded</span>
                                )}
                              </div>

                              {docFile?.created_at && (
                                <div className="text-[11px] text-slate-500">
                                  Uploaded on: {formatDate(docFile.created_at)}
                                </div>
                              )}
                            </div>

                            {/* Coordinator comments on rejection */}
                            {docFile?.admin_notes && (
                              <div className="mt-3 p-2.5 rounded bg-red-50 border border-red-100/50 text-xs text-red-700">
                                <strong>Feedback:</strong> {docFile.admin_notes}
                              </div>
                            )}
                          </div>

                          {/* Previews / CTAs */}
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                            {docFile?.file_url ? (
                              <>
                                <a 
                                  href={docFile.file_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-[#0A192F] font-semibold hover:underline"
                                  data-testid={`preview-doc-${d.key}`}
                                >
                                  <span>View Uploaded File</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>

                                {docFile.verification_status !== "approved" && (
                                  <Link to="/kyc">
                                    <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-600 rounded">
                                      Replace
                                    </Button>
                                  </Link>
                                )}
                              </>
                            ) : (
                              <Link to="/kyc" className="w-full">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="w-full h-8 text-xs border-dashed border-slate-300 hover:border-[#D4AF37] hover:text-[#0A192F] rounded"
                                  data-testid={`upload-doc-cta-${d.key}`}
                                >
                                  Upload Document
                                </Button>
                              </Link>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
