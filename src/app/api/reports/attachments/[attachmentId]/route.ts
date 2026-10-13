import { isValidObjectId } from "mongoose";
import { ReportAttachment } from "@/models/ReportAttachment";
import { Report } from "@/models/Report";
import { Event } from "@/models/Event";
import { canUseEvent, requireStaff } from "@/lib/staff";

type Params = { params: Promise<{ attachmentId: string }> };

// GET /api/reports/attachments/:id: the file itself (admins, or the organization running the report's event).
// Only JPEG/PNG/WebP/PDF are ever stored (checked by content on upload), and
// nosniff stops the browser from treating them as anything else.
export async function GET(req: Request, { params }: Params) {
  const staff = await requireStaff(req);
  if (staff instanceof Response) return staff;
  const { attachmentId } = await params;
  if (!isValidObjectId(attachmentId)) return new Response("Not found", { status: 404 });

  const file = await ReportAttachment.findById(attachmentId);
  if (!file) return new Response("Not found", { status: 404 });
  if (!staff.isAdmin) {
    const report = await Report.findById(file.report);
    const event = report?.event ? await Event.findById(report.event) : null;
    if (!event || !canUseEvent(staff, event)) return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.filename)}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
