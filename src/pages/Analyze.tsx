import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { addAnalysis, type ResumeAnalysis } from "@/lib/resume-store";
import { extractFromFile, extractFromImage } from "@/lib/extract-text";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload, Camera, FileScan, CheckCircle2, XCircle,
  Lightbulb, RefreshCw, Download, Cpu,
} from "lucide-react";
import { toast } from "sonner";

type Stage = "idle" | "extracting" | "analyzing" | "done";

export default function Analyze() {
  const { user } = useAuth();
  const [jobDescription, setJobDescription] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ResumeAnalysis | null>(null);
  const [source, setSource] = useState<"upload" | "camera">("upload");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [tab, setTab] = useState<"upload" | "camera">("upload");

  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch (err) {
      console.error(err);
      toast.error("Could not access camera. Check browser permissions.");
    }
  };

  const runAnalysis = async (
    text: string,
    fileName: string,
    src: "upload" | "camera"
  ) => {
    if (!text || text.trim().split(/\s+/).length < 30) {
      toast.error("Could not extract enough text from this resume (minimum 30 words).");
      setStage("idle");
      return;
    }

    if (!user) {
      toast.error("Please sign in to analyze your resume.");
      setStage("idle");
      return;
    }

    setStage("analyzing");
    setProgress(90);

    try {
      const analysis = await addAnalysis({
        userId: user.id,
        resumeText: text,
        jobDescription: jobDescription.trim() || undefined,
        fileName,
        source: src,
      });

      setResult(analysis);
      setSource(src);
      setProgress(100);
      setStage("done");
      toast.success(`Analysis complete — score ${analysis.score}/100`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Analysis failed. Please try again.");
      setStage("idle");
    }
  };

  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10 MB limit.");
      return;
    }
    setResult(null);
    setStage("extracting");
    setProgress(10);
    try {
      const text = await extractFromFile(file, (p) =>
        setProgress(10 + Math.round(p * 0.8))
      );
      await runAnalysis(text, file.name, "upload");
    } catch (err) {
      console.error(err);
      toast.error("Failed to read file.");
      setStage("idle");
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob(res, "image/jpeg", 0.9)
    );
    if (!blob) return;
    stopCamera();
    setResult(null);
    setStage("extracting");
    setProgress(5);
    try {
      const text = await extractFromImage(blob, (p) =>
        setProgress(Math.max(5, Math.round(p * 0.9)))
      );
      const name = `Camera capture ${new Date().toLocaleTimeString()}`;
      await runAnalysis(text, name, "camera");
    } catch (err) {
      console.error(err);
      toast.error("OCR failed. Try better lighting.");
      setStage("idle");
    }
  };

  const reset = () => {
    setResult(null);
    setStage("idle");
    setProgress(0);
  };

  const downloadReport = () => {
    if (!result) return;
    const lines = [
      `Resume Analyzer — Report`,
      `=========================`,
      `File: ${result.fileName}`,
      `Date: ${new Date(result.createdAt).toLocaleString()}`,
      `Source: ${result.source}`,
      `Word count: ${result.wordCount}`,
      ``,
      `ATS Score: ${result.score}/100`,
      result.semanticSimilarity != null
        ? `Semantic match: ${Math.round(result.semanticSimilarity * 100)}%`
        : "",
      ``,
      `Matched Keywords (${result.matchedKeywords.length}):`,
      result.matchedKeywords.join(", ") || "—",
      ``,
      `Missing Keywords (${result.missingKeywords.length}):`,
      result.missingKeywords.join(", ") || "—",
      ``,
      `Recommendations:`,
      ...result.feedback.map((f, i) => `${i + 1}. ${f}`),
    ].filter((l) => l !== undefined);

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resume-report-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const busy = stage === "extracting" || stage === "analyzing";
  const scoreColor = !result
    ? ""
    : result.score >= 75
    ? "text-success"
    : result.score >= 50
    ? "text-warning"
    : "text-destructive";
  const scoreLabel = !result
    ? ""
    : result.score >= 75
    ? "Strong"
    : result.score >= 50
    ? "Needs work"
    : "Weak";

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="font-display text-3xl font-bold">ATS Resume Analyzer</h1>
        <p className="text-muted-foreground">
          Upload or capture your resume to get an instant ATS score powered by ML.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Resume input */}
        <Card className="glass-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle>1. Provide your resume</CardTitle>
            <CardDescription>PDF, DOCX, or capture with your camera</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={tab}
              onValueChange={(v) => {
                setTab(v as "upload" | "camera");
                if (v !== "camera") stopCamera();
              }}
            >
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="upload">
                  <Upload className="h-4 w-4 mr-2" />Upload
                </TabsTrigger>
                <TabsTrigger value="camera">
                  <Camera className="h-4 w-4 mr-2" />Camera
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="mt-4">
                <div
                  onClick={() => !busy && fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f && !busy) handleFile(f);
                  }}
                  className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-smooth"
                >
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium">Click or drag a file here</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOCX, or image up to 10 MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="camera" className="mt-4 space-y-3">
                <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center relative">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  {!cameraOn && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70">
                      <Camera className="h-10 w-10 mb-2" />
                      <p className="text-sm">Camera preview</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {!cameraOn ? (
                    <Button onClick={startCamera} disabled={busy} className="flex-1">
                      <Camera className="h-4 w-4 mr-2" />Start camera
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={captureAndAnalyze}
                        disabled={busy}
                        className="flex-1 bg-gradient-to-r from-primary to-primary-glow shadow-glow"
                      >
                        Capture & analyze
                      </Button>
                      <Button onClick={stopCamera} variant="outline">
                        Stop
                      </Button>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Job description */}
        <Card className="glass-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle>2. Job description (optional)</CardTitle>
            <CardDescription>
              Paste the JD for role-specific keyword and semantic matching
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Paste the job description here..."
              rows={10}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value.slice(0, 5000))}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {jobDescription.length} / 5000 characters
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      {busy && (
        <Card className="glass-card border-0 shadow-soft">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              {stage === "analyzing" ? (
                <Cpu className="h-4 w-4 animate-pulse text-primary" />
              ) : (
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              )}
              <span className="text-sm font-medium">
                {stage === "extracting"
                  ? "Extracting text from your resume..."
                  : "Running ML analysis (TF-IDF + CNN embeddings)..."}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-fade-in-up">
          <Card className="glass-card border-0 shadow-elegant overflow-hidden relative">
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 blur-3xl" />
            <CardContent className="pt-8 pb-8 relative">
              <div className="grid md:grid-cols-3 gap-6 items-center">
                <div className="text-center md:text-left">
                  <p className="text-sm text-muted-foreground">ATS Score</p>
                  <div className={`font-display text-7xl font-bold ${scoreColor}`}>
                    {result.score}
                  </div>
                  <p className={`text-sm font-medium ${scoreColor}`}>
                    {scoreLabel} · {result.wordCount} words
                  </p>
                  {result.semanticSimilarity != null && result.semanticSimilarity > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Semantic match: {Math.round(result.semanticSimilarity * 100)}%
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Score breakdown</span>
                    <span className="text-xs text-muted-foreground">{result.fileName}</span>
                  </div>
                  <Progress value={result.score} className="h-3" />
                  <div className="flex gap-2 mt-4">
                    <Button onClick={downloadReport} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />Download report
                    </Button>
                    <Button onClick={reset} variant="ghost" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />Analyze another
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="glass-card border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-5 w-5 text-success" /> Matched keywords
                  <Badge variant="secondary" className="ml-auto">
                    {result.matchedKeywords.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.matchedKeywords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No keywords matched.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {result.matchedKeywords.map((k) => (
                      <span
                        key={k}
                        className="rounded-full bg-success/10 text-success text-xs px-3 py-1 font-medium"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <XCircle className="h-5 w-5 text-destructive" /> Missing keywords
                  <Badge variant="secondary" className="ml-auto">
                    {result.missingKeywords.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.missingKeywords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No critical gaps detected.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {result.missingKeywords.map((k) => (
                      <span
                        key={k}
                        className="rounded-full bg-destructive/10 text-destructive text-xs px-3 py-1 font-medium"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-5 w-5 text-warning" /> Recommendations
              </CardTitle>
              <CardDescription>Actionable steps to improve your score</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {result.feedback.map((f, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-xs">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{f}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}

      {!busy && !result && (
        <Card className="border-dashed bg-transparent">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileScan className="h-12 w-12 mx-auto mb-3 opacity-40" />
            Your results will appear here.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
