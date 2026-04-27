import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { deleteAnalysis, getAnalyses, type ResumeAnalysis } from "@/lib/resume-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Download, FileScan, ArrowRight, WifiOff, RefreshCw } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { toast } from "sonner";

function downloadReport(a: ResumeAnalysis) {
  const lines = [
    `Resume Analyzer — Report`,
    `=========================`,
    `File: ${a.fileName}`,
    `Date: ${new Date(a.createdAt).toLocaleString()}`,
    `Source: ${a.source}`,
    `Word count: ${a.wordCount}`,
    ``,
    `ATS Score: ${a.score}/100`,
    a.semanticSimilarity != null
      ? `Semantic match: ${Math.round(a.semanticSimilarity * 100)}%`
      : "",
    ``,
    `Matched Keywords (${a.matchedKeywords.length}):`,
    a.matchedKeywords.join(", ") || "—",
    ``,
    `Missing Keywords (${a.missingKeywords.length}):`,
    a.missingKeywords.join(", ") || "—",
    ``,
    `Recommendations:`,
    ...a.feedback.map((f, i) => `${i + 1}. ${f}`),
  ].filter(Boolean);

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${a.fileName.replace(/\.[^.]+$/, "")}-report.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<ResumeAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  const fetchAnalyses = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { analyses: data, fromCache: cached } = await getAnalyses(user.id);
      setAnalyses(data);
      setFromCache(cached);
    } catch {
      toast.error("Failed to load analyses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const chartData = useMemo(
    () =>
      [...analyses]
        .reverse()
        .map((a, i) => ({
          name: `#${i + 1}`,
          score: a.score,
          date: new Date(a.createdAt).toLocaleDateString(),
        })),
    [analyses]
  );

  const avg = analyses.length
    ? Math.round(analyses.reduce((s, a) => s + a.score, 0) / analyses.length)
    : 0;
  const best = analyses.length ? Math.max(...analyses.map((a) => a.score)) : 0;

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteAnalysis(id, user.id);
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
      toast.success("Analysis deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete analysis.");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Track your resume performance over time.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAnalyses} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-smooth shadow-glow"
          >
            <Link to="/app/analyze">
              New analysis <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {fromCache && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
          <WifiOff className="h-4 w-4" />
          Showing cached data — backend unreachable. Data may be outdated.
        </div>
      )}

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="glass-card border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardDescription>Total analyses</CardDescription>
            <CardTitle className="text-3xl font-display">{analyses.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass-card border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardDescription>Average score</CardDescription>
            <CardTitle className="text-3xl font-display gradient-text">{avg || "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass-card border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardDescription>Best score</CardDescription>
            <CardTitle className="text-3xl font-display">{best || "—"}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Chart */}
      <Card className="glass-card border-0 shadow-soft">
        <CardHeader>
          <CardTitle>Score history</CardTitle>
          <CardDescription>How your ATS scores have evolved</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              No data yet — run an analysis to see your trend.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="url(#scoreGrad)"
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History list */}
      <Card className="glass-card border-0 shadow-soft">
        <CardHeader>
          <CardTitle>All analyses</CardTitle>
          <CardDescription>Your full resume history</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin opacity-40" />
              Loading analyses...
            </div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileScan className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No analyses yet.</p>
              <Button asChild variant="link" className="mt-2">
                <Link to="/app/analyze">Run your first analysis</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {analyses.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-4 p-4 rounded-xl border bg-card/40 hover:bg-card/80 transition-smooth"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
                    <FileScan className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{a.fileName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">{a.source}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.createdAt).toLocaleString()}
                      </span>
                      {a.semanticSimilarity != null && a.semanticSimilarity > 0 && (
                        <span className="text-xs text-muted-foreground">
                          · {Math.round(a.semanticSimilarity * 100)}% semantic
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display font-bold text-2xl gradient-text">{a.score}</div>
                    <div className="text-xs text-muted-foreground">/ 100</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => downloadReport(a)}
                      title="Download report"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(a.id)}
                      title="Delete"
                      className="hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
