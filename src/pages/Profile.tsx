import { useState } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User as UserIcon, Mail, Calendar, Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
});

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ name, email });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setSaving(true);
    const { error } = await updateProfile(parsed.data);
    setSaving(false);

    if (error) {
      toast.error(error);
    } else {
      toast.success("Profile updated");
    }
  };

  const initials = user.name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your account details.</p>
      </div>

      {/* Avatar card */}
      <Card className="glass-card border-0 shadow-elegant overflow-hidden relative">
        <div className="h-32 bg-gradient-to-br from-primary via-primary-glow to-accent" />
        <div className="px-6 -mt-12 pb-6 relative">
          <div className="flex items-end gap-4">
            <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-primary to-primary-glow border-4 border-background flex items-center justify-center font-display font-bold text-3xl text-primary-foreground shadow-glow">
              {initials}
            </div>
            <div className="pb-2">
              <h2 className="font-display text-xl font-bold">{user.name}</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {user.email}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Edit form */}
      <Card className="glass-card border-0 shadow-soft">
        <CardHeader>
          <CardTitle>Account information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={saving}
              />
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-smooth shadow-glow"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account details */}
      <Card className="glass-card border-0 shadow-soft">
        <CardHeader>
          <CardTitle>Account details</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-3">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-muted-foreground text-xs">User ID</div>
              <div className="font-mono text-xs truncate">{user.id}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-muted-foreground text-xs">Member since</div>
              <div>{new Date(user.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
