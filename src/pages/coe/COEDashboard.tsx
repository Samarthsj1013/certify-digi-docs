import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import { RejectDialog } from "@/components/RejectDialog";
import { AcademicRecordsManager } from "@/components/AcademicRecordsManager";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Shield, FileCheck, History, XCircle, BookOpen } from "lucide-react";
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
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<{ id: string; name?: string } | null>(null);
  const [bulkRejecting, setBulkRejecting] = useState(false);

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
      toast.loading("Generating certificate...", { id: requestId });

      // Call edge function to generate PDF certificate
      const { data: pdfData, error: pdfError } = await supabase.functions.invoke(
        "generate-certificate",
        {
          body: { requestId },
        }
      );

      if (pdfError) throw pdfError;

      // Update request status
      const { error: updateError } = await supabase
        .from("certification_requests")
        .update({
          status: "Approved",
          approval_date: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Log the approval
      await supabase.from("audit_logs").insert({
        user_id: user?.id,
        action: "Approved certification request",
        entity_type: "certification_request",
        entity_id: requestId,
        metadata: { 
          student_usn: studentUsn,
          verification_hash: pdfData?.verificationHash 
        },
      });

      toast.success("Certificate generated and request approved!");
      setSelectedRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
      fetchPendingRequests();
      fetchAuditLogs();
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Error approving request");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string, studentUsn: string, reason: string) => {
    setProcessing(requestId);

    try {
      // Update request status with rejection reason
      const { error: updateError } = await supabase
        .from("certification_requests")
        .update({
          status: "Rejected",
          rejection_reason: reason,
          approval_date: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Log the rejection
      await supabase.from("audit_logs").insert({
        user_id: user?.id,
        action: "Rejected certification request",
        entity_type: "certification_request",
        entity_id: requestId,
        metadata: { student_usn: studentUsn, reason },
      });

      toast.success("Request rejected");
      setSelectedRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
      fetchPendingRequests();
      fetchAuditLogs();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Error rejecting request");
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedRequests.size === 0) return;

    setProcessing("bulk");
    const requestIds = Array.from(selectedRequests);

    try {
      for (const requestId of requestIds) {
        const request = pendingRequests.find(r => r.id === requestId);
        if (!request) continue;

        const verificationHash = crypto.randomUUID();

        await supabase
          .from("certification_requests")
          .update({
            status: "Approved",
            approval_date: new Date().toISOString(),
            approved_by: user?.id,
            verification_hash: verificationHash,
          })
          .eq("id", requestId);

        await supabase.from("audit_logs").insert({
          user_id: user?.id,
          action: "Bulk approved certification request",
          entity_type: "certification_request",
          entity_id: requestId,
          metadata: { student_usn: request.student_usn },
        });
      }

      toast.success(`${requestIds.length} requests approved successfully`);
      setSelectedRequests(new Set());
      fetchPendingRequests();
      fetchAuditLogs();
    } catch (error) {
      console.error("Error bulk approving:", error);
      toast.error("Error approving requests");
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkReject = async (reason: string) => {
    if (selectedRequests.size === 0) return;

    const requestIds = Array.from(selectedRequests);

    try {
      for (const requestId of requestIds) {
        const request = pendingRequests.find(r => r.id === requestId);
        if (!request) continue;

        await supabase
          .from("certification_requests")
          .update({
            status: "Rejected",
            rejection_reason: reason,
            approval_date: new Date().toISOString(),
            approved_by: user?.id,
          })
          .eq("id", requestId);

        await supabase.from("audit_logs").insert({
          user_id: user?.id,
          action: "Bulk rejected certification request",
          entity_type: "certification_request",
          entity_id: requestId,
          metadata: { student_usn: request.student_usn, reason },
        });
      }

      toast.success(`${requestIds.length} requests rejected`);
      setSelectedRequests(new Set());
      fetchPendingRequests();
      fetchAuditLogs();
    } catch (error) {
      console.error("Error bulk rejecting:", error);
      toast.error("Error rejecting requests");
    }
  };

  const openRejectDialog = (requestId: string, studentName?: string) => {
    setRejectingRequest({ id: requestId, name: studentName });
    setRejectDialogOpen(true);
  };

  const openBulkRejectDialog = () => {
    setBulkRejecting(true);
    setRejectDialogOpen(true);
  };

  const handleDialogReject = async (reason: string) => {
    if (bulkRejecting) {
      await handleBulkReject(reason);
      setBulkRejecting(false);
    } else if (rejectingRequest) {
      const request = pendingRequests.find(r => r.id === rejectingRequest.id);
      if (request) {
        await handleReject(rejectingRequest.id, request.student_usn, reason);
      }
      setRejectingRequest(null);
    }
  };

  const toggleSelectAll = () => {
    if (selectedRequests.size === pendingRequests.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(pendingRequests.map(r => r.id)));
    }
  };

  const toggleSelect = (requestId: string) => {
    setSelectedRequests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(requestId)) {
        newSet.delete(requestId);
      } else {
        newSet.add(requestId);
      }
      return newSet;
    });
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
            <TabsTrigger value="records" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Academic Records
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Audit Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card className="shadow-medium">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Pending Certification Requests</CardTitle>
                    <CardDescription>
                      Review and approve student transcript requests
                    </CardDescription>
                  </div>
                  {selectedRequests.size > 0 && (
                    <div className="flex gap-2">
                      <Button
                        onClick={handleBulkApprove}
                        disabled={processing === "bulk"}
                        className="bg-gradient-success"
                      >
                        {processing === "bulk" ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Approve Selected ({selectedRequests.size})
                          </>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={openBulkRejectDialog}
                        disabled={processing === "bulk"}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject Selected ({selectedRequests.size})
                      </Button>
                    </div>
                  )}
                </div>
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
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedRequests.size === pendingRequests.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Request ID</TableHead>
                        <TableHead>Student USN</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Date Submitted</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedRequests.has(request.id)}
                              onCheckedChange={() => toggleSelect(request.id)}
                            />
                          </TableCell>
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
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(request.id, request.student_usn)}
                                disabled={processing === request.id || processing === "bulk"}
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
                                    Approve
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openRejectDialog(request.id, request.student_name)}
                                disabled={processing === request.id || processing === "bulk"}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records">
            <AcademicRecordsManager />
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

        <RejectDialog
          open={rejectDialogOpen}
          onOpenChange={setRejectDialogOpen}
          onReject={handleDialogReject}
          studentName={rejectingRequest?.name}
          isMultiple={bulkRejecting}
          count={selectedRequests.size}
        />
      </main>
    </div>
  );
}
