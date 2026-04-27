import { useRef, useState } from "react";
import { extractFromFile } from "@/lib/extract-text";
import { apiRecruiterFeedback } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Upload, UserCheck, RefreshCw, CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";
import { toast } from "sonner";

type FeedbackResult = {
  role: string;
  verdict: string;
  callbackLikelihood: number;
  positives: string[];
  concerns: string[];
  suggestions: string[];
  firstImpression: string;
};

export default function RecruiterFeedback() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FeedbackResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    try {
      toast.info("Extracting text...");
      const text = await extractFromFile(file);
      setResumeText(text);
      toast.success("Resume loaded.");
    } catch { toast.error("Failed to read file."); }
  };

  const analyze = async () => {
    if (!resumeText.trim()) { toast.error("Please upload or paste your resume first."); return; }
    setLoading(true);
    try {
      const data = await apiRecruiterFeedback({ resumeText, jobDescription: jobDescription || undefined });
      setResult(data);
    } catch (e: any) { toast.error(e.message || "Failed to simulate feedback."); }
    finally { setLoading(false); }
  };

  const likelihoodColor = !result ? "" : result.callbackLikelihood >= 70 ? "text-success" : result.callbackLikelihood >= 40 ? "text-warning" : "text-destructive";
  const likelihoodLabel = !result ? "" : result.callbackLikelihood >= 70 ? "High" : result.callbackLikelihood >= 40 ? "Medium" : "Low";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Recruiter Feedback Simulation</h1>
        <p className="text-muted-foreground">See your resume through a recruiter's eyes — honest, actionable feedback.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-card border-0 shadow-soft">
          <CardHeader><CardTitle>Your Resume</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-smooth">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Upload PDF or DOCX</p>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.doc" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
            </div>
            <Textarea placeholder="Or paste your resume text here..." rows={7} value={resumeText}
              onChange={e => setResumeText(e.target.value)} className="resize-none text-xs" />
          </CardContent>
        </Card>

        <Card className="glass-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Job Description</CardTitle>
            <CardDescription>Optional — improves feedback accuracy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea placeholder="Paste the job description here..." rows={10} value={jobDescription}
              onChange={e => setJobDescription(e.target.value.slice(0,3000))} className="resize-none text-xs" />
            <Button onClick={analyze} disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow shadow-glow">
              {loading ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Simulating...</> : <><UserCheck className="h-4 w-4 mr-2" />Simulate Recruiter Review</>}
            </Button>
          </CardContent>
        </Card>
      </div>

      {result && (
        <div className="space-y-4 animate-fade-in-up">
          {/* Recruiter card */}
          <Card className="glass-card border-0 shadow-elegant overflow-hidden relative">
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-3xl" />
            <CardContent className="pt-6 pb-6 relative">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shrink-0">
                  <UserCheck className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Senior Recruiter · {result.role}</p>
                  <p className="text-sm italic text-foreground">"{result.firstImpression}"</p>
                  <p className="text-sm font-medium mt-3">{result.verdict}</p>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Callback likelihood</span>
                  <span className={`font-display text-2xl font-bold ${likelihoodColor}`}>{result.callbackLikelihood}% <span className="text-sm">{likelihoodLabel}</span></span>
                </div>
                <Progress value={result.callbackLikelihood} className="h-3" />
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-4">
            <Card className="glass-card border-0 shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-success" />What Works</CardTitle>
              </CardHeader>
              <CardContent>
                {result.positives.length === 0
                  ? <p className="text-xs text-muted-foreground">No strong positives detected.</p>
                  : <ul className="space-y-2">{result.positives.map((p,i) => <li key={i} className="text-xs flex gap-2"><span className="text-success shrink-0">✓</span>{p}</li>)}</ul>}
              </CardContent>
            </Card>

            <Card className="glass-card border-0 shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-destructive" />Concerns</CardTitle>
              </CardHeader>
              <CardContent>
                {result.concerns.length === 0
                  ? <p className="text-xs text-muted-foreground">No major concerns.</p>
                  : <ul className="space-y-2">{result.concerns.map((c,i) => <li key={i} className="text-xs flex gap-2"><span className="text-destructive shrink-0">✗</span>{c}</li>)}</ul>}
              </CardContent>
            </Card>

            <Card className="glass-card border-0 shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><Lightbulb className="h-4 w-4 text-warning" />Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                {result.suggestions.length === 0
                  ? <p className="text-xs text-muted-foreground">No additional suggestions.</p>
                  : <ul className="space-y-2">{result.suggestions.map((s,i) => <li key={i} className="text-xs flex gap-2"><span className="text-warning shrink-0">→</span>{s}</li>)}</ul>}
              </CardContent>
            </Card>
          </div>

          {result.standoutFactor && (
            <Card className="glass-card border-0 shadow-soft border-l-4 border-l-primary">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-primary mb-1">⭐ How to stand out:</p>
                <p className="text-sm">{result.standoutFactor}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
