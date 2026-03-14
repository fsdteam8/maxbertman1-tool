import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Hash, User, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import type { ParsedInvoice } from "@/types/invoice";

interface InvoiceHeaderCardProps {
  invoice: ParsedInvoice;
}

export function InvoiceHeaderCard({ invoice }: InvoiceHeaderCardProps) {
  return (
    <Card className="glass-card overflow-hidden border-none shadow-2xl">
      <CardContent className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
              <Hash className="w-3.5 h-3.5" />
              <span>Invoice Number</span>
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {invoice.invoiceNumber || "—"}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
              <User className="w-3.5 h-3.5" />
              <span>Customer ID</span>
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {invoice.customerNumber || "—"}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5" />
              <span>Due Date</span>
            </div>
            <div className="flex items-center space-x-2">
              <p className="text-2xl font-bold tracking-tight">
                {invoice.dueDate || "—"}
              </p>
              {invoice.dueDate && (
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/20 bg-primary/5">
                  Action Required
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2 bg-primary/5 p-4 rounded-2xl border border-primary/10">
            <div className="flex items-center space-x-2 text-primary/70 text-xs font-medium uppercase tracking-wider">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Balance Due</span>
            </div>
            <p className="text-3xl font-black tracking-tighter text-primary">
              {invoice.balanceDue !== null ? formatCurrency(invoice.balanceDue) : "—"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
