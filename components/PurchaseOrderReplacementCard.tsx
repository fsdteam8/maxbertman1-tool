"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface PurchaseOrderReplacementCardProps {
  detected: boolean;
  matchedText: string | null;
  existingPo: string | null;
  poNumber: string;
  onPOChange: (val: string) => void;
}

export function PurchaseOrderReplacementCard({
  detected,
  matchedText,
  existingPo,
  poNumber,
  onPOChange,
}: PurchaseOrderReplacementCardProps) {
  return (
    <Card
      className={cn(
        "glass-card border-none overflow-hidden transition-all duration-500",
        detected ? "ring-1 ring-primary/20" : "opacity-80",
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
              PO Resolution
            </h3>
          </div>

          {detected ? (
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1 animate-pulse">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Placeholder Detected
            </Badge>
          ) : existingPo ? (
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-3 py-1">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Existing PO Found
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="bg-white/5 text-muted-foreground border-white/10 px-3 py-1"
            >
              <AlertCircle className="w-3 h-3 mr-1" />
              Not Found
            </Badge>
          )}
        </div>

        <div className="space-y-6">
          {detected && matchedText && (
            <div className="bg-background/40 rounded-2xl p-4 border border-border/50 italic text-sm text-muted-foreground relative">
              <div className="absolute top-0 left-4 -translate-y-1/2 bg-background px-2 text-[10px] font-bold text-primary uppercase tracking-wider">
                Original Placeholder
              </div>
              "{matchedText}"
            </div>
          )}

          {existingPo && (
            <div className="bg-background/40 rounded-2xl p-4 border border-border/50 italic text-sm text-muted-foreground relative">
              <div className="absolute top-0 left-4 -translate-y-1/2 bg-background px-2 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                Current PO #
              </div>
              "{existingPo}"
            </div>
          )}

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1">
              Correct Purchase Order
            </label>
            <div className="relative group">
              <Input
                value={poNumber}
                onChange={(e) => onPOChange(e.target.value)}
                placeholder="Enter PO # (e.g. RYDER-2024-001)"
                className="h-14 bg-white/5 border-border/50 rounded-2xl px-5 text-lg font-bold tracking-tight focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:font-normal placeholder:text-muted-foreground/30"
              />
              <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none rounded-2xl" />
            </div>

            {poNumber && (detected || existingPo) && (
              <p className="text-xs text-primary font-medium animate-fade-in pl-1">
                The {detected ? "placeholder" : "existing PO"} will be replaced
                with <span className="font-bold">PO# {poNumber}</span> in the
                final PDF.
              </p>
            )}

            {!detected && !existingPo && (
              <p className="text-[10px] text-muted-foreground italic pl-1 leading-relaxed">
                No standard PO placeholder or existing PO was detected
                automatically. You can still provide a PO number here to resolve
                it if it was missed.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
