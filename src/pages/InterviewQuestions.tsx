import { useRef, useState } from "react";
import { extractFromFile } from "@/lib/extract-text";
import { apiInterviewQuestions } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, MessageSquare, RefreshCw, Lightbulb, ChevronDown, ChevronUp, Cpu } from "lucide-react";
import { toast } from "sonner";

type Difficulty = "easy" | "medium" | "hard";

type Question = {
  question: string;
  category: string;
  hint: string;
};

type Result = {
  role: string;
  difficulty: string;
  questions: Question[];
  tips: string[];
};

const CATEGORY_COLORS: Record<string, string> = {
  "Technical":    "bg-primary/10 text-primary",
  "Behavioral":   "bg-success/10 text-success",
  "Situational":  "bg-warning/10 text-warning",
  "Role-Specific":"bg-accent/10 text-accent-foreground",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy:   "bg-success/10 text-success border-success/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  hard:   "bg-destructive/10 text-destructive border-destructive/30",
};

export default function InterviewQuestions() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    try {
      toast.info("Extracting text from resume...");
      const text = await extractFromFile(file);
      setResumeText(text);
      toast.success("Resume loaded.");
    } catch { toast.error("Failed to read file."); }
  };

  const generate = async () => {
    if (!resumeText.trim()) { toast.error("Please upload or paste your resume first."); return; }
    setLoading(true);
    setResult(null);
    try {
      const data = await apiInterviewQuestions({ resumeText, jobDescription: jobDescription || undefined, difficulty });
      setResult(data);
      toast.success(`Generated ${data.questions?.length || 0} questions for ${data.role}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate questions.");
    } finally {
      setLoading(false);
    }
  };

  // Normalize questions — handle both {question,category,hint} and plain string formats
  const normalizedQuestions: Question[] = (result?.questions || []).map((q: any) =>
    typeof q === "string"
      ? { question: q, category: "General", hint: "Use the STAR method to structure your answer." }
      : q
  );

  const categories = [...new Set(normalizedQuestions.map(q => q.category))];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Interview Question Generator</h1>
        <p className="text-muted-foreground">
          GPT-4.1 Mini analyzes your resume and generates personalized, role-specific interview questions.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Resume input */}
        <Card className="glass-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Your Resume</CardTitle>
            <CardDescription>Upload a file or paste your resume text</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-smooth">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Click to upload PDF or DOCX</p>
              <p className="text-xs text-muted-foreground mt-1">or paste text below</p>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.doc" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
            </div>
            <Textarea placeholder="Or paste your resume text here..." rows={6}
              value={resumeText} onChange={e => setResumeText(e.target.value)}
              className="resize-none text-xs" />
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="glass-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Customize your question set</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Difficulty Level</p>
              <div className="flex gap-2">
                {(["easy","medium","hard"] as Difficulty[]).map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize border transition-smooth ${difficulty === d ? DIFFICULTY_COLORS[d] : "border-border hover:bg-muted"}`}>
                    {d}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {difficulty === "easy" ? "Fundamentals, past experience, basic concepts" :
                 difficulty === "medium" ? "Problem-solving, design decisions, trade-offs" :
                 "System design, architecture, complex scenarios"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Job Description <span className="text-muted-foreground font-normal">(optional)</span></p>
              <Textarea placeholder="Paste the job description for more targeted questions..."
                rows={6} value={jobDescription}
                onChange={e => setJobDescription(e.target.value.slice(0, 3000))}
                className="resize-none text-xs" />
              <p className="text-xs text-muted-foreground mt-1">{jobDescription.length}/3000</p>
            </div>
            <Button onClick={generate} disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-primary-glow shadow-glow h-11">
              {loading
                ? <><Cpu className="h-4 w-4 mr-2 animate-pulse" />GPT-4.1 Mini is analyzing...</>
                : <><MessageSquare className="h-4 w-4 mr-2" />Generate Questions</>}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center flex-wrap gap-2">
            <Badge className={DIFFICULTY_COLORS[result.difficulty] + " capitalize border"}>{result.difficulty}</Badge>
            <Badge className="bg-primary/10 text-primary">{result.role}</Badge>
            <span className="text-sm text-muted-foreground ml-auto">{normalizedQuestions.length} questions generated by GPT-4.1 Mini</span>
          </div>

          {/* Category filter pills */}
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <span key={cat} className={`text-xs px-3 py-1 rounded-full font-medium ${CATEGORY_COLORS[cat] || "bg-muted text-muted-foreground"}`}>
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* Questions */}
          <div className="space-y-3">
            {normalizedQuestions.map((q, i) => (
              <Card key={i} className="glass-card border-0 shadow-soft cursor-pointer hover:shadow-md transition-smooth"
                onClick={() => setExpanded(expanded === i ? null : i)}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[q.category] || "bg-muted text-muted-foreground"}`}>
                          {q.category}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{q.question}</p>
                    </div>
                    {expanded === i
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />}
                  </div>

                  {expanded === i && q.hint && (
                    <div className="mt-3 ml-10 p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-xs font-medium text-primary mb-1">💡 How to answer:</p>
                      <p className="text-xs text-muted-foreground">{q.hint}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tips */}
          {result.tips && result.tips.length > 0 && (
            <Card className="glass-card border-0 shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="h-5 w-5 text-warning" />Interview Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.tips.map((tip, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-warning shrink-0">•</span>{tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!loading && !result && (
        <Card className="border-dashed bg-transparent">
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Upload your resume and click Generate to get personalized interview questions.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
