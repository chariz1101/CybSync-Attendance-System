'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import StatCard from '@/components/StatCard';
import { CourseDonut, YearCourseBars } from '@/components/charts';
import { Card, EmptyState, ErrorText, PageHeader, StatusPill } from '@/components/ui';
import { api } from '@/lib/api';
import { formatEventWhen } from '@/lib/format';
import type { toEventJson } from '@/lib/events';
import type { EventStats } from '@/lib/eventStats';

type EventJson = ReturnType<typeof toEventJson>;
type DashboardData = Partial<EventStats> & {
  event: EventJson | null;
  stats: EventStats['stats'] | null;
  upcomingEvents: EventJson[];
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<DashboardData>('/api/dashboard').then(setData).catch((e) => setError(e.message));
  }, []);

  const event = data?.event;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        <PageHeader
          title="Event Dashboard"
          subtitle={
            event ? (
              <span className="inline-flex flex-wrap items-center gap-2">
                {event.name} <StatusPill status={event.status} />
              </span>
            ) : data ? (
              'No events yet'
            ) : (
              ' '
            )
          }
        />

        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
          {error && <ErrorText>{error}</ErrorText>}

          {data && !event && (
            <Card>
              <EmptyState title="No event has started yet">
                Create or approve an event on the{' '}
                <Link href="/dashboard/events" className="text-blue-600 font-semibold hover:underline">
                  Events
                </Link>{' '}
                page, then start it to begin scanning.
              </EmptyState>
            </Card>
          )}

          {event && data?.stats && (
            <>
              <p className="text-sm text-gray-600 -mt-2">
                {event.status === 'active' ? 'Live numbers for the running event' : 'Results from the most recent event'} ·{' '}
                {formatEventWhen(event)}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <StatCard title="Total Department Students" value={data.stats.totalDepartmentStudents} icon="students" iconColor="red" />
                <StatCard title="Total Students Attended" value={data.stats.totalStudentsAttended} icon="attended" iconColor="blue" />
                <StatCard title="Attendance Rate" value={`${data.stats.attendanceRate}%`} icon="rate" iconColor="green" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Attendance Distribution by Course</h2>
                  <CourseDonut data={data.courseDistribution ?? []} />
                </Card>
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Attendance Distribution by Year and Course</h2>
                  <YearCourseBars data={data.yearCourseDistribution ?? []} />
                </Card>
              </div>
            </>
          )}

          {data && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Upcoming Events</h2>
                <Link href="/dashboard/events" className="text-sm text-blue-600 font-semibold hover:underline">
                  Manage events
                </Link>
              </div>
              {data.upcomingEvents.length === 0 ? (
                <p className="text-sm text-gray-500">No upcoming events.</p>
              ) : (
                <div className="space-y-4">
                  {data.upcomingEvents.map((e) => (
                    <div key={e.id} className="p-5 border border-gray-200 rounded-xl">
                      <h3 className="text-lg font-semibold text-gray-900">{e.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatEventWhen(e)}
                        {e.location && ` · ${e.location}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
