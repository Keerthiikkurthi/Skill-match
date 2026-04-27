import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export function AuthLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="min-h-screen flex bg-background mesh-bg">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary-glow to-accent text-primary-foreground p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-float" />
        <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-float" style={{ animationDelay: "2s" }} />
        <Link to="/" className="flex items-center gap-2 relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-display font-bold text-lg">ResumeAnalyzer</span>
        </Link>
        <div className="relative">
          <h2 className="font-display text-4xl font-bold leading-tight">Get past the ATS.<br />Get the interview.</h2>
          <p className="mt-4 text-white/80 max-w-md">Join thousands using AI to perfect their resumes and land their dream roles.</p>
        </div>
        <div className="text-sm text-white/70 relative">© {new Date().getFullYear()} Resume Analyzer</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md animate-fade-in-up">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">Resume<span className="gradient-text">Analyzer</span></span>
          </Link>
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
