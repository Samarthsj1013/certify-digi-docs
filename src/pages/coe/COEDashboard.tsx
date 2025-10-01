import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Shield, FileCheck, History } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface PendingRequest {
  id: string;
  student_usn: string;
  request_date: string;
  student_name?: string;
  student_email?: string;
}

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  user_id: string;
}

export default function COEDashboard() {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingRequests();
    fetchAuditLogs();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("certification_requests")
        .select(`
          id,
          student_usn,
          request_date,
          students!inner (
            name,
            email
          )
        `)
        .eq("status", "Pending")
        .order("request_date", { ascending: true });

      if (error) throw error;

      const formattedData = (data || []).map((req: any) => ({
        id: req.id,
        student_usn: req.student_usn,
        request_date: req.request_date,
        student_name: req.students?.name,
        student_email: req.students?.email,
      }));

      setPendingRequests(formattedData);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      toast.error("Error loading pending requests");
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    }
  };

  const handleApprove = async (requestId: string, studentUsn: string) => {
    setProcessing(requestId);

    try {
      // Generate verification hash
      const verificationHash = crypto.randomUUID();

      // Update request status
      const { error: updateError } = await supabase
        .from("certification_requests")
        .update({
          status: "Approved",
          approval_date: new Date().toISOString(),
          approved_by: user?.id,
          verification_hash: verificationHash,
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Log the approval
      await supabase.from("audit_logs").insert({
        user_id: user?.id,
        action: "Approved certification request",
        entity_type: "certification_request",
        entity_id: requestId,
        metadata: { student_usn: studentUsn },
      });

      toast.success("Request approved successfully");
      fetchPendingRequests();
      fetchAuditLogs();
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Error approving request");
    } finally {
      setProcessing(null);
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
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            COE Dashboard
          </h1>
          <p className="text-muted-foreground">
            Controller of Examinations - Certification Management
          </p>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Pending Requests ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Audit Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle>Pending Certification Requests</CardTitle>
                <CardDescription>
                  Review and approve student transcript requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
                    <p className="text-lg font-medium">All caught up!</p>
                    <p className="text-muted-foreground">
                      No pending certification requests at this time
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request ID</TableHead>
                        <TableHead>Student USN</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Date Submitted</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-mono text-sm">
                            {request.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="font-medium">
                            {request.student_usn}
                          </TableCell>
                          <TableCell>{request.student_name}</TableCell>
                          <TableCell>
                            {format(new Date(request.request_date), "MMM dd, yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(request.id, request.student_usn)}
                              disabled={processing === request.id}
                              className="bg-gradient-success"
                            >
                              {processing === request.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Approve Request
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle>Audit Log</CardTitle>
                <CardDescription>
                  Track all system actions and approvals for security
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No audit logs available
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity Type</TableHead>
                        <TableHead>Entity ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {format(new Date(log.created_at), "MMM dd, yyyy HH:mm:ss")}
                          </TableCell>
                          <TableCell className="font-medium">{log.action}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {log.entity_type}
                            </code>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.entity_id.slice(0, 12)}...
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
