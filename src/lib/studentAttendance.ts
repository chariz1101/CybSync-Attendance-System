// Stats and history rows for a student's own attendance pages.

type Record = {
  id: string;
  event: unknown;
  type?: string;
  action?: string;
  checkInTime: Date;
  status: string;
};

export function studentStats(records: Record[]) {
  const events = new Set(records.map((r) => String((r.event as { _id?: unknown } | null)?._id ?? r.event)));
  const count = (status: string) => records.filter((r) => r.status === status).length;
  const onTime = count("on-time");
  const late = count("late");
  const scans = onTime + late;
  return {
    totalEvents: events.size,
    onTimeAttendance: onTime,
    lateAttendance: late,
    excused: count("excused"),
    onTimeAttendanceRate: scans ? Math.round((onTime / scans) * 100) : 0,
    lateAttendanceRate: scans ? Math.round((late / scans) * 100) : 0,
  };
}

export function studentHistory(records: Record[]) {
  return records.map((r) => {
    const event = r.event as { name?: string; date?: string } | null;
    return {
      id: r.id,
      type: [r.type, r.action].filter(Boolean).join(", "),
      event: event?.name ?? "(deleted event)",
      eventDate: event?.date ?? "",
      timestamp: r.checkInTime.toISOString(),
      status: r.status as "on-time" | "late" | "excused",
    };
  });
}
