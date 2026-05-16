import { Badge } from "./ui/badge";

const MAP = {
  pending_kyc: { label: "Pending KYC", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  not_submitted: { label: "Not submitted", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  verified: { label: "Verified", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  confirmed: { label: "Confirmed", cls: "bg-[#0A192F]/10 text-[#0A192F] border-[#0A192F]/20" },
  active: { label: "Active", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  overdue: { label: "Overdue", cls: "bg-red-100 text-red-700 border-red-300 animate-pulse" },
  completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-700 border-red-200" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-700 border-red-200" },
};

export default function StatusBadge({ status }) {
  const info = MAP[status] || { label: status, cls: "bg-slate-100 text-slate-700 border-slate-200" };
  return (
    <Badge variant="outline" className={`${info.cls} rounded-md font-medium`} data-testid={`status-badge-${status}`}>
      {info.label}
    </Badge>
  );
}
