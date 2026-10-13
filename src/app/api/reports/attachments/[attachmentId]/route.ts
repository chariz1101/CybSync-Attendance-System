import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { ReportAttachment } from "@/models/ReportAttachment";

type Params = { params: Promise<{ attachmentId: string }> };

// GET /api/reports/attachments/:id: the file itself (council/admin only, via the middleware).
// Only JPEG/PNG/WebP/PDF are ever stored (checked by content on upload), and
// nosniff stops the browser from treating them as anything else.
export async function GET(_: Request, { params }: Params) {
  const { attachmentId } = await params;
  if (!isValidObjectId(attachmentId)) return new Response("Not found", { status: 404 });

  await connectDB();
  const file = await ReportAttachment.findById(attachmentId);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.filename)}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
