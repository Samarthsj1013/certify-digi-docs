import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AcademicRecord {
  semester: number;
  sgpa: number;
  cgpa: number;
  sub1_name?: string;
  sub1_marks?: number;
  sub2_name?: string;
  sub2_marks?: number;
  sub3_name?: string;
  sub3_marks?: number;
  sub4_name?: string;
  sub4_marks?: number;
  sub5_name?: string;
  sub5_marks?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { requestId } = await req.json();

    console.log('Generating certificate for request:', requestId);

    // Fetch request details
    const { data: request, error: requestError } = await supabaseClient
      .from('certification_requests')
      .select('*, students(*)')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      throw new Error('Request not found');
    }

    // Fetch academic records
    const { data: records, error: recordsError } = await supabaseClient
      .from('academic_records')
      .select('*')
      .eq('student_usn', request.student_usn)
      .order('semester', { ascending: true });

    if (recordsError) {
      throw new Error('Failed to fetch academic records');
    }

    // Generate verification hash
    const verificationHash = crypto.randomUUID();

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();

    // Embed fonts
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Colors
    const headerColor = rgb(0.02, 0.23, 0.47); // Dark blue
    const goldColor = rgb(0.85, 0.65, 0.13);

    // Header
    page.drawText('GITAM UNIVERSITY', {
      x: 50,
      y: height - 60,
      size: 28,
      font: timesRomanBold,
      color: headerColor,
    });

    page.drawText('Official Academic Transcript', {
      x: 50,
      y: height - 90,
      size: 18,
      font: timesRoman,
      color: goldColor,
    });

    // Watermark
    const watermarkText = 'GITAM UNIVERSITY - VERIFIED COPY';
    page.drawText(watermarkText, {
      x: width / 2 - 200,
      y: height / 2,
      size: 40,
      font: timesRomanBold,
      color: rgb(0.9, 0.9, 0.9),
      rotate: { angle: -45, type: 1 },
      opacity: 0.15,
    });

    // Student Information
    let yPosition = height - 140;
    const lineHeight = 20;

    page.drawText('Student Information:', {
      x: 50,
      y: yPosition,
      size: 14,
      font: timesRomanBold,
      color: headerColor,
    });

    yPosition -= lineHeight * 1.5;

    const studentInfo = [
      `Name: ${request.students.name}`,
      `USN: ${request.students.usn}`,
      `Program: ${request.students.major}`,
      `Email: ${request.students.email}`,
    ];

    for (const info of studentInfo) {
      page.drawText(info, {
        x: 70,
        y: yPosition,
        size: 11,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
      yPosition -= lineHeight;
    }

    // Academic Records
    yPosition -= lineHeight;
    page.drawText('Academic Performance:', {
      x: 50,
      y: yPosition,
      size: 14,
      font: timesRomanBold,
      color: headerColor,
    });

    yPosition -= lineHeight * 1.5;

    // Draw records
    for (const record of records as AcademicRecord[]) {
      if (yPosition < 150) break; // Prevent overflow

      page.drawText(`Semester ${record.semester} - SGPA: ${record.sgpa.toFixed(2)} | CGPA: ${record.cgpa.toFixed(2)}`, {
        x: 70,
        y: yPosition,
        size: 11,
        font: timesRomanBold,
        color: headerColor,
      });
      yPosition -= lineHeight;

      // Subject marks
      const subjects = [
        { name: record.sub1_name, marks: record.sub1_marks },
        { name: record.sub2_name, marks: record.sub2_marks },
        { name: record.sub3_name, marks: record.sub3_marks },
        { name: record.sub4_name, marks: record.sub4_marks },
        { name: record.sub5_name, marks: record.sub5_marks },
      ];

      for (const subject of subjects) {
        if (subject.name && subject.marks !== null && subject.marks !== undefined) {
          page.drawText(`• ${subject.name} - ${subject.marks}`, {
            x: 90,
            y: yPosition,
            size: 10,
            font: helvetica,
            color: rgb(0.2, 0.2, 0.2),
          });
          yPosition -= lineHeight * 0.9;
        }
      }
      yPosition -= lineHeight * 0.5;
    }

    // Generate QR code (simplified - in production use a proper QR library)
    const verificationUrl = `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/verify/${verificationHash}`;
    
    // QR code placeholder (you'd use a QR library here)
    page.drawText('Scan QR Code to Verify', {
      x: width - 180,
      y: 100,
      size: 8,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawRectangle({
      x: width - 180,
      y: 110,
      width: 80,
      height: 80,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // Signature
    page.drawText('Digitally Signed by Controller of Examinations', {
      x: 50,
      y: 80,
      size: 10,
      font: timesRoman,
      color: rgb(0, 0, 0),
    });

    const currentDate = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    page.drawText(`Generated on ${currentDate}`, {
      x: 50,
      y: 65,
      size: 9,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawText(`Verification Code: ${verificationHash.slice(0, 8).toUpperCase()}`, {
      x: 50,
      y: 50,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    
    // Upload to Supabase Storage
    const fileName = `${request.student_usn}/certificate_${requestId}.pdf`;
    const { error: uploadError } = await supabaseClient.storage
      .from('certificates')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('certificates')
      .getPublicUrl(fileName);

    // Update request with PDF URL and verification hash
    const { error: updateError } = await supabaseClient
      .from('certification_requests')
      .update({
        signed_pdf_url: urlData.publicUrl,
        verification_hash: verificationHash,
      })
      .eq('id', requestId);

    if (updateError) {
      throw new Error(`Failed to update request: ${updateError.message}`);
    }

    console.log('Certificate generated successfully:', fileName);

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: urlData.publicUrl,
        verificationHash,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating certificate:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});