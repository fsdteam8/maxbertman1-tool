"use client";

import React, { useState, useCallback } from "react";
import {
  Sparkles,
  Upload,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type ToolStep = "idle" | "processing" | "done" | "error";

export default function ToolPage() {
  const [step, setStep] = useState<ToolStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [poNumber, setPoNumber] = useState("");
  const [woNumber, setWoNumber] = useState("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFilename, setResultFilename] = useState("Processed_Invoice.pdf");
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    console.log(
      "[Tool] File selected:",
      selected?.name,
      selected?.type,
      selected?.size,
    );
    if (selected) {
      // Validate PDF - accept both by MIME type and by file extension
      const isPDF =
        selected.type === "application/pdf" ||
        selected.name.toLowerCase().endsWith(".pdf");

      if (!isPDF) {
        const msg = "Please upload a PDF file.";
        console.error(
          "[Tool] Invalid file type:",
          selected.type,
          "name:",
          selected.name,
        );
        setError(msg);
        // Reset the input
        e.target.value = "";
        return;
      }
      setFile(selected);
      setError(null);
      console.log("[Tool] File accepted:", selected.name);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      // Validate PDF - accept both by MIME type and by file extension
      const isPDF =
        dropped.type === "application/pdf" ||
        dropped.name.toLowerCase().endsWith(".pdf");

      if (!isPDF) {
        console.error(
          "[Tool] Invalid dropped file type:",
          dropped.type,
          "name:",
          dropped.name,
        );
        setError("Please upload a PDF file.");
        return;
      }
      setFile(dropped);
      setError(null);
      console.log("[Tool] File dropped:", dropped.name);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleSubmit = async () => {
    if (!file) {
      const msg = "Please upload an invoice PDF first.";
      console.error("[Tool] No file selected");
      setError(msg);
      return;
    }

    console.log("[Tool] Starting invoice processing...");
    console.log("[Tool] File:", file.name, file.size, "bytes");
    console.log("[Tool] PO:", poNumber || "(not provided)");
    console.log("[Tool] W.O:", woNumber || "(not provided)");

    setStep("processing");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (poNumber.trim()) {
        formData.append("poNumber", poNumber.trim());
      }
      if (woNumber.trim()) {
        formData.append("woNumber", woNumber.trim());
      }

      console.log("[Tool] FormData prepared, sending to API...");
      const res = await fetch("/api/invoice/process-pdf", {
        method: "POST",
        body: formData,
      });

      console.log("[Tool] API response status:", res.status);

      if (!res.ok) {
        let errorMsg = `Processing failed (${res.status})`;
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
          console.error("[Tool] API error response:", data);
        } catch {
          console.error("[Tool] Could not parse error response");
          const text = await res.text();
          console.error("[Tool] Error response text:", text);
        }
        throw new Error(errorMsg);
      }

      const blob = await res.blob();
      console.log("[Tool] Received response blob:", blob.size, "bytes");

      const url = window.URL.createObjectURL(blob);

      // Extract filename from Content-Disposition header
      const disposition = res.headers.get("Content-Disposition");
      let fname = "Processed_Invoice.pdf";
      if (disposition) {
        const match = /filename="?([^";\n]+)"?/.exec(disposition);
        if (match) fname = match[1];
      }

      console.log("[Tool] Processing successful, filename:", fname);
      setResultUrl(url);
      setResultFilename(fname);
      setStep("done");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to process the invoice.";
      console.error("[Tool] Error:", msg, err);
      setError(msg);
      setStep("error");
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = resultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const reset = () => {
    if (resultUrl) window.URL.revokeObjectURL(resultUrl);
    setStep("idle");
    setError(null);
    setFile(null);
    setPoNumber("");
    setWoNumber("");
    setResultUrl(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:100px_100px] pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-tr from-primary/5 via-background to-accent/5 pointer-events-none" />

      <main className="relative z-10 container max-w-2xl mx-auto px-6 py-12 md:py-20 lg:py-24">
        {/* Header */}
        <header className="mb-16 text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] animate-fade-in">
            <Sparkles className="w-3 h-3" />
            <span>Industrial Grade Processing</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[0.9]">
            Invoice <span className="gradient-text">Automation</span> Console
          </h1>
          <p className="text-muted-foreground text-sm font-medium tracking-tight max-w-sm mx-auto opacity-70">
            Upload an invoice PDF, enter a PO number, and download the processed
            result.
          </p>
        </header>

        {/* Main Card */}
        <div className="glass-card rounded-3xl p-8 md:p-10 space-y-8 shadow-2xl border border-border/40 backdrop-blur-xl">
          {/* Success State */}
          {step === "done" && (
            <div className="text-center space-y-6 py-8 animate-fade-in">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight mb-2">
                  Processing Complete
                </h2>
                <p className="text-muted-foreground text-sm">
                  Your invoice has been processed with 1% markup
                  {woNumber.trim() ? ` and W.O. # ${woNumber.trim()}` : ""}
                  {poNumber.trim() ? ` and PO# ${poNumber.trim()}` : ""}{" "}
                  applied.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={handleDownload}
                  className="h-14 px-8 rounded-2xl font-black text-base tracking-tight bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 group"
                >
                  <Download className="w-5 h-5 mr-2 group-hover:translate-y-0.5 transition-transform" />
                  Download PDF
                </Button>
                <Button
                  onClick={reset}
                  variant="outline"
                  className="h-14 px-8 rounded-2xl font-bold text-sm tracking-tight"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Process Another
                </Button>
              </div>
            </div>
          )}

          {/* Error State */}
          {step === "error" && (
            <div className="text-center space-y-4 py-4 animate-fade-in">
              <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-400 mb-1">
                  Processing Failed
                </h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  {error}
                </p>
              </div>
              <Button
                onClick={reset}
                variant="outline"
                className="h-12 px-6 rounded-xl font-bold text-sm"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {/* Form State */}
          {(step === "idle" || step === "processing") && (
            <>
              {/* File Upload */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  Invoice PDF
                </label>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer group
                    ${
                      isDragging
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : file
                          ? "border-emerald-500/40 bg-emerald-500/5"
                          : "border-border/50 hover:border-primary/40 hover:bg-primary/5"
                    }`}
                >
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    style={{ pointerEvents: "auto" }}
                    disabled={step === "processing"}
                    id="pdf-upload"
                    aria-label="Upload PDF invoice"
                  />
                  {file ? (
                    <div className="flex items-center justify-center space-x-3 pointer-events-none">
                      <FileText className="w-6 h-6 text-emerald-500" />
                      <span className="font-bold text-sm">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2 pointer-events-none">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
                      <p className="text-sm font-bold text-muted-foreground">
                        Drop your invoice PDF here or{" "}
                        <span className="text-primary">browse</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* W.O. Number Input */}
              <div>
                <label
                  htmlFor="wo-number"
                  className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3"
                >
                  W.O. # <span className="opacity-50">(optional)</span>
                </label>
                <input
                  id="wo-number"
                  type="text"
                  value={woNumber}
                  onChange={(e) => setWoNumber(e.target.value)}
                  placeholder="e.g. 12903"
                  disabled={step === "processing"}
                  className="w-full h-14 px-5 rounded-2xl bg-background border border-border/50 text-foreground font-mono text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all disabled:opacity-50"
                />
              </div>

              {/* PO Number Input */}
              <div>
                <label
                  htmlFor="po-number"
                  className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3"
                >
                  Order / PO # <span className="opacity-50">(optional)</span>
                </label>
                <input
                  id="po-number"
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="e.g. 91737459936384"
                  disabled={step === "processing"}
                  className="w-full h-14 px-5 rounded-2xl bg-background border border-border/50 text-foreground font-mono text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all disabled:opacity-50"
                />
              </div>

              {/* Inline Error */}
              {error && step === "idle" && (
                <div className="flex items-center space-x-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={!file || step === "processing"}
                className="w-full h-16 rounded-2xl font-black text-lg tracking-tight bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/20 group disabled:opacity-40 disabled:shadow-none transition-all"
              >
                {step === "processing" ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Processing Invoice…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                    Process Invoice
                  </>
                )}
              </Button>

              {/* Info Note */}
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 text-center leading-relaxed">
                All amounts will be adjusted with 1% markup
                {poNumber.trim() || woNumber.trim()
                  ? ` • Replacements dynamically painted over line`
                  : ""}
                &nbsp;• Original layout preserved
              </p>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 container border-t border-border/30 pb-12 pt-8 text-center">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] opacity-40">
          <span>OVERLAY-ENGINE-V2.0.0</span>
          <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-border" />
          <span>ZERO-DATABASE-PERSISTENCE</span>
          <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-border" />
          <span>ORIGINAL-PDF-PRESERVED</span>
        </div>
      </footer>
    </div>
  );
}
