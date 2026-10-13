'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import StudentSidebar from '@/components/StudentSidebar';
import StatCard from '@/components/StatCard';
import { StudentHistory, type HistoryRow } from '@/components/StudentHistory';
import { Card, ErrorText, PageHeader, StatusPill } from '@/components/ui';
import { api } from '@/lib/api';
import { formatEventWhen } from '@/lib/format';
import type { studentStats } from '@/lib/studentAttendance';
import type { toEventJson } from '@/lib/events';

type DashboardData = {
  stats: ReturnType<typeof studentStats>;
  attendanceHistory: HistoryRow[];
  upcomingEvents: ReturnType<typeof toEventJson>[];
};

export default function StudentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<DashboardData>('/api/student/dashboard').then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <StudentSidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        <PageHeader title="Student Dashboard" />

        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
          {error && <ErrorText>{error}</ErrorText>}
          {data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <StatCard title="Events Attended" value={data.stats.totalEvents} icon="attended" iconColor="blue" />
                <StatCard title="Late Attendance Rate" value={`${data.stats.lateAttendanceRate}%`} icon="students" iconColor="red" />
                <StatCard title="On Time Attendance Rate" value={`${data.stats.onTimeAttendanceRate}%`} icon="rate" iconColor="green" />
              </div>

              <Card className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Recent Attendance</h2>
                  <Link href="/student-dashboard/attendance" className="text-sm text-blue-600 font-semibold hover:underline">
                    See all
                  </Link>
                </div>
                <StudentHistory rows={data.attendanceHistory} />
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Upcoming Events</h2>
                {data.upcomingEvents.length === 0 ? (
                  <p className="text-sm text-gray-500">No upcoming events.</p>
                ) : (
                  <div className="space-y-4">
                    {data.upcomingEvents.map((e) => (
                      <div key={e.id} className="p-5 border border-gray-200 rounded-xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">{e.name}</h3>
                          {e.status === 'active' && <StatusPill status="active" />}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatEventWhen(e)}
                          {e.location && ` · ${e.location}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
