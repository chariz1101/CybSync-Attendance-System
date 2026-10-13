import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { User } from "@/models/User";
import { Event } from "@/models/Event";
import { EventRequest } from "@/models/EventRequest";
import { hashPassword } from "@/lib/auth";
import { accountUpdateSchema, toAccountJson } from "@/lib/accounts";
import { requireStaff } from "@/lib/staff";

type Params = { params: Promise<{ accountId: string }> };

// PATCH /api/accounts/:id  { name?, password?, status?, role? }  (admin only)
// Renaming an organization also renames it on its events and requests.
export async function PATCH(req: Request, { params }: Params) {
  const staff = await requireStaff(req, { adminOnly: true });
  if (staff instanceof Response) return staff;

  const { accountId } = await params;
  const user = isValidObjectId(accountId) ? await User.findById(accountId) : null;
  if (!user) return NextResponse.json({ success: false, message: "Account not found" }, { status: 404 });

  const parsed = accountUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { name, password, status, role } = parsed.data;

  // Don't let the admin lock themselves (and possibly everyone) out.
  if (user.id === staff.id && (status === "disabled" || role === "council")) {
    return NextResponse.json({ success: false, message: "You can't disable or demote your own account." }, { status: 400 });
  }

  if (name && name !== user.name) {
    user.name = name;
    await Promise.all([
      Event.updateMany({ "owner.userId": user.id }, { "owner.name": name }),
      EventRequest.updateMany({ "requestedBy.userId": user.id }, { "requestedBy.name": name }),
    ]);
  }
  if (password) user.passwordHash = await hashPassword(password);
  if (status) user.status = status;
  if (role) user.role = role;
  await user.save();
  return NextResponse.json({ success: true, account: toAccountJson(user) });
}
