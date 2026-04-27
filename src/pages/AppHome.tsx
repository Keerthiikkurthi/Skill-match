import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { getAnalyses, type ResumeAnalysis } from "@/lib/resume-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileScan, BarChart3, History, Sparkles } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<ResumeAnalysis[]>([]);

  useEffect(() => {
    if (!user) return;
    getAnalyses(user.id).then(({ analyses: data }) => setAnalyses(data));
  }, [user]);

  const last = analyses[0];
  const avg = analyses.length
    ? Math.round(analyses.reduce((s, a) => s + a.score, 0) / analyses.length)
    : 0;

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="animate-fade-in-up">
        <h1 className="font-display text-3xl sm:text-4xl font-bold">
          Hi, <span className="gradient-text">{user?.name.split(" ")[0]}</span> 👋
        </h1>
        <p className="text-muted-foreground mt-1">Here&apos;s a quick look at your resume health.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 animate-fade-in-up">
        <Card className="glass-card border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardDescription>Total analyses</CardDescription>
            <CardTitle className="text-3xl font-display">{analyses.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass-card border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardDescription>Average ATS score</CardDescription>
            <CardTitle className="text-3xl font-display gradient-text">{avg || "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass-card border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardDescription>Latest score</CardDescription>
            <CardTitle className="text-3xl font-display">{last?.score ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 glass-card border-0 shadow-elegant overflow-hidden relative">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 blur-3xl" />
          <CardHeader className="relative">
            <div className="flex items-center gap-2 text-primary text-sm font-medium">
              <Sparkles className="h-4 w-4" /> Get started
            </div>
            <CardTitle className="font-display text-2xl mt-2">Analyze a resume</CardTitle>
            <CardDescription>
              Upload a PDF/DOCX, or capture one with your camera. Get an instant ATS score.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <Button
              asChild
              className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-smooth shadow-glow"
            >
              <Link to="/app/analyze">
                Start analysis <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 shadow-soft">
          <CardHeader>
            <FileScan className="h-5 w-5 text-primary mb-2" />
            <CardTitle className="text-base">Quick tips</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Tailor keywords to each role</p>
            <p>• Use strong action verbs</p>
            <p>• Quantify achievements</p>
            <p>• Keep it under 2 pages</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-0 shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display flex items-center gap-2">
              <History className="h-5 w-5" /> Recent activity
            </CardTitle>
            <CardDescription>Your latest resume analyses</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/app/dashboard">
              <BarChart3 className="h-4 w-4 mr-1" />View all
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {analyses.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileScan className="h-10 w-10 mx-auto mb-3 opacity-40" />
              No analyses yet. Run your first one!
            </div>
          ) : (
            <div className="space-y-2">
              {analyses.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-smooth"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{a.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="font-display font-bold text-xl gradient-text shrink-0 ml-3">
                    {a.score}
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
