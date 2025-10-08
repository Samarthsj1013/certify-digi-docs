import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { FileText, Download, Loader2, GraduationCap, Award, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface StudentData {
  usn: string;
  name: string;
  major: string;
  cgpa?: number;
}

interface RequestData {
  id: string;
  status: "Pending" | "Approved" | "Rejected";
  request_date: string;
  approval_date: string | null;
  signed_pdf_url: string | null;
  rejection_reason: string | null;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStudentData();
      fetchRequests();
    }
  }, [user]);

  const fetchStudentData = async () => {
    const { data, error } = await supabase
      .from("students")
      .select("usn, name, major")
      .eq("user_id", user?.id)
      .single();

    if (error) {
      console.error("Error fetching student data:", error);
      toast.error("Error loading student information");
    } else if (data) {
      // Fetch CGPA from latest academic record
      const { data: academicData } = await supabase
        .from("academic_records")
        .select("cgpa")
        .eq("student_usn", data.usn)
        .order("semester", { ascending: false })
        .limit(1)
        .single();

      setStudentData({
        ...data,
        cgpa: academicData?.cgpa || undefined,
      });
    }
    setLoading(false);
  };

  const fetchRequests = async () => {
    if (!user) return;

    const { data: studentData } = await supabase
      .from("students")
      .select("usn")
      .eq("user_id", user.id)
      .single();

    if (!studentData) return;

    const { data, error } = await supabase
      .from("certification_requests")
      .select("id, status, request_date, approval_date, signed_pdf_url, rejection_reason")
      .eq("student_usn", studentData.usn)
      .order("request_date", { ascending: false });

    if (error) {
      console.error("Error fetching requests:", error);
      toast.error("Error loading request history");
    } else {
      setRequests(data || []);
    }
  };

  const handleRequestCertificate = async () => {
    if (!studentData) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("certification_requests")
        .insert({
          student_usn: studentData.usn,
          status: "Pending",
        });

      if (error) throw error;

      toast.success("Certification request submitted successfully");
      fetchRequests();
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Error submitting certification request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (pdfUrl: string) => {
    if (!pdfUrl) {
      toast.error("PDF not available");
      return;
    }

    try {
      // In a real implementation, this would download from storage
      toast.info("Download functionality will be implemented with storage");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Error downloading certificate");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Student Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your certified academic transcripts
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="text-lg font-semibold">{studentData?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">USN</p>
                <p className="text-lg font-medium">{studentData?.usn}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Major</p>
                <p className="text-lg font-medium">{studentData?.major}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium bg-gradient-primary text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Academic Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm opacity-90">Current CGPA</p>
                <p className="text-4xl font-bold">
                  {studentData?.cgpa ? studentData.cgpa.toFixed(2) : "N/A"}
                </p>
                <p className="text-sm opacity-75 mt-1">out of 10.00</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-medium mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Request Certified Transcript
            </CardTitle>
            <CardDescription>
              Submit a request to receive your officially certified academic transcript
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleRequestCertificate}
              disabled={submitting}
              className="w-full md:w-auto"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Certification Request
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>Request History</CardTitle>
            <CardDescription>
              Track the status of your certification requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No certification requests yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Date Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <>
                      <TableRow key={request.id}>
                        <TableCell className="font-mono text-sm">
                          {request.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {format(new Date(request.request_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={request.status} />
                        </TableCell>
                        <TableCell>
                          {request.status === "Approved" && request.signed_pdf_url ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(request.signed_pdf_url!)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download PDF
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {request.status === "Pending" ? "Awaiting approval" : "Not available"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                      {request.status === "Rejected" && request.rejection_reason && (
                        <TableRow key={`${request.id}-reason`}>
                          <TableCell colSpan={4} className="bg-destructive/5">
                            <Alert variant="destructive" className="border-destructive/30">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Rejection Reason</AlertTitle>
                              <AlertDescription>{request.rejection_reason}</AlertDescription>
                            </Alert>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
