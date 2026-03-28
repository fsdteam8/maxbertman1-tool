"use client";

import React, { useState } from "react";
import { FileUploadDropzone } from "@/components/FileUploadDropzone";
import {
  ProcessingStatusBanner,
  type ProcessingStep,
} from "@/components/ProcessingStatusBanner";
import { InvoiceHeaderCard } from "@/components/InvoiceHeaderCard";
import { InvoicePartyDetails } from "@/components/InvoicePartyDetails";
import { LineItemsEditor } from "@/components/LineItemsEditor";
import { PurchaseOrderReplacementCard } from "@/components/PurchaseOrderReplacementCard";
import { ExtractedTextViewer } from "@/components/ExtractedTextViewer";
import { InvoicePreviewCard } from "@/components/InvoicePreviewCard";
import { DownloadResultCard } from "@/components/DownloadResultCard";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { EmailAutomationArchitectureCard } from "@/components/EmailAutomationArchitectureCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronLeft, Send, Sparkles } from "lucide-react";
import type { ParsedInvoice, ProcessedInvoice } from "@/types/invoice";

export default function ToolPage() {
  // Workflow State
  const [step, setStep] = useState<ProcessingStep>("idle");
  const [error, setError] = useState<string | null>(null);

  // Data State
  const [parsedInvoice, setParsedInvoice] = useState<ParsedInvoice | null>(
    null,
  );
  const [processedInvoice, setProcessedInvoice] =
    useState<ProcessedInvoice | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>();
  const [poNumber, setPoNumber] = useState("");
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  // Handlers
  const handleFileSelect = async (file: File) => {
    setError(null);
    setStep("uploading");
    setOriginalFile(file); // Retain original for overlay generation

    try {
      const formData = new FormData();
      formData.append("file", file);

      setStep("parsing");
      const res = await fetch("/api/invoice/parse", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setParsedInvoice(data.invoice);
      setLogoDataUrl(data.logoDataUrl);
      setStep("idle"); // Done with async part, show review UI
    } catch (err: any) {
      setError(err.message || "Failed to process PDF.");
      setStep("error");
    }
  };

  const handleProcess = async () => {
    if (!parsedInvoice) return;

    setError(null);
    setStep("processing");

    try {
      const res = await fetch("/api/invoice/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice: parsedInvoice,
          poNumber: poNumber || undefined,
          markupPercent: 1, // 1% manual workflow
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setProcessedInvoice(data.processed);
      setStep("idle");
    } catch (err: any) {
      setError(err.message || "Failed to run business rules.");
      setStep("error");
    }
  };

  const handleDownload = async () => {
    if (!processedInvoice) return;

    setStep("generating");
    try {
      // Send invoice JSON + original PDF file via FormData for overlay generation
      const formData = new FormData();
      formData.append("invoice", JSON.stringify(processedInvoice.markedUp));

      const res = await fetch("/api/invoice/generate", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = processedInvoice.markedUp.invoiceNumber
        ? `Invoice_${processedInvoice.markedUp.invoiceNumber}_Processed.pdf`
        : "Processed_Invoice.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      setStep("complete");
    } catch (err: any) {
      setError(err.message || "Failed to download PDF.");
      setStep("error");
    }
  };

  const reset = () => {
    setStep("idle");
    setError(null);
    setParsedInvoice(null);
    setProcessedInvoice(null);
    setLogoDataUrl(undefined);
    setPoNumber("");
    setOriginalFile(null);
  };

  // UI Sections
  const renderContent = () => {
    if (step === "error")
      return <ErrorState message={error || ""} onRetry={reset} />;
    if (step === "complete" && processedInvoice)
      return (
        <DownloadResultCard
          onReset={reset}
          invoice={processedInvoice.markedUp}
          logoDataUrl={logoDataUrl}
        />
      );

    // 1. Initial State: Upload
    if (
      !parsedInvoice &&
      (step === "idle" || step === "uploading" || step === "parsing")
    ) {
      return (
        <div className="space-y-12">
          <FileUploadDropzone
            onFileSelect={handleFileSelect}
            isLoading={step !== "idle"}
          />
          <EmailAutomationArchitectureCard />
        </div>
      );
    }

    // 2. Middle State: Review & Edit
    if (parsedInvoice && !processedInvoice) {
      return (
        <div className="space-y-10 animate-fade-in">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={reset}
              className="font-bold text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              CANCEL
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest text-primary">
                Live Review Session
              </span>
            </div>
          </div>

          <InvoiceHeaderCard invoice={parsedInvoice} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <LineItemsEditor
                items={parsedInvoice.lineItems}
                onChange={(items) =>
                  setParsedInvoice({ ...parsedInvoice, lineItems: items })
                }
              />
              <InvoicePartyDetails invoice={parsedInvoice} />
              <ExtractedTextViewer rawText={parsedInvoice.extractedRawText} />
            </div>

            <div className="space-y-8">
              <PurchaseOrderReplacementCard
                detected={parsedInvoice.poPlaceholderDetected}
                matchedText={parsedInvoice.poOriginalText}
                poNumber={poNumber}
                onPOChange={setPoNumber}
              />

              <Button
                onClick={handleProcess}
                className="w-full h-20 rounded-3xl font-black text-xl tracking-tighter bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/20 group"
              >
                APPLY MARKUP
                <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
              </Button>

              <div className="glass-card p-6 rounded-2xl flex items-start space-x-3 opacity-60">
                <Sparkles className="w-5 h-5 text-accent shrink-0" />
                <p className="text-[10px] leading-relaxed font-bold uppercase tracking-wider text-muted-foreground">
                  Our system extracted {parsedInvoice.lineItems.length} line
                  items with
                  {parsedInvoice.lowConfidence
                    ? " low-confidence "
                    : " high-confidence "}
                  accuracy. Please verify values before proceeding.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 3. Final State: Comparison & Final Step
    if (processedInvoice) {
      return (
        <div className="space-y-8">
          <Button
            variant="ghost"
            onClick={() => setProcessedInvoice(null)}
            className="font-bold text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            BACK TO EDITOR
          </Button>
          <InvoicePreviewCard
            processed={processedInvoice}
            onDownload={handleDownload}
            isDownloading={step === "generating"}
            logoDataUrl={logoDataUrl}
          />
        </div>
      );
    }

    return <EmptyState />;
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Dynamic Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:100px_100px] pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-tr from-primary/5 via-background to-accent/5 pointer-events-none" />

      <main className="relative z-10 container max-w-6xl mx-auto px-6 py-12 md:py-20 lg:py-24">
        {/* Page Header */}
        <header className="mb-16 text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] animate-fade-in">
            <Sparkles className="w-3 h-3" />
            <span>Industrial Grade Processing</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[0.9] lg:max-w-3xl mx-auto">
            Invoice <span className="gradient-text">Automation</span> Console
          </h1>
          <p className="text-muted-foreground text-sm font-medium tracking-tight max-w-sm mx-auto opacity-70">
            Secure, stateless document transformation with real-time markup and
            PO resolution.
          </p>
        </header>

        <ProcessingStatusBanner currentStep={step} error={error} />

        <div className="mt-8">{renderContent()}</div>
      </main>

      {/* Persistent Meta Footer */}
      <footer className="relative z-10 container border-t border-border/30 pb-12 pt-8 text-center">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] opacity-40">
          <span>STATLESS-ENGINE-V1.6.0</span>
          <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-border" />
          <span>ZERO-DATABASE-PERSISTENCE</span>
          <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-border" />
          <span>ENCRYPTED-BUFFER-ONLY</span>
        </div>
      </footer>
    </div>
  );
}
