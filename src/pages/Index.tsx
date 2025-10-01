import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Shield, FileCheck, Lock } from "lucide-react";

const Index = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      if (userRole === "coe") {
        navigate("/coe/dashboard");
      } else if (userRole === "student") {
        navigate("/student/dashboard");
      }
    }
  }, [user, userRole, loading, navigate]);

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-lg font-bold">Academic Records System</h1>
              <p className="text-xs text-muted-foreground">Certified Transcripts</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/auth/login")}>
              Sign In
            </Button>
            <Button onClick={() => navigate("/auth/signup")}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Certified Academic Records System
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Secure, verifiable, and instant digital transcripts for modern education
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-16">
          <Card className="shadow-medium">
            <CardHeader>
              <Shield className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Secure & Verified</CardTitle>
              <CardDescription>
                Each certificate is cryptographically secured with a unique verification hash
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium">
            <CardHeader>
              <FileCheck className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Instant Approval</CardTitle>
              <CardDescription>
                COE can review and approve transcript requests with a single click
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium">
            <CardHeader>
              <Lock className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Public Verification</CardTitle>
              <CardDescription>
                Anyone can verify certificate authenticity using the verification portal
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="shadow-strong border-primary/20 max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Ready to Get Started?</CardTitle>
            <CardDescription>
              Create your account to request certified transcripts or sign in if you already have an account
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth/signup")}>
              Create Account
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate("/auth/login")}>
              Sign In
            </Button>
          </CardContent>
        </Card>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground mb-2">
            Need to verify a certificate?
          </p>
          <Button variant="link" onClick={() => navigate("/verify")}>
            Go to Verification Portal →
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Index;
