import { useRef, useState } from "react";
import { extractFromFile } from "@/lib/extract-text";
import { apiRoleSuggestions } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, Wand2, RefreshCw, CheckCircle2, XCircle, Zap, Star } from "lucide-react";
import { toast } from "sonner";

type SuggestionsResult = {
  detectedRole: string;
  mustHave: string[];
  niceToHave: string[];
  actionVerbs: { used: string[]; missing: string[] };
  sections: { section: string; present: boolean }[];
  quickWins: string[];
};

export default function RoleSuggestions() {
  const [resumeText, setResumeText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuggestionsResult | null>(null);
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
      const data = await apiRoleSuggestions({ resumeText, targetRole: targetRole || undefined });
      setResult(data);
    } catch (e: any) { toast.error(e.message || "Failed to analyze."); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Role-Based Resume Suggestions</h1>
        <p className="text-muted-foreground">Get tailored suggestions to optimize your resume for a specific role.</p>
      </div>

      <Card className="glass-card border-0 shadow-soft">
        <CardHeader><CardTitle>Upload Resume</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-smooth">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Upload PDF or DOCX</p>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.doc" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
            </div>
            <div className="space-y-2">
              <Input placeholder="Target role (optional, e.g. 'Data Scientist')" value={targetRole}
                onChange={e => setTargetRole(e.target.value)} />
              <p className="text-xs text-muted-foreground">Leave blank to auto-detect from your resume.</p>
            </div>
          </div>
          <Textarea placeholder="Or paste your resume text here..." rows={5} value={resumeText}
            onChange={e => setResumeText(e.target.value)} className="resize-none text-xs" />
          <Button onClick={analyze} disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow shadow-glow">
            {loading ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Analyzing...</> : <><Wand2 className="h-4 w-4 mr-2" />Get Suggestions</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary">{result.detectedRole}</Badge>
            <span className="text-sm text-muted-foreground">Tailored suggestions for this role</span>
          </div>

          {result.overallAssessment && (
            <Card className="glass-card border-0 shadow-soft border-l-4 border-l-primary">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm italic text-muted-foreground">"{result.overallAssessment}"</p>
              </CardContent>
            </Card>
          )}

          {result.quickWins.length > 0 && (
            <Card className="glass-card border-0 shadow-soft border-l-4 border-l-warning">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base"><Zap className="h-5 w-5 text-warning" />Quick Wins</CardTitle>
                <CardDescription>Fix these first for the biggest impact</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.quickWins.map((w, i) => (
                    <li key={i} className="flex gap-2 text-sm"><span className="text-warning font-bold">→</span>{w}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="glass-card border-0 shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base"><Star className="h-5 w-5 text-destructive" />Must Have</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.mustHave.map((item, i) => <li key={i} className="flex gap-2 text-sm"><span className="text-destructive">✦</span>{item}</li>)}
                </ul>
              </CardContent>
            </Card>
            <Card className="glass-card border-0 shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base"><Star className="h-5 w-5 text-success" />Nice to Have</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.niceToHave.map((item, i) => <li key={i} className="flex gap-2 text-sm"><span className="text-success">✦</span>{item}</li>)}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="glass-card border-0 shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Action Verbs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.actionVerbs.used.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Already using:</p>
                    <div className="flex flex-wrap gap-1">
                      {result.actionVerbs.used.map(v => <span key={v} className="rounded-full bg-success/10 text-success text-xs px-2 py-0.5">{v}</span>)}
                    </div>
                  </div>
                )}
                {result.actionVerbs.missing.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Add these:</p>
                    <div className="flex flex-wrap gap-1">
                      {result.actionVerbs.missing.map(v => <span key={v} className="rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">{v}</span>)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-0 shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Section Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.sections.map(s => (
                    <li key={s.section} className="flex items-start gap-2 text-sm">
                      {s.present
                        ? <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        : <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={s.present ? "font-medium" : "text-muted-foreground"}>{s.section}</span>
                          {s.quality && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              s.quality === "strong" ? "bg-success/10 text-success" :
                              s.quality === "moderate" ? "bg-warning/10 text-warning" :
                              s.quality === "missing" ? "bg-destructive/10 text-destructive" :
                              "bg-muted text-muted-foreground"}`}>
                              {s.quality}
                            </span>
                          )}
                        </div>
                        {s.suggestion && <p className="text-xs text-muted-foreground mt-0.5">{s.suggestion}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
