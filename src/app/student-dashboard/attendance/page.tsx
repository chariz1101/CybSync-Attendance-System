'use client';

import StudentSidebar from '@/components/StudentSidebar';
import StatCard from '@/components/StatCard';
import Link from 'next/link';
import { useState } from 'react';

// Types for backend integration
interface AttendanceRecord {
  id: string;
  type: string;
  event: string;
  date: string;
  time: string;
  status: 'on-time' | 'late' | 'excused';
}

interface StudentAttendanceData {
  stats: {
    totalEvents: number;
    lateAttendance: number;
    onTimeAttendance: number;
  };
  attendanceHistory: AttendanceRecord[];
}

export default function StudentAttendance() {
  // Backend integration: Replace with API data
  // Example API call:
  // useEffect(() => {
  //   const token = localStorage.getItem('studentToken') || sessionStorage.getItem('studentToken');
  //   fetch('/api/student/attendance', {
  //     headers: {
  //       'Authorization': `Bearer ${token}`,
  //       'Content-Type': 'application/json',
  //     },
  //   })
  //     .then(res => res.json())
  //     .then(data => setAttendanceData(data))
  //     .catch(error => console.error('Error fetching attendance data:', error));
  // }, []);

  const [attendanceData] = useState<StudentAttendanceData>({
    stats: {
      totalEvents: 12,
      lateAttendance: 4,
      onTimeAttendance: 5,
    },
    attendanceHistory: [
      {
        id: '1',
        type: '[AM, Sign In]',
        event: 'University Days 2026 - Day 1',
        date: 'January 23, 2026',
        time: '7:01',
        status: 'on-time',
      },
      {
        id: '2',
        type: '[AM, Sign In]',
        event: 'University Days 2026 - Day 1',
        date: 'January 23, 2026',
        time: '7:01',
        status: 'late',
      },
      {
        id: '3',
        type: '[AM, Sign In]',
        event: 'University Days 2026 - Day 1',
        date: 'January 23, 2026',
        time: '7:01',
        status: 'on-time',
      },
      {
        id: '4',
        type: '[AM, Sign In]',
        event: 'University Days 2026 - Day 1',
        date: 'January 23, 2026',
        time: '7:01',
        status: 'on-time',
      },
      {
        id: '5',
        type: '[AM, Sign In]',
        event: 'University Days 2026 - Day 1',
        date: 'January 23, 2026',
        time: '7:01',
        status: 'excused',
      },
      {
        id: '6',
        type: '[AM, Sign In]',
        event: 'University Days 2026 - Day 1',
        date: 'January 23, 2026',
        time: '7:01',
        status: 'late',
      },
      {
        id: '7',
        type: '[AM, Sign In]',
        event: 'University Days 2026 - Day 1',
        date: 'January 23, 2026',
        time: '7:01',
        status: 'on-time',
      },
      {
        id: '8',
        type: '[AM, Sign In]',
        event: 'University Days 2026 - Day 1',
        date: 'January 23, 2026',
        time: '7:01',
        status: 'on-time',
      },
      {
        id: '9',
        type: '[AM, Sign In]',
        event: 'University Days 2026 - Day 1',
        date: 'January 23, 2026',
        time: '7:01',
        status: 'on-time',
      },
      {
        id: '10',
        type: '[AM, Sign In]',
        event: 'University Days 2026 - Day 1',
        date: 'January 23, 2026',
        time: '7:01',
        status: 'late',
      },
      {
        id: '11',
        type: '[AM, Sign In]',
        event: 'University Days 2026 - Day 1',
        date: 'January 23, 2026',
        time: '7:01',
        status: 'on-time',
      },
    ],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-time':
        return 'text-green-600';
      case 'late':
        return 'text-red-600';
      case 'excused':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'on-time':
        return 'On Time';
      case 'late':
        return 'Late';
      case 'excused':
        return 'Excused';
      default:
        return status;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <StudentSidebar />

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="lg:ml-0 ml-12">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Attendance</h1>
            </div>
            <button className="p-3 hover:bg-gray-100 rounded-full transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="Total Number of Events"
              value={attendanceData.stats.totalEvents}
              icon="attended"
              iconColor="blue"
            />
            <StatCard
              title="Late Attendance"
              value={attendanceData.stats.lateAttendance}
              icon="students"
              iconColor="red"
            />
            <StatCard
              title="On Time Attendance"
              value={attendanceData.stats.onTimeAttendance}
              icon="rate"
              iconColor="green"
            />
          </div>

          {/* Attendance Overview Table */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Attendance Overview</h2>
            
            {/* Desktop Table View (hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Event</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Time</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.attendanceHistory.map((record) => (
                    <tr key={record.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                      <td className="py-4 px-4 text-sm text-gray-900 font-medium">{record.type}</td>
                      <td className="py-4 px-4 text-sm text-gray-900">{record.event}</td>
                      <td className="py-4 px-4 text-sm text-gray-900">{record.date}</td>
                      <td className="py-4 px-4 text-sm text-gray-900">{record.time}</td>
                      <td className="py-4 px-4">
                        <span className={`text-sm font-semibold ${getStatusColor(record.status)}`}>
                          {getStatusText(record.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (visible only on mobile) */}
            <div className="md:hidden space-y-4">
              {attendanceData.attendanceHistory.map((record) => (
                <div
                  key={record.id}
                  className="p-4 border border-gray-200 rounded-xl bg-gray-50 space-y-2.5"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900 mb-1">{record.event}</div>
                      <div className="text-xs text-gray-600">{record.type}</div>
                    </div>
                    <span className={`text-sm font-semibold ${getStatusColor(record.status)}`}>
                      {getStatusText(record.status)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 pt-2 border-t border-gray-200">
                    <span>{record.date}</span>
                    <span>{record.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Report a problem */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 bg-white border border-gray-200 rounded-2xl">
            <p className="text-sm text-gray-600">
              Attendance is recorded by the council&apos;s RFID scanner. Have an excuse letter, or see a mistake in your record?
            </p>
            <Link
              href="/student-dashboard/reports"
              className="shrink-0 text-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-lg"
            >
              Submit a Report
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

