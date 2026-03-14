import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileDown, ArrowRight, RefreshCw } from "lucide-react";

interface DownloadResultCardProps {
  onReset: () => void;
  onDownload: () => void;
}

export function DownloadResultCard({ onReset, onDownload }: DownloadResultCardProps) {
  return (
    <Card className="glass-card border-none overflow-hidden shadow-2xl animate-fade-in">
      <CardContent className="p-12 flex flex-col items-center text-center space-y-8">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-black tracking-tighter">Success! PDF Generated</h2>
          <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Your updated invoice with the applied 1% markup and resolved PO information is ready.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
          <Button 
            variant="outline" 
            onClick={onReset}
            className="w-full h-14 rounded-2xl border-border/50 hover:bg-white/5 font-bold"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            PROCESS ANOTHER
          </Button>
          <Button 
            onClick={onDownload}
            className="w-full h-14 rounded-2xl font-bold bg-primary hover:bg-primary/90"
          >
            <FileDown className="w-4 h-4 mr-2" />
            DOWNLOAD AGAIN
          </Button>
        </div>

        <div className="flex items-center space-x-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">
          <span>Security Note: This file will be cleared from session memory shortly.</span>
        </div>
      </CardContent>
    </Card>
  );
}
