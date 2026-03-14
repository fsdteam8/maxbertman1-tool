import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, Mail, FileCheck, Sparkles } from "lucide-react";

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Premium Background Effects */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:100px_100px] pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-tr from-primary/10 via-background to-accent/5 pointer-events-none" />
      
      {/* Hero Section */}
      <header className="relative z-10 container max-w-6xl mx-auto px-6 pt-32 pb-24 text-center">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-black uppercase tracking-[0.2em] mb-8 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Stateless Enterprise Automation</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.85] mb-8">
          Invoice <br />
          <span className="gradient-text">Automation</span> <br />
          <span className="inline-flex items-center">
            Scale <ArrowRight className="w-12 h-12 md:w-20 md:h-20 ml-4 mb-2 text-muted-foreground/30" />
          </span>
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-12 font-medium">
          Transform invoices with automatic 1% markups and PO resolution. 
          Zero database persistence. Zero manual overhead.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link href="/tool">
            <Button size="lg" className="h-16 px-10 rounded-2xl text-lg font-bold bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/20 group">
              LAUNCH CONSOLE
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Button variant="outline" size="lg" className="h-16 px-10 rounded-2xl text-lg font-bold border-border/50 hover:bg-white/5">
            READ DOCS
          </Button>
        </div>

        {/* Floating Feature Icons */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <MarketingFeature 
            icon={<Zap className="w-6 h-6" />}
            title="Instant Markup"
            desc="Automated 1% margin injection across all line items, tax rows, and totals."
          />
          <MarketingFeature 
            icon={<Shield className="w-6 h-6" />}
            title="Stateless Ops"
            desc="Data is processed in-memory and never stored on disk. Enterprise privacy by design."
          />
          <MarketingFeature 
            icon={<Mail className="w-6 h-6" />}
            title="Email Native"
            desc="Fully automated webhook pipeline. Reply to invoices with processed versions instantly."
          />
        </div>
      </header>

      {/* Decorative Gradient Blob */}
      <div className="fixed -bottom-48 -left-48 w-96 h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -top-48 -right-48 w-96 h-96 bg-accent/20 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}

function MarketingFeature({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="glass-card p-8 rounded-3xl space-y-4 hover:border-primary/50 transition-colors group">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {desc}
      </p>
    </div>
  );
}
