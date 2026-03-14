import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MapPin, Building2, Send } from "lucide-react";
import type { ParsedInvoice } from "@/types/invoice";

interface InvoicePartyDetailsProps {
  invoice: ParsedInvoice;
}

export function InvoicePartyDetails({ invoice }: InvoicePartyDetailsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="glass-card border-none">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-primary">
              <Building2 className="w-4 h-4" />
              <h3 className="font-bold uppercase tracking-widest text-xs">Issuer</h3>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-lg">{invoice.issuerName || "Unknown Issuer"}</p>
              {invoice.issuerEmail && (
                <p className="text-sm text-muted-foreground">{invoice.issuerEmail}</p>
              )}
              <div className="pt-2 space-y-0.5">
                {invoice.issuerAddressLines.map((line, i) => (
                  <p key={i} className="text-sm text-muted-foreground">{line}</p>
                ))}
              </div>
            </div>
          </div>

          <Separator className="bg-border/50" />

          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-accent">
              <Send className="w-4 h-4" />
              <h3 className="font-bold uppercase tracking-widest text-xs">Remit To</h3>
            </div>
            <div className="space-y-0.5">
              {invoice.remitToLines.length > 0 ? (
                invoice.remitToLines.map((line, i) => (
                  <p key={i} className="text-sm text-muted-foreground font-medium">{line}</p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">No remittance info detected.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-none">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-blue-400">
              <MapPin className="w-4 h-4" />
              <h3 className="font-bold uppercase tracking-widest text-xs">Bill To</h3>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-lg">{invoice.billToName || "Unknown Customer"}</p>
              <div className="pt-2 space-y-0.5">
                {invoice.billToAddressLines.map((line, i) => (
                  <p key={i} className="text-sm text-muted-foreground">{line}</p>
                ))}
              </div>
            </div>
          </div>

          <Separator className="bg-border/50" />

          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-emerald-400">
              <MapPin className="w-4 h-4" />
              <h3 className="font-bold uppercase tracking-widest text-xs">Service Address</h3>
            </div>
            <div className="space-y-0.5">
              {invoice.serviceAddressLines.length > 0 ? (
                invoice.serviceAddressLines.map((line, i) => (
                  <p key={i} className="text-sm text-muted-foreground font-medium">{line}</p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">No service address detected.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
