import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Search, Shield, Loader2, GraduationCap } from "lucide-react";

interface VerificationResult {
  isValid: boolean;
  studentData?: {
    name: string;
    usn: string;
    cgpa: number;
    major: string;
  };
  approvalDate?: string;
}

export default function VerifyPage() {
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      toast.error("Please enter a verification code");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Query the certification_requests table using the verification hash
      const { data: requestData, error: requestError } = await supabase
        .from("certification_requests")
        .select(`
          id,
          status,
          approval_date,
          student_usn,
          students!inner (
            name,
            usn,
            major
          )
        `)
        .eq("verification_hash", verificationCode.trim())
        .eq("status", "Approved")
        .single();

      if (requestError || !requestData) {
        setResult({ isValid: false });
        return;
      }

      // Fetch latest CGPA
      const { data: academicData } = await supabase
        .from("academic_records")
        .select("cgpa")
        .eq("student_usn", requestData.student_usn)
        .order("semester", { ascending: false })
        .limit(1)
        .single();

      setResult({
        isValid: true,
        studentData: {
          name: (requestData.students as any).name,
          usn: (requestData.students as any).usn,
          major: (requestData.students as any).major,
          cgpa: academicData?.cgpa || 0,
        },
        approvalDate: requestData.approval_date,
      });

      toast.success("Certificate verified successfully");
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Error during verification");
      setResult({ isValid: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl py-12">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Shield className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Certificate Verification</h1>
          <p className="text-muted-foreground text-lg">
            Verify the authenticity of academic transcripts
          </p>
        </div>

        <Card className="shadow-strong mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Enter Verification Code
            </CardTitle>
            <CardDescription>
              Enter the verification code from the certificate to check its authenticity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Verification Code</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  placeholder="Enter verification code or scan QR code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                  disabled={loading}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  This code can be found on the official certificate or scanned from the QR code
                </p>
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Certificate
              </Button>
            </form>
          </CardContent>
        </Card>

        {result && (
          <Card className={`shadow-strong border-2 ${result.isValid ? "border-success" : "border-destructive"}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.isValid ? (
                  <>
                    <CheckCircle2 className="h-6 w-6 text-success" />
                    <span className="text-success">Certificate Authentic</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-6 w-6 text-destructive" />
                    <span className="text-destructive">Invalid Certificate</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.isValid && result.studentData ? (
                <div className="space-y-6">
                  <Alert className="bg-success-light border-success">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <AlertDescription className="text-success-foreground">
                      This certificate has been verified as authentic and was officially issued by the institution.
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Student Name</p>
                      <p className="text-lg font-semibold">{result.studentData.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">University Serial Number</p>
                      <p className="text-lg font-mono font-semibold">{result.studentData.usn}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Major</p>
                      <p className="text-lg font-medium">{result.studentData.major}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">CGPA</p>
                      <p className="text-lg font-bold text-primary">
                        {result.studentData.cgpa.toFixed(2)} / 10.00
                      </p>
                    </div>
                  </div>

                  {result.approvalDate && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Certificate Issued On</p>
                      <p className="text-sm font-medium">
                        {new Date(result.approvalDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-4">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <Badge variant="outline" className="text-sm">
                      Official Academic Transcript
                    </Badge>
                  </div>
                </div>
              ) : (
                <Alert className="bg-destructive/10 border-destructive">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-destructive">
                    <strong>Warning: This certificate could not be verified.</strong>
                    <br />
                    The verification code provided does not match any official records in our system.
                    This certificate may be tampered with, forged, or invalid.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
