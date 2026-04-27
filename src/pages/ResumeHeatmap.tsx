import { useRef, useState } from "react";
import { extractFromFile } from "@/lib/extract-text";
import { apiHeatmap } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Upload, Flame, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

type HeatmapResult = {
  role: string;
  overallScore: number;
  sections: { name: string; score: number; feedback: string; present: boolean }[];
  strongest: string;
  weakest: string;
  summary: string;
};

function getHeatColor(score: number): string {
  if (score >= 80) return "bg-success text-success-foreground";
  if (score >= 60) return "bg-success/60 text-success-foreground";
  if (score >= 40) return "bg-warning text-warning-foreground";
  if (score >= 20) return "bg-orange-500 text-white";
  return "bg-destructive text-destructive-foreground";
}

function getBarColor(score: number): string {
  if (score >= 80) return "bg-success";
  if (score >= 60) return "bg-success/70";
  if (score >= 40) return "bg-warning";
  if (score >= 20) return "bg-orange-500";
  return "bg-destructive";
}

function getLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  if (score >= 20) return "Weak";
  return "Missing";
}

export default function ResumeHeatmap() {
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HeatmapResult | null>(null);
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
      const data = await apiHeatmap({ resumeText });
      setResult(data);
    } catch (e: any) { toast.error(e.message || "Failed to analyze."); }
    finally { setLoading(false); }
  };

  const overallColor = !result ? "" : result.overallScore >= 70 ? "text-success" : result.overallScore >= 45 ? "text-warning" : "text-destructive";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Resume Heatmap Analysis</h1>
        <p className="text-muted-foreground">Visualize the strength of each section in your resume.</p>
      </div>

      <Card className="glass-card border-0 shadow-soft">
        <CardHeader><CardTitle>Upload Resume</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-smooth">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Upload PDF or DOCX</p>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.doc" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          </div>
          <Textarea placeholder="Or paste your resume text here..." rows={5} value={resumeText}
            onChange={e => setResumeText(e.target.value)} className="resize-none text-xs" />
          <Button onClick={analyze} disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow shadow-glow">
            {loading ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Analyzing...</> : <><Flame className="h-4 w-4 mr-2" />Generate Heatmap</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Overall score */}
          <Card className="glass-card border-0 shadow-elegant overflow-hidden relative">
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-3xl" />
            <CardContent className="pt-6 pb-6 relative">
              <div className="grid md:grid-cols-3 gap-6 items-center">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Overall Strength</p>
                  <div className={`font-display text-6xl font-bold ${overallColor}`}>{result.overallScore}</div>
                  <p className="text-xs text-muted-foreground mt-1">{result.role}</p>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <p className="text-sm">{result.summary}</p>
                  <div className="flex gap-4 mt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span>Strongest: <strong>{result.strongest}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingDown className="h-4 w-4 text-destructive" />
                      <span>Weakest: <strong>{result.weakest}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Heatmap grid */}
          <div>
            <h2 className="font-display text-lg font-bold mb-3">Section Heatmap</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {result.sections.map(s => (
                <div key={s.name} className="flex flex-col items-center gap-2">
                  <div className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center ${getHeatColor(s.score)} transition-smooth`}>
                    <span className="font-display font-bold text-2xl">{s.score}</span>
                    <span className="text-xs opacity-80">{getLabel(s.score)}</span>
                  </div>
                  <span className="text-xs font-medium text-center">{s.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed breakdown */}
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold">Detailed Breakdown</h2>
            {result.sections.map(s => (
              <Card key={s.name} className="glass-card border-0 shadow-soft">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="font-medium text-sm w-28 shrink-0">{s.name}</span>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${getBarColor(s.score)}`} style={{ width: `${s.score}%` }} />
                      </div>
                    </div>
                    <span className={`text-sm font-bold w-12 text-right ${s.present ? "" : "text-muted-foreground"}`}>{s.score}/100</span>
                    <span className={`text-xs w-16 text-right ${s.present ? "text-muted-foreground" : "text-destructive"}`}>{getLabel(s.score)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-32">{s.feedback}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Color legend */}
          <Card className="glass-card border-0 shadow-soft">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Score Legend</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {[["80–100","Excellent","bg-success"],["60–79","Good","bg-success/60"],["40–59","Fair","bg-warning"],["20–39","Weak","bg-orange-500"],["0–19","Missing","bg-destructive"]].map(([range,label,color]) => (
                  <div key={range} className="flex items-center gap-2 text-xs">
                    <div className={`h-3 w-3 rounded-sm ${color}`} />
                    <span>{range} — {label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
