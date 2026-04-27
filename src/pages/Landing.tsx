import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, FileScan, Camera, BarChart3, Zap, ShieldCheck, Target } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background mesh-bg">
      {/* Header */}
      <header className="container mx-auto flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg">Resume<span className="gradient-text">Analyzer</span></span>
        </div>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/signin">Sign In</Link>
          </Button>
          <Button asChild size="sm" className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-smooth shadow-glow">
            <Link to="/signup">Get Started</Link>
          </Button>
        </nav>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-12 pb-20 sm:pt-20 sm:pb-32 text-center">
        <div className="animate-fade-in-up">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 backdrop-blur px-4 py-1.5 text-xs font-medium text-muted-foreground mb-8 shadow-soft">
            <Zap className="h-3.5 w-3.5 text-primary" />
            AI-powered ATS scoring in seconds
          </div>
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.05]">
            Beat the bots.
            <br />
            <span className="gradient-hero-text">Land the interview.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Instantly analyze your resume against any job description. Get an ATS score, missing keywords, and actionable feedback to stand out.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-smooth shadow-glow text-base h-12 px-8">
              <Link to="/signup">
                Analyze my resume <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base h-12 px-8">
              <Link to="/signin">Sign in</Link>
            </Button>
          </div>
        </div>

        {/* Floating preview card */}
        <div className="mt-20 max-w-3xl mx-auto animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="glass-card rounded-2xl p-8 shadow-elegant relative">
            <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-gradient-to-br from-primary to-accent opacity-20 blur-2xl animate-pulse-glow" />
            <div className="grid sm:grid-cols-3 gap-6 text-left">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">ATS Score</div>
                <div className="font-display text-5xl font-bold gradient-text">87</div>
                <div className="text-xs text-success mt-1">Strong match</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Keywords matched</div>
                <div className="flex flex-wrap gap-1.5">
                  {["React", "TypeScript", "API", "Agile"].map((k) => (
                    <span key={k} className="rounded-full bg-success/10 text-success text-xs px-2.5 py-1 font-medium">{k}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Suggestions</div>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Add &quot;CI/CD&quot; experience</li>
                  <li>• Quantify project impact</li>
                  <li>• Use stronger action verbs</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl font-bold">Everything you need to <span className="gradient-text">get hired</span></h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">Built with modern AI techniques to give you a real edge in today&apos;s job market.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: FileScan, title: "Upload PDF or DOCX", desc: "Drop your resume and we extract the text instantly with high accuracy." },
            { icon: Camera, title: "Capture with Camera", desc: "On the go? Snap a photo of a printed resume and we&apos;ll OCR it for you." },
            { icon: Target, title: "Job-Description Matching", desc: "Paste any JD to see exactly which keywords you&apos;re missing." },
            { icon: BarChart3, title: "Detailed Analytics", desc: "Track score history, see trends, and watch your resume get stronger." },
            { icon: ShieldCheck, title: "Private & Secure", desc: "Your data stays in your account. Nothing shared, nothing leaked." },
            { icon: Zap, title: "Instant Feedback", desc: "Get actionable improvements in seconds — formatting, verbs, structure." },
          ].map((f, i) => (
            <div
              key={f.title}
              className="glass-card rounded-2xl p-6 shadow-soft hover:shadow-elegant hover:-translate-y-1 transition-spring"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 mb-4">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: f.desc }} />
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="glass-card rounded-3xl p-12 text-center shadow-elegant relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 -z-10" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold">Ready to upgrade your resume?</h2>
          <p className="mt-3 text-muted-foreground">Free to get started — no credit card needed.</p>
          <Button asChild size="lg" className="mt-8 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-smooth shadow-glow h-12 px-8">
            <Link to="/signup">Create free account <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Resume Analyzer. Built to help you stand out.
      </footer>
    </div>
  );
}
