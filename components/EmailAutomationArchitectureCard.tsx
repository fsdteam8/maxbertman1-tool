import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Mail, 
  ArrowRight, 
  Zap, 
  Search, 
  BarChart3, 
  FileCheck, 
  Shield 
} from "lucide-react";
import { cn } from "@/lib/utils";

export function EmailAutomationArchitectureCard() {
  return (
    <Card className="glass-card border-none overflow-hidden shadow-2xl mt-12">
      <CardContent className="p-0">
        <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-emerald-400/10 p-8 border-b border-white/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="bg-primary/20 p-2 rounded-xl">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Unified Automation Pipeline</h3>
              </div>
              <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
                Our high-speed document processing engine runs entirely in-memory. 
                Zero database persistence. Complete privacy by design.
              </p>
            </div>

            <div className="flex -space-x-3">
              {[1, 2, 3].map((v) => (
                <div key={v} className="w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center text-xs font-bold text-primary shadow-xl">
                  {v}
                </div>
              ))}
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shadow-2xl animate-pulse">
                ✓
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
            {/* Step 1: Inbound */}
            <FlowStep 
              icon={<Mail className="w-5 h-5" />}
              label="Inbound"
              desc="Email Attachment or Web Upload"
              color="text-primary"
              bgColor="bg-primary/10"
            />
            <FlowArrow />
            
            {/* Step 2: Extract */}
            <FlowStep 
              icon={<Search className="w-5 h-5" />}
              label="Extraction"
              desc="Deterministic PDF Parsing"
              color="text-blue-400"
              bgColor="bg-blue-400/10"
            />
            <FlowArrow />
            
            {/* Step 3: Transform */}
            <FlowStep 
              icon={<BarChart3 className="w-5 h-5" />}
              label="Transformation"
              desc="1% Markup & PO Injection"
              color="text-accent"
              bgColor="bg-accent/10"
            />
            <FlowArrow className="lg:hidden" />
            <div className="hidden lg:contents">
              <FlowArrow />
            </div>

            {/* Step 4: Generate */}
            <FlowStep 
              icon={<FileCheck className="w-5 h-5" />}
              label="Generation"
              desc="rebuild professional PDF"
              color="text-emerald-400"
              bgColor="bg-emerald-400/10"
            />
            <FlowArrow />
            
            {/* Step 5: Reply */}
            <FlowStep 
              icon={<Shield className="w-5 h-5" />}
              label="Security"
              desc="Auto-Reply & Buffer Cleanup"
              color="text-white"
              bgColor="bg-white/10"
            />
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-white/5">
            <FeatureBox 
              title="Webhook API" 
              desc="Integrate with SendGrid or Mailgun in seconds using our normalized route." 
            />
            <FeatureBox 
              title="Stateless Ops" 
              desc="No database means no records are stored permanently on our servers." 
            />
            <FeatureBox 
              title="Email Native" 
              desc="Detects PO numbers directly from email subject lines for Zero-UI workflows." 
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FlowStep({ icon, label, desc, color, bgColor }: { icon: React.ReactNode, label: string, desc: string, color: string, bgColor: string }) {
  return (
    <div className="flex flex-col items-center text-center space-y-4 group">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]", bgColor, color)}>
        {icon}
      </div>
      <div className="space-y-1">
        <p className={cn("text-xs font-black uppercase tracking-widest", color)}>{label}</p>
        <p className="text-[10px] text-muted-foreground font-medium leading-tight px-4">{desc}</p>
      </div>
    </div>
  );
}

function FlowArrow({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center", className)}>
      <ArrowRight className="w-6 h-6 text-border/40 rotate-90 lg:rotate-0" />
    </div>
  );
}

function FeatureBox({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-black uppercase tracking-widest text-primary/80">{title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed italic opacity-70">"{desc}"</p>
    </div>
  );
}
