import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileDown, ShieldCheck, Mail, Loader2 } from "lucide-react";
import type { ProcessedInvoice } from "@/types/invoice";
import { AmountComparisonTable } from "./AmountComparisonTable";
import { cn } from "@/lib/utils";

interface InvoicePreviewCardProps {
  processed: ProcessedInvoice;
  onDownload: () => void;
  isDownloading?: boolean;
}

export function InvoicePreviewCard({ processed, onDownload, isDownloading }: InvoicePreviewCardProps) {
  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <h2 className="text-2xl font-black tracking-tight">Invoice Resolved</h2>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            All transformations complete. Ready for final generation.
          </p>
        </div>

        <Button 
          size="lg" 
          onClick={onDownload} 
          disabled={isDownloading}
          className="rounded-2xl h-14 px-8 font-bold text-lg bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {isDownloading ? (
            <span className="flex items-center">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              GENERATING PDF...
            </span>
          ) : (
            <span className="flex items-center">
              <FileDown className="w-5 h-5 mr-3" />
              GENERATE & DOWNLOAD
            </span>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <AmountComparisonTable 
            original={processed.original} 
            markedUp={processed.markedUp} 
          />
          
          <div className="glass-card p-6 rounded-2xl flex items-start space-x-4">
            <div className="bg-primary/10 p-2.5 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold uppercase tracking-wider">Automated Verification</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The 1% markup has been applied to all service fees and taxes. 
                {processed.poReplacementApplied ? " PO placeholder text has been successfully replaced with your input." : " No PO placeholder was detected/replaced."}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="glass-card border-none bg-emerald-500/5">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center space-x-2 text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-widest">Workflow Status</h3>
              </div>
              <ul className="space-y-3">
                <StatusItem label="PDF Extraction" active />
                <StatusItem label="Currency Normalization" active />
                <StatusItem label="1% Markup Injection" active />
                <StatusItem label="PO Resolution" active={processed.poReplacementApplied} />
                <StatusItem label="PDF Post-Processing" />
              </ul>
            </CardContent>
          </Card>

          <Card className="glass-card border-none bg-primary/[0.03]">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center space-x-2 text-primary">
                <Mail className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-widest">Automation Note</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This exact workflow is available via email. Send any invoice to your dedicated address for instant automated processing.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusItem({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <li className="flex items-center justify-between">
      <span className={cn("text-xs font-medium", active ? "text-foreground" : "text-muted-foreground/50")}>
        {label}
      </span>
      <div className={cn(
        "w-1.5 h-1.5 rounded-full",
        active ? "bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.5)]" : "bg-muted"
      )} />
    </li>
  );
}
