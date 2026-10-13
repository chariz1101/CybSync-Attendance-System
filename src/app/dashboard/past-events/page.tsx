'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import StatCard from '@/components/StatCard';
import { CourseDonut, YearCourseBars } from '@/components/charts';
import { Card, EmptyState, ErrorText, PageHeader, secondaryButton } from '@/components/ui';
import { api } from '@/lib/api';
import { formatEventWhen } from '@/lib/format';
import type { toEventJson } from '@/lib/events';
import type { EventStats } from '@/lib/eventStats';

type PastEvent = ReturnType<typeof toEventJson> & EventStats;

export default function PastEvents() {
  const [events, setEvents] = useState<PastEvent[] | null>(null);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    api<{ events: PastEvent[] }>('/api/events/past')
      .then(({ events }) => setEvents(events))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        <PageHeader title="Past Events" subtitle="Attendance results of events that have ended" />

        <div className="p-4 sm:p-8 space-y-4">
          {error && <ErrorText>{error}</ErrorText>}

          {events?.length === 0 && (
            <Card>
              <EmptyState title="No past events yet">Events show up here after you end them on the Events page.</EmptyState>
            </Card>
          )}

          {events?.map((event) => {
            const isExpanded = expandedId === event.id;
            return (
              <Card key={event.id} className="overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  aria-expanded={isExpanded}
                  className="w-full p-6 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-gray-900">{event.name}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatEventWhen(event)} · {event.stats.totalStudentsAttended} attended ({event.stats.attendanceRate}%)
                      {event.stats.excused > 0 && ` · ${event.stats.excused} excused`}
                    </p>
                  </div>
                  <svg
                    className={`w-6 h-6 text-gray-600 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200 p-4 sm:p-6 bg-gray-50 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                      <StatCard title="Total Department Students" value={event.stats.totalDepartmentStudents} icon="students" iconColor="red" />
                      <StatCard title="Total Students Attended" value={event.stats.totalStudentsAttended} icon="attended" iconColor="blue" />
                      <StatCard title="Attendance Rate" value={`${event.stats.attendanceRate}%`} icon="rate" iconColor="green" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Attendance Distribution by Course</h3>
                        <CourseDonut data={event.courseDistribution} />
                      </Card>
                      <Card className="p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Attendance Distribution by Year and Course</h3>
                        <YearCourseBars data={event.yearCourseDistribution} />
                      </Card>
                    </div>
                    <Link href={`/dashboard/attendance?event=${event.id}`} className={`${secondaryButton} inline-block`}>
                      View attendance records
                    </Link>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
