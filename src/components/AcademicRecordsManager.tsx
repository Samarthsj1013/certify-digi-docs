import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit2, Loader2, BookOpen } from "lucide-react";

interface AcademicRecord {
  id: string;
  student_usn: string;
  semester: number;
  sgpa: number;
  cgpa: number;
  sub1_name: string | null;
  sub1_marks: number | null;
  sub2_name: string | null;
  sub2_marks: number | null;
  sub3_name: string | null;
  sub3_marks: number | null;
  sub4_name: string | null;
  sub4_marks: number | null;
  sub5_name: string | null;
  sub5_marks: number | null;
}

interface RecordFormData {
  student_usn: string;
  semester: number;
  sgpa: number;
  cgpa: number;
  sub1_name: string;
  sub1_marks: number;
  sub2_name: string;
  sub2_marks: number;
  sub3_name: string;
  sub3_marks: number;
  sub4_name: string;
  sub4_marks: number;
  sub5_name: string;
  sub5_marks: number;
}

const initialFormData: RecordFormData = {
  student_usn: "",
  semester: 1,
  sgpa: 0,
  cgpa: 0,
  sub1_name: "",
  sub1_marks: 0,
  sub2_name: "",
  sub2_marks: 0,
  sub3_name: "",
  sub3_marks: 0,
  sub4_name: "",
  sub4_marks: 0,
  sub5_name: "",
  sub5_marks: 0,
};

export function AcademicRecordsManager() {
  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AcademicRecord | null>(null);
  const [formData, setFormData] = useState<RecordFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [searchUsn, setSearchUsn] = useState("");

  useEffect(() => {
    fetchRecords();
  }, [searchUsn]);

  const fetchRecords = async () => {
    try {
      let query = supabase
        .from("academic_records")
        .select("*")
        .order("student_usn")
        .order("semester");

      if (searchUsn) {
        query = query.ilike("student_usn", `%${searchUsn}%`);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error("Error fetching records:", error);
      toast.error("Error loading academic records");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingRecord) {
        const { error } = await supabase
          .from("academic_records")
          .update(formData)
          .eq("id", editingRecord.id);

        if (error) throw error;
        toast.success("Academic record updated successfully");
      } else {
        const { error } = await supabase
          .from("academic_records")
          .insert([formData]);

        if (error) throw error;
        toast.success("Academic record added successfully");
      }

      setDialogOpen(false);
      setEditingRecord(null);
      setFormData(initialFormData);
      fetchRecords();
    } catch (error: any) {
      console.error("Error saving record:", error);
      toast.error(error.message || "Error saving academic record");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (record: AcademicRecord) => {
    setEditingRecord(record);
    setFormData({
      student_usn: record.student_usn,
      semester: record.semester,
      sgpa: record.sgpa,
      cgpa: record.cgpa,
      sub1_name: record.sub1_name || "",
      sub1_marks: record.sub1_marks || 0,
      sub2_name: record.sub2_name || "",
      sub2_marks: record.sub2_marks || 0,
      sub3_name: record.sub3_name || "",
      sub3_marks: record.sub3_marks || 0,
      sub4_name: record.sub4_name || "",
      sub4_marks: record.sub4_marks || 0,
      sub5_name: record.sub5_name || "",
      sub5_marks: record.sub5_marks || 0,
    });
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingRecord(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Academic Records Management
            </CardTitle>
            <CardDescription>
              Add and edit student semester records
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNew} className="bg-gradient-primary">
                <Plus className="mr-2 h-4 w-4" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRecord ? "Edit Academic Record" : "Add New Academic Record"}
                </DialogTitle>
                <DialogDescription>
                  Enter the semester details for the student
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="student_usn">Student USN *</Label>
                    <Input
                      id="student_usn"
                      value={formData.student_usn}
                      onChange={(e) => setFormData({ ...formData, student_usn: e.target.value.toUpperCase() })}
                      placeholder="1GA23IS140"
                      required
                      disabled={!!editingRecord}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="semester">Semester *</Label>
                    <Input
                      id="semester"
                      type="number"
                      min="1"
                      max="8"
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sgpa">SGPA *</Label>
                    <Input
                      id="sgpa"
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={formData.sgpa}
                      onChange={(e) => setFormData({ ...formData, sgpa: parseFloat(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cgpa">CGPA *</Label>
                    <Input
                      id="cgpa"
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={formData.cgpa}
                      onChange={(e) => setFormData({ ...formData, cgpa: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Subject Details</h4>
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <div key={num} className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`sub${num}_name`}>Subject {num} Name</Label>
                          <Input
                            id={`sub${num}_name`}
                            value={formData[`sub${num}_name` as keyof RecordFormData] as string}
                            onChange={(e) => setFormData({ ...formData, [`sub${num}_name`]: e.target.value })}
                            placeholder="e.g., Data Structures"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`sub${num}_marks`}>Marks</Label>
                          <Input
                            id={`sub${num}_marks`}
                            type="number"
                            min="0"
                            max="100"
                            value={formData[`sub${num}_marks` as keyof RecordFormData] as number}
                            onChange={(e) => setFormData({ ...formData, [`sub${num}_marks`]: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      editingRecord ? "Update Record" : "Add Record"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Label htmlFor="search">Search by USN</Label>
          <Input
            id="search"
            placeholder="Search student USN..."
            value={searchUsn}
            onChange={(e) => setSearchUsn(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {records.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No academic records found</p>
            <p className="text-muted-foreground">Add your first record to get started</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>USN</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>SGPA</TableHead>
                  <TableHead>CGPA</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.student_usn}</TableCell>
                    <TableCell>{record.semester}</TableCell>
                    <TableCell>{record.sgpa.toFixed(2)}</TableCell>
                    <TableCell>{record.cgpa.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(record)}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
