import { Outlet, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/lib/auth";

export function AppLayout() {
  const { user, loading } = useAuth();

  // Show spinner while restoring session — but never block indefinitely
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Not logged in → redirect to sign in
  if (!user) return <Navigate to="/signin" replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-background/60 backdrop-blur-md sticky top-0 z-30 px-4">
            <SidebarTrigger />
            <div className="ml-auto text-sm text-muted-foreground hidden sm:block">
              Welcome back,{" "}
              <span className="font-medium text-foreground">
                {user.name.split(" ")[0]}
              </span>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
