"use client";

import React from "react";
import { CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export type ProcessingStep = "idle" | "uploading" | "parsing" | "processing" | "generating" | "complete" | "error";

interface ProcessingStatusBannerProps {
  currentStep: ProcessingStep;
  error?: string | null;
}

const STEPS: { id: ProcessingStep; label: string }[] = [
  { id: "uploading", label: "Upload" },
  { id: "parsing", label: "Extract" },
  { id: "processing", label: "Markup & PO" },
  { id: "generating", label: "PDF Build" },
];

export function ProcessingStatusBanner({ currentStep, error }: ProcessingStatusBannerProps) {
  if (currentStep === "idle" || currentStep === "complete") return null;

  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in group">
      <div className="glass-card border-none p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        {/* Animated background glow */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-emerald-400 opacity-50" />
        
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/80">
              {error ? "Processing Failed" : "Transaction Pipeline"}
            </h3>
            {!error && (
              <div className="flex items-center space-x-2 text-primary font-bold text-xs">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="animate-pulse uppercase tracking-wider">Active</span>
              </div>
            )}
          </div>

          <div className="relative flex justify-between">
            <div className="absolute top-4 left-0 w-full h-0.5 bg-border/30 -z-10" />
            
            {STEPS.map((step, idx) => {
              const isPast = stepIndex > idx;
              const isActive = stepIndex === idx;
              
              return (
                <div key={idx} className="flex flex-col items-center space-y-3 relative">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                    isPast ? "bg-primary border-primary text-primary-foreground" : 
                    isActive ? "bg-background border-primary text-primary shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-110" : 
                    "bg-background border-border text-muted-foreground"
                  )}>
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest transition-colors duration-300",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {!error && (
            <div className="space-y-2">
              <Progress value={progress} className="h-1 bg-border/20" />
              <p className="text-[10px] text-center text-muted-foreground font-medium animate-pulse">
                Step {stepIndex + 1} of 4: Synchronizing metadata...
              </p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-start space-x-3 mt-2">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-destructive">Process Interrupted</p>
                <p className="text-xs text-destructive/80 leading-relaxed font-medium">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
