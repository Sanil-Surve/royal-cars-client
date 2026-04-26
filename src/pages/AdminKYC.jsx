import { useEffect, useState } from "react";
import { FileText, Check, X } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { api, formatApiErrorDetail } from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import { toast } from "sonner";

const LABELS = {
  dl_front: "DL Front", dl_back: "DL Back",
  aadhar_front: "Aadhar Front", aadhar_back: "Aadhar Back",
  rent_agreement: "Rent Agreement", light_bill: "Light Bill",
};

export default function AdminKYC() {
  const [queue, setQueue] = useState([]);
  const [notes, setNotes] = useState({});
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    const { data } = await api.get("/kyc/queue");
    setQueue(data);
    if (data[0]) setExpanded(data[0].user.id);
  };
  useEffect(() => { load(); }, []);

  const verify = async (docId, status) => {
    try {
      await api.post(`/kyc/${docId}/verify`, { status, notes: notes[docId] || null });
      toast.success(`Document ${status}`);
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-slate-500">Verification</div>
        <h1 className="font-heading text-3xl font-bold text-[#0A192F]" data-testid="admin-kyc-title">KYC queue</h1>
      </div>

      {queue.length === 0 ? (
        <Card className="rounded-lg border-dashed border-slate-300 p-12 text-center text-slate-500" data-testid="kyc-queue-empty">
          No pending verifications.
        </Card>
      ) : (
        <div className="space-y-4">
          {queue.map(({ user, documents }) => (
            <Card key={user.id} className="rounded-lg border-slate-200" data-testid={`kyc-user-${user.id}`}>
              <button
                onClick={() => setExpanded(expanded === user.id ? null : user.id)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
                data-testid={`kyc-user-toggle-${user.id}`}
              >
                <div>
                  <div className="font-heading text-lg text-[#0A192F]">{user.name}</div>
                  <div className="text-xs text-slate-500">{user.email} · {user.phone}</div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={user.kyc_status} />
                  <span className="text-sm text-slate-500">{documents.length} / 6 docs</span>
                </div>
              </button>
              {expanded === user.id && (
                <div className="border-t border-slate-200 p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    {documents.map((d) => (
                      <div key={d.id} className="rounded-md border border-slate-200 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-medium text-[#0A192F]">
                            <FileText className="h-4 w-4" /> {LABELS[d.document_type] || d.document_type}
                          </div>
                          <StatusBadge status={d.verification_status} />
                        </div>
                        <DocPreview doc={d} />
                        <Textarea
                          placeholder="Notes (optional, shown to customer if rejected)"
                          value={notes[d.id] || ""}
                          onChange={(e) => setNotes((n) => ({ ...n, [d.id]: e.target.value }))}
                          rows={2}
                          className="mt-3 text-xs"
                          data-testid={`kyc-notes-${d.id}`}
                        />
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" onClick={() => verify(d.id, "approved")} className="rounded-md bg-emerald-600 text-white hover:bg-emerald-700" data-testid={`kyc-approve-${d.id}`}>
                            <Check className="mr-1 h-3 w-3" /> Approve
                          </Button>
                          <Button size="sm" onClick={() => verify(d.id, "rejected")} variant="outline" className="rounded-md border-red-300 text-red-600 hover:bg-red-50" data-testid={`kyc-reject-${d.id}`}>
                            <X className="mr-1 h-3 w-3" /> Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DocPreview({ doc }) {
  const url = doc.file_url;
  const isPdf = doc.content_type === "application/pdf" || doc.resource_type === "raw" || url?.endsWith(".pdf");
  if (!url) return <div className="mt-2 h-28 rounded bg-slate-100" />;
  if (isPdf) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-2 block text-sm underline text-[#0A192F]" data-testid={`kyc-doc-preview-${doc.id}`}>
        Open PDF
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" data-testid={`kyc-doc-preview-${doc.id}`}>
      <img src={url} alt="doc" className="mt-2 h-28 w-full rounded object-cover transition hover:opacity-90" />
    </a>
  );
}
