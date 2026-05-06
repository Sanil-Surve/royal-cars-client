import { useEffect, useState } from "react";
import { Card } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { api, formatINR } from "../lib/api";
import StatusBadge from "../components/StatusBadge";

export default function AdminPayments() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/admin/payments").then((r) => setItems(r.data));
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-slate-500">Finance</div>
        <h1 className="font-heading text-3xl font-bold text-[#0A192F]" data-testid="admin-payments-title">Payments</h1>
      </div>
      <Card className="rounded-lg border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Booking</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((p) => (
              <TableRow key={p.id} data-testid={`payment-row-${p.id}`}>
                <TableCell className="font-mono text-xs">{p.razorpay_order_id}</TableCell>
                <TableCell className="font-mono text-xs">{p.booking_id?.slice(0, 8)}</TableCell>
                <TableCell>{p.payment_type}</TableCell>
                <TableCell>{formatINR(p.amount)}</TableCell>
                <TableCell><StatusBadge status={p.status === "success" ? "completed" : p.status} /></TableCell>
                <TableCell className="text-xs text-slate-500">{p.created_at?.slice(0, 10)}</TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-slate-500">No payments yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
