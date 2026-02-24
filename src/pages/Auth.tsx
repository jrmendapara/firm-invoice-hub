import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: "Account created",
          description: "Please check your email to verify your account.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });

    if (error) {
      toast({
        title: "Google Sign-In failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast({ title: "Enter your email first" });
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Reset email sent", description: "Please check your inbox." });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f3f3] px-4 py-10">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-sm">
        <button
          type="button"
          onClick={handleGoogle}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white text-base font-medium text-zinc-900 transition hover:bg-zinc-50"
        >
          <span className="text-lg">🟢</span>
          Continue with Google
        </button>

        <div className="my-4 text-center text-sm text-zinc-500">or</div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-[11px] uppercase tracking-wider text-zinc-600">
                Full Name
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="h-12 rounded-md border-zinc-300"
                required={!isLogin}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[11px] uppercase tracking-wider text-zinc-600">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-md border-zinc-900"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[11px] uppercase tracking-wider text-zinc-600">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-md border-zinc-300 bg-zinc-100"
              required
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            className="h-12 w-full rounded-md bg-black text-base font-semibold text-white hover:bg-zinc-900"
            disabled={loading}
          >
            {loading ? "Please wait..." : isLogin ? "Log in" : "Create account"}
          </Button>
        </form>

        <div className="mt-5 space-y-3 text-center text-sm">
          <button
            type="button"
            onClick={handleGoogle}
            className="text-sky-700 hover:underline"
          >
            Use single sign-on
          </button>
          <div>
            <button type="button" onClick={handleResetPassword} className="text-sky-700 hover:underline">
              Reset password
            </button>
          </div>
          <div className="text-zinc-500">
            {isLogin ? "No account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-sky-700 hover:underline"
            >
              {isLogin ? "Create one" : "Log in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
