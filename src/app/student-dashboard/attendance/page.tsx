'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import StudentSidebar from '@/components/StudentSidebar';
import StatCard from '@/components/StatCard';
import { StudentHistory, type HistoryRow } from '@/components/StudentHistory';
import { Card, ErrorText, PageHeader, primaryButton } from '@/components/ui';
import { api } from '@/lib/api';
import type { studentStats } from '@/lib/studentAttendance';

type AttendanceData = { stats: ReturnType<typeof studentStats>; attendanceHistory: HistoryRow[] };

export default function StudentAttendance() {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<AttendanceData>('/api/student/attendance').then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <StudentSidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        <PageHeader title="Attendance" />

        <div className="p-4 sm:p-8 space-y-6">
          {error && <ErrorText>{error}</ErrorText>}
          {data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <StatCard title="Events Attended" value={data.stats.totalEvents} icon="attended" iconColor="blue" />
                <StatCard title="Late Scans" value={data.stats.lateAttendance} icon="students" iconColor="red" />
                <StatCard title="On Time Scans" value={data.stats.onTimeAttendance} icon="rate" iconColor="green" />
              </div>

              <Card className="p-4 sm:p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Attendance Overview</h2>
                <StudentHistory rows={data.attendanceHistory} />
              </Card>

              <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5">
                <p className="text-sm text-gray-600">
                  Attendance is recorded by the council&apos;s RFID scanner. Have an excuse letter, or see a mistake in your record?
                </p>
                <Link href="/student-dashboard/reports" className={`${primaryButton} shrink-0 text-center`}>
                  Submit a Report
                </Link>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
