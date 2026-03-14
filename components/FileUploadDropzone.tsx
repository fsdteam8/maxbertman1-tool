"use client";

import React, { useCallback, useState } from "react";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileUploadDropzoneProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export function FileUploadDropzone({ onFileSelect, isLoading }: FileUploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateAndSelect = (file: File) => {
    setError(null);
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("File size exceeds 20MB limit.");
      return;
    }
    onFileSelect(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSelect(file);
  }, [onFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSelect(file);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative group cursor-pointer transition-all duration-300",
          "border-2 border-dashed rounded-3xl p-12 text-center",
          "glass-card hover:border-primary/50",
          isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border",
          isLoading && "opacity-50 pointer-events-none"
        )}
      >
        <input
          type="file"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={handleFileInput}
          accept=".pdf"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-300",
            isDragging ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"
          )}>
            <Upload className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-tight">
              Upload Invoice PDF
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Drag and drop your invoice here, or click to browse. Supported: PDF (Max 20MB).
            </p>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-destructive text-sm font-medium animate-fade-in">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
