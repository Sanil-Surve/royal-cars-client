import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { api } from "../lib/api";
import StatusBadge from "../components/StatusBadge";

export default function AdminCustomers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  useEffect(() => {
    api.get("/admin/customers").then((r) => setCustomers(r.data));
  }, []);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-slate-500">Directory</div>
        <h1 className="font-heading text-3xl font-bold text-[#0A192F]" data-testid="admin-customers-title">Customers</h1>
      </div>
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
                  <div className="text-xs text-slate-500 hidden md:block">{c.email}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-slate-600">{c.email}</TableCell>
                <TableCell className="hidden md:table-cell">{c.phone || "—"}</TableCell>
                <TableCell className="hidden sm:table-cell">{c.booking_count}</TableCell>
                <TableCell className="hidden md:table-cell"><StatusBadge status={c.kyc_status || "not_submitted"} /></TableCell>
                <TableCell className="hidden md:table-cell text-xs text-slate-500">{c.created_at?.slice(0, 10)}</TableCell>
              </TableRow>
            ))}
            {customers.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-slate-500">No customers yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
