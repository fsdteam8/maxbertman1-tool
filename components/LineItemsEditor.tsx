"use client";

import React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import type { ParsedLineItem } from "@/types/invoice";

interface LineItemsEditorProps {
  items: ParsedLineItem[];
  onChange: (items: ParsedLineItem[]) => void;
}

export function LineItemsEditor({ items, onChange }: LineItemsEditorProps) {
  const handleUpdate = (index: number, field: keyof ParsedLineItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center space-x-2">
          <span>Line Items</span>
          <Badge variant="secondary" className="rounded-full px-2 py-0 h-5 text-[10px]">
            {items.length} Detected
          </Badge>
        </h3>
      </div>

      <div className="rounded-2xl border border-border/50 overflow-hidden glass">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="w-[100px] text-[10px] uppercase font-bold text-muted-foreground">Type</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Description</TableHead>
              <TableHead className="w-[150px] text-right text-[10px] uppercase font-bold text-muted-foreground">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index} className="border-border/50 hover:bg-primary/5 transition-colors">
                <TableCell>
                  <Badge 
                    variant={item.type === 'service' ? 'default' : item.type === 'tax' ? 'outline' : 'secondary'}
                    className={cn(
                      "text-[10px] font-bold h-5 px-1.5 uppercase",
                      item.type === 'tax' && "border-primary/30 text-primary bg-primary/5",
                      item.type === 'credit' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    )}
                  >
                    {item.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-1 py-1">
                    <Input 
                      value={item.title} 
                      onChange={(e) => handleUpdate(index, 'title', e.target.value)}
                      className="h-8 font-semibold border-none bg-transparent hover:bg-white/5 focus-visible:bg-white/10 transition-colors p-0 shadow-none text-sm"
                    />
                    <textarea 
                      value={item.description}
                      onChange={(e) => handleUpdate(index, 'description', e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-muted-foreground resize-none focus:outline-none hover:bg-white/5 focus-visible:bg-white/10 transition-colors rounded p-1 min-h-[40px]"
                    />
                    {item.serviceDateRange && (
                      <p className="text-[10px] text-primary/70 font-medium">Service Period: {item.serviceDateRange}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end space-y-1">
                    <Input 
                      type="text"
                      value={item.amount !== null ? item.amount : ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : parseFloat(e.target.value);
                        handleUpdate(index, 'amount', val);
                      }}
                      className="h-8 w-24 text-right font-bold border-none bg-transparent hover:bg-white/5 focus-visible:bg-white/10 transition-colors p-0 pr-1 shadow-none"
                    />
                    {item.amount !== null && (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {formatCurrency(item.amount)}
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";
