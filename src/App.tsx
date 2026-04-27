import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import SignIn from "./pages/SignIn.tsx";
import SignUp from "./pages/SignUp.tsx";
import { AppLayout } from "./components/AppLayout";
import AppHome from "./pages/AppHome.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Analyze from "./pages/Analyze.tsx";
import Profile from "./pages/Profile.tsx";
import InterviewQuestions from "./pages/InterviewQuestions.tsx";
import RoleSuggestions from "./pages/RoleSuggestions.tsx";
import RecruiterFeedback from "./pages/RecruiterFeedback.tsx";
import ResumeHeatmap from "./pages/ResumeHeatmap.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<AppHome />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="analyze" element={<Analyze />} />
              <Route path="profile" element={<Profile />} />
              <Route path="interview" element={<InterviewQuestions />} />
              <Route path="suggestions" element={<RoleSuggestions />} />
              <Route path="recruiter" element={<RecruiterFeedback />} />
              <Route path="heatmap" element={<ResumeHeatmap />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
