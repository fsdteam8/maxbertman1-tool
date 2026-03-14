"use client";

import React from "react";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { FileSearch, Terminal, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExtractedTextViewerProps {
  rawText: string;
}

export function ExtractedTextViewer({ rawText }: ExtractedTextViewerProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(rawText);
  };

  return (
    <Card className="glass-card border-none bg-black/20 overflow-hidden">
      <CardContent className="p-0">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="raw-text" className="border-none">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/5 transition-colors group">
              <div className="flex items-center space-x-3 text-muted-foreground group-hover:text-foreground transition-colors">
                <FileSearch className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">View Extracted Raw Text</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="relative group">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="absolute top-4 right-4 h-8 w-8 hover:bg-white/10"
                  onClick={handleCopy}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                
                <div className="bg-black/40 rounded-2xl p-6 border border-border/30 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[400px] custom-scrollbar">
                  <div className="flex items-center space-x-2 mb-4 text-emerald-400 opacity-50">
                    <Terminal className="w-3 h-3" />
                    <span className="text-[10px] uppercase font-bold tracking-widest">Parser Debug Log</span>
                  </div>
                  <pre className="whitespace-pre-wrap text-muted-foreground/80">
                    {rawText || "No text extracted."}
                  </pre>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

// Minimal Accordion mockup if shadcn is not fully initted yet
// Note: In real setup, user would use npx shadcn add accordion
