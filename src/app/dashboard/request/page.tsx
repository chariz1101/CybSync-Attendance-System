'use client';

import Sidebar from '@/components/Sidebar';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { ErrorText, PageHeader, SuccessText } from '@/components/ui';

// Types for backend integration
interface EventRequest {
  eventTitle: string;
  dateStart: string;
  timeStart: string;
  dateEnd: string;
  timeEnd: string;
  location: string;
  shortDescription: string;
}

export default function Request() {
  // Form state
  const [formData, setFormData] = useState<EventRequest>({
    eventTitle: '',
    dateStart: '',
    timeStart: '',
    dateEnd: '',
    timeEnd: '',
    location: '',
    shortDescription: '',
  });
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<EventRequest>>({});

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name as keyof EventRequest]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<EventRequest> = {};

    if (!formData.eventTitle.trim()) {
      newErrors.eventTitle = 'Event title is required';
    }
    if (!formData.dateStart) {
      newErrors.dateStart = 'Start date is required';
    }
    if (!formData.timeStart) {
      newErrors.timeStart = 'Start time is required';
    }
    if (!formData.dateEnd) {
      newErrors.dateEnd = 'End date is required';
    }
    if (!formData.timeEnd) {
      newErrors.timeEnd = 'End time is required';
    }

    // Validate that end date/time is after start date/time
    if (formData.dateStart && formData.dateEnd) {
      const start = new Date(`${formData.dateStart}T${formData.timeStart || '00:00'}`);
      const end = new Date(`${formData.dateEnd}T${formData.timeEnd || '00:00'}`);
      
      if (end <= start) {
        newErrors.dateEnd = 'End date/time must be after start date/time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await api('/api/events/request', { method: 'POST', json: formData });
      setResult({ ok: true, message: `Request for "${formData.eventTitle}" sent. An admin will review it on the Events page.` });
      setFormData({ eventTitle: '', dateStart: '', timeStart: '', dateEnd: '', timeEnd: '', location: '', shortDescription: '' });
    } catch (error) {
      setResult({ ok: false, message: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <PageHeader title="Request Event" />

        {/* Content */}
        <div className="p-4 sm:p-8">
          {/* Event Request Form */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 max-w-8xl mx-auto">
            {/* Form Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Request Form</h2>
              <p className="text-gray-600">
                This form is used to request an event to be added to your Dashboard
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Event Title */}
              <div>
                <label htmlFor="eventTitle" className="block text-base font-medium text-gray-700 mb-2">
                  Event Title<span className="text-red-500">*</span>
                </label>
                <input
                  id="eventTitle"
                  name="eventTitle"
                  type="text"
                  value={formData.eventTitle}
                  onChange={handleChange}
                  placeholder="Enter Event Title"
                  className={`w-full px-4 py-3 border ${
                    errors.eventTitle ? 'border-red-500' : 'border-gray-300'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400`}
                />
                {errors.eventTitle && (
                  <p className="mt-1 text-sm text-red-500">{errors.eventTitle}</p>
                )}
              </div>

              {/* Date and Time Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date Start */}
                <div>
                  <label htmlFor="dateStart" className="block text-base font-medium text-gray-700 mb-2">
                    Date Start<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="dateStart"
                      name="dateStart"
                      type="date"
                      value={formData.dateStart}
                      onChange={handleChange}
                      placeholder="MM/DD/YYYY"
                      className={`w-full px-4 py-3 border ${
                        errors.dateStart ? 'border-red-500' : 'border-gray-300'
                      } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400 appearance-none`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    </div>
                  </div>
                  {errors.dateStart && (
                    <p className="mt-1 text-sm text-red-500">{errors.dateStart}</p>
                  )}
                </div>

                {/* Time Start */}
                <div>
                  <label htmlFor="timeStart" className="block text-base font-medium text-gray-700 mb-2">
                    Time Start<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="timeStart"
                      name="timeStart"
                      type="time"
                      value={formData.timeStart}
                      onChange={handleChange}
                      placeholder="24:00"
                      className={`w-full px-4 py-3 border ${
                        errors.timeStart ? 'border-red-500' : 'border-gray-300'
                      } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400 appearance-none`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {errors.timeStart && (
                    <p className="mt-1 text-sm text-red-500">{errors.timeStart}</p>
                  )}
                </div>
              </div>

              {/* Date and Time Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date End */}
                <div>
                  <label htmlFor="dateEnd" className="block text-base font-medium text-gray-700 mb-2">
                    Date End<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="dateEnd"
                      name="dateEnd"
                      type="date"
                      value={formData.dateEnd}
                      onChange={handleChange}
                      placeholder="MM/DD/YYYY"
                      className={`w-full px-4 py-3 border ${
                        errors.dateEnd ? 'border-red-500' : 'border-gray-300'
                      } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400 appearance-none`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    </div>
                  </div>
                  {errors.dateEnd && (
                    <p className="mt-1 text-sm text-red-500">{errors.dateEnd}</p>
                  )}
                </div>

                {/* Time End */}
                <div>
                  <label htmlFor="timeEnd" className="block text-base font-medium text-gray-700 mb-2">
                    Time End<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="timeEnd"
                      name="timeEnd"
                      type="time"
                      value={formData.timeEnd}
                      onChange={handleChange}
                      placeholder="24:00"
                      className={`w-full px-4 py-3 border ${
                        errors.timeEnd ? 'border-red-500' : 'border-gray-300'
                      } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400 appearance-none`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {errors.timeEnd && (
                    <p className="mt-1 text-sm text-red-500">{errors.timeEnd}</p>
                  )}
                </div>
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location" className="block text-base font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. University Gym"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400"
                />
              </div>

              {/* Short Description */}
              <div>
                <label htmlFor="shortDescription" className="block text-base font-medium text-gray-700 mb-2">
                  Short Description
                </label>
                <textarea
                  id="shortDescription"
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleChange}
                  placeholder="Enter Short Description"
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400 resize-none"
                />
              </div>

              {/* Contact Info */}
              <div className="text-sm text-gray-600">
                <p>
                  For more inquiries please contact Cyb:Org via our email:{' '}
                  <a
                    href="mailto:cyb.sync@gmail.com"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    cyb.sync@gmail.com
                  </a>
                </p>
                <p className="mt-2 text-gray-500">
                  Tip: Fill up everything for faster processing
                </p>
              </div>

              {result &&
                (result.ok ? (
                  <SuccessText>
                    {result.message}{' '}
                    <Link href="/dashboard/events" className="font-semibold underline">
                      View requests
                    </Link>
                  </SuccessText>
                ) : (
                  <ErrorText>{result.message}</ErrorText>
                ))}

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-12 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors disabled:cursor-not-allowed shadow-lg"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

