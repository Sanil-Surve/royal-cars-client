import { useEffect, useState } from "react";
import { Card } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { api } from "../lib/api";
import StatusBadge from "../components/StatusBadge";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  useEffect(() => {
    api.get("/admin/customers").then((r) => setCustomers(r.data));
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-slate-500">Directory</div>
        <h1 className="font-heading text-3xl font-bold text-[#0A192F]" data-testid="admin-customers-title">Customers</h1>
      </div>
      <Card className="rounded-lg border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Bookings</TableHead>
              <TableHead>KYC</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id} data-testid={`admin-customer-row-${c.id}`}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-slate-600">{c.email}</TableCell>
                <TableCell>{c.phone || "—"}</TableCell>
                <TableCell>{c.booking_count}</TableCell>
                <TableCell><StatusBadge status={c.kyc_status || "not_submitted"} /></TableCell>
                <TableCell className="text-xs text-slate-500">{c.created_at?.slice(0, 10)}</TableCell>
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
