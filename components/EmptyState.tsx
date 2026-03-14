import React from "react";
import { FileQuestion, UploadCloud } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="w-24 h-24 rounded-3xl bg-secondary flex items-center justify-center text-primary mb-8 relative">
        <FileQuestion className="w-10 h-10" />
        <div className="absolute -top-2 -right-2 bg-primary w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground animate-bounce">
          <UploadCloud className="w-4 h-4" />
        </div>
      </div>
      <h3 className="text-xl font-bold tracking-tight mb-2">No Invoice Selected</h3>
      <p className="text-sm text-muted-foreground max-w-xs text-center leading-relaxed">
        Upload a PDF invoice to start the automated extraction and markup process.
      </p>
    </div>
  );
}
