import React from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in text-center">
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-6">
        <AlertTriangle className="w-10 h-10" />
      </div>
      <h3 className="text-xl font-bold tracking-tight mb-3">Something went wrong</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-8 leading-relaxed">
        {message || "We encountered an unexpected error while processing your document."}
      </p>
      <Button 
        variant="outline" 
        onClick={onRetry}
        className="rounded-2xl border-destructive/20 text-destructive hover:bg-destructive/5 px-8 font-bold"
      >
        <RefreshCcw className="w-4 h-4 mr-2" />
        TRY AGAIN
      </Button>
    </div>
  );
}
