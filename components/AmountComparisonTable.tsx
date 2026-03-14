import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { formatCurrency, formatDifference } from "@/lib/currency";
import { TrendingUp, ArrowRight } from "lucide-react";

interface AmountComparisonTableProps {
  original: {
    subtotal: number | null;
    taxAmount: number | null;
    creditAmount: number | null;
    balanceDue: number | null;
  };
  markedUp: {
    subtotal: number | null;
    taxAmount: number | null;
    creditAmount: number | null;
    balanceDue: number | null;
  };
}

export function AmountComparisonTable({ original, markedUp }: AmountComparisonTableProps) {
  const rows = [
    { label: "Subtotal", orig: original.subtotal, mark: markedUp.subtotal },
    { label: "Sales Tax", orig: original.taxAmount, mark: markedUp.taxAmount },
    { label: "Credits", orig: original.creditAmount, mark: markedUp.creditAmount },
    { label: "Total / Balance Due", orig: original.balanceDue, mark: markedUp.balanceDue, highlight: true },
  ].filter(r => r.orig !== null || r.highlight);

  return (
    <Card className="glass-card border-none shadow-xl overflow-hidden">
      <CardContent className="p-0">
        <div className="bg-primary/5 p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-widest">Markup Summary (1%)</h3>
          </div>
          <div className="text-[10px] font-bold text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
            AUTO-CALCULATED
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="text-[10px] uppercase font-bold text-muted-foreground pl-6">Line Item</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-muted-foreground text-right">Original</TableHead>
              <TableHead className="w-12"></TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-primary text-right">Updated</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-emerald-400 text-right pr-6">Difference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => {
              const diff = (row.mark || 0) - (row.orig || 0);
              return (
                <TableRow 
                  key={i} 
                  className={cn(
                    "border-border/50 group transition-colors",
                    row.highlight ? "bg-primary/[0.03] hover:bg-primary/[0.05]" : "hover:bg-white/5"
                  )}
                >
                  <TableCell className={cn("pl-6 font-medium", row.highlight && "text-primary")}>
                    {row.label}
                  </TableCell>
                  <TableCell className="text-right font-medium text-muted-foreground">
                    {row.orig !== null ? formatCurrency(row.orig) : "—"}
                  </TableCell>
                  <TableCell className="text-center group-hover:px-4 transition-all duration-300">
                    <ArrowRight className="w-3 h-3 text-border group-hover:text-primary transition-colors" />
                  </TableCell>
                  <TableCell className={cn("text-right font-bold", row.highlight ? "text-primary text-lg" : "text-foreground")}>
                    {row.mark !== null ? formatCurrency(row.mark) : "—"}
                  </TableCell>
                  <TableCell className="text-right pr-6 font-bold text-emerald-400">
                    {row.mark !== null && row.orig !== null ? formatDifference(diff) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

import { cn } from "@/lib/utils";
