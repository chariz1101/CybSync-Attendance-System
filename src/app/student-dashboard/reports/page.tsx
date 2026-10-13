'use client';

import StudentSidebar from '@/components/StudentSidebar';
import { useState } from 'react';

// Types for backend integration
interface ReportFormData {
  eventTitle: string;
  description: string;
  attachments: File[];
}

interface PreviousReport {
  id: string;
  eventTitle: string;
  date: string; // Format: "10/01/2025"
  message: string; // Preview of the description
  status: 'resolved' | 'pending' | 'rejected';
}

export default function StudentReports() {
  // State for which section is expanded
  const [expandedSection, setExpandedSection] = useState<'report-form' | 'previous' | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<ReportFormData>({
    eventTitle: '',
    description: '',
    attachments: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<ReportFormData>>({});

  // Previous reports state
  const [previousReports, setPreviousReports] = useState<PreviousReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // Mock data for previous reports (replace with API call)
  const mockPreviousReports: PreviousReport[] = [
    {
      id: '1',
      eventTitle: 'University Hinampang [D1-SI-AM]',
      date: '10/01/2025',
      message: 'I have submitted a photo proof that I was present during the...',
      status: 'resolved',
    },
    {
      id: '2',
      eventTitle: 'University Hinampang [D1-SI-AM]',
      date: '10/01/2025',
      message: 'I have submitted a photo proof that I was present during the...',
      status: 'pending',
    },
    {
      id: '3',
      eventTitle: 'University Hinampang [D1-SI-AM]',
      date: '10/01/2025',
      message: 'I have submitted a photo proof that I was present during the...',
      status: 'rejected',
    },
  ];

  // Load previous reports when section is expanded
  // useEffect(() => {
  //   if (expandedSection === 'previous' && previousReports.length === 0) {
  //     fetchPreviousReports();
  //   }
  // }, [expandedSection]);

  // const fetchPreviousReports = async () => {
  //   setIsLoadingReports(true);
  //   try {
  //     const token = localStorage.getItem('studentToken') || sessionStorage.getItem('studentToken');
  //     const response = await fetch('/api/student/reports/history', {
  //       method: 'GET',
  //       headers: {
  //         'Authorization': `Bearer ${token}`,
  //         'Content-Type': 'application/json',
  //       },
  //     });
  //
  //     const data = await response.json();
  //
  //     if (response.ok) {
  //       setPreviousReports(data.reports);
  //     } else {
  //       console.error('Failed to fetch reports:', data.message);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching reports:', error);
  //   } finally {
  //     setIsLoadingReports(false);
  //   }
  // };

  // Toggle section expansion
  const toggleSection = (section: 'report-form' | 'previous') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name as keyof ReportFormData]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setFormData((prev) => ({
        ...prev,
        attachments: [...prev.attachments, ...Array.from(files)],
      }));
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<ReportFormData> = {};

    if (!formData.eventTitle.trim()) {
      newErrors.eventTitle = 'Event title is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Backend integration point
    console.log('Report submitted:', formData);

    // Example API call:
    // try {
    //   const token = localStorage.getItem('studentToken') || sessionStorage.getItem('studentToken');
    //   const formDataToSend = new FormData();
    //   formDataToSend.append('eventTitle', formData.eventTitle);
    //   formDataToSend.append('description', formData.description);
    //   formData.attachments.forEach((file, index) => {
    //     formDataToSend.append(`attachment_${index}`, file);
    //   });
    //
    //   const response = await fetch('/api/student/reports', {
    //     method: 'POST',
    //     headers: {
    //       'Authorization': `Bearer ${token}`,
    //     },
    //     body: formDataToSend,
    //   });
    //
    //   const data = await response.json();
    //
    //   if (response.ok) {
    //     alert('Report submitted successfully!');
    //     // Reset form
    //     setFormData({
    //       eventTitle: '',
    //       description: '',
    //       attachments: [],
    //     });
    //   } else {
    //     alert(data.message || 'Failed to submit report');
    //   }
    // } catch (error) {
    //   console.error('Report submission error:', error);
    //   alert('An error occurred. Please try again.');
    // } finally {
    //   setIsSubmitting(false);
    // }

    // Temporary success message (remove when API is connected)
    setTimeout(() => {
      alert('Report submitted successfully! (Demo mode - connect to backend)');
      setFormData({
        eventTitle: '',
        description: '',
        attachments: [],
      });
      setIsSubmitting(false);
    }, 1000);
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reports</h1>
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
          {/* Report Sections */}
          <div className="space-y-3 sm:space-y-4">
            {/* Report Form */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all">
              {/* Section Header - Clickable */}
              <button
                onClick={() => toggleSection('report-form')}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 text-left">
                  <h2 className="text-xl font-bold text-gray-900">Report Form</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    This form is used to report a discrepancy in your attendance.
                  </p>
                </div>
                <div className="ml-4">
                  <svg
                    className={`w-6 h-6 text-gray-600 transition-transform ${
                      expandedSection === 'report-form' ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Section Content - Expandable */}
              {expandedSection === 'report-form' && (
                <div className="border-t border-gray-200">
                  <div className="p-4 sm:p-6">
                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                      {/* Event Title */}
                      <div>
                        <label htmlFor="eventTitle" className="block text-base font-medium text-gray-700 mb-2">
                          Event Title<span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            id="eventTitle"
                            name="eventTitle"
                            value={formData.eventTitle}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 border ${
                              errors.eventTitle ? 'border-red-500' : 'border-gray-300'
                            } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 appearance-none cursor-pointer`}
                          >
                            <option value="">Enter Event Title</option>
                            <option value="University Days 2026 - Day 1">University Days 2026 - Day 1</option>
                            <option value="University Pagirimaw 2025">University Pagirimaw 2025</option>
                            <option value="Tech Summit 2026">Tech Summit 2026</option>
                            <option value="Other">Other</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                        {errors.eventTitle && (
                          <p className="mt-1 text-sm text-red-500">{errors.eventTitle}</p>
                        )}
                      </div>

                      {/* Description */}
                      <div>
                        <label htmlFor="description" className="block text-base font-medium text-gray-700 mb-2">
                          Description<span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="description"
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          placeholder="Explain your grievance."
                          rows={12}
                          className={`w-full px-4 py-3 border ${
                            errors.description ? 'border-red-500' : 'border-gray-300'
                          } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400 resize-none`}
                        />
                        {errors.description && (
                          <p className="mt-1 text-sm text-red-500">{errors.description}</p>
                        )}
                      </div>

                      {/* Add Supporting Documents */}
                      <div>
                        <input
                          type="file"
                          id="file-upload"
                          multiple
                          accept="image/*,.pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="file-upload"
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Supporting Documents
                        </label>

                        {/* Display uploaded files */}
                        {formData.attachments.length > 0 && (
                          <div className="mt-4 space-y-2">
                            {formData.attachments.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                              >
                                <div className="flex items-center gap-2">
                                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                  </svg>
                                  <span className="text-sm text-gray-700">{file.name}</span>
                                  <span className="text-xs text-gray-500">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeAttachment(index)}
                                  className="text-red-500 hover:text-red-700 transition-colors"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Tip */}
                      <div className="text-sm text-gray-500">
                        Tip: Fill up everything for faster processing
                      </div>

                      {/* Submit Button */}
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full sm:w-auto px-8 sm:px-12 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors shadow-lg disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>

            {/* Previous Reports */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all">
              {/* Section Header - Clickable */}
              <button
                onClick={() => toggleSection('previous')}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 text-left">
                  <h2 className="text-xl font-bold text-gray-900">Previous Reports</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Monitor your report here.
                  </p>
                </div>
                <div className="ml-4">
                  <svg
                    className={`w-6 h-6 text-gray-600 transition-transform ${
                      expandedSection === 'previous' ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Section Content - Expandable */}
              {expandedSection === 'previous' && (
                <div className="border-t border-gray-200">
                  <div className="p-4 sm:p-6">
                    {isLoadingReports ? (
                      <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="text-gray-500 mt-4">Loading reports...</p>
                      </div>
                    ) : mockPreviousReports.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg font-medium">No reports found</p>
                        <p className="text-sm mt-1">You haven&apos;t submitted any reports yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {mockPreviousReports.map((report) => (
                          <div
                            key={report.id}
                            className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                              {/* Report Info */}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 mb-1">
                                  {report.eventTitle}
                                </h3>
                                <p className="text-sm text-gray-600 break-words">
                                  {report.date}| {report.message}
                                </p>
                              </div>

                              {/* Status Badge */}
                              <div className="flex-shrink-0">
                                <span
                                  className={`inline-block px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap ${
                                    report.status === 'resolved'
                                      ? 'text-green-600 bg-green-50'
                                      : report.status === 'pending'
                                      ? 'text-blue-600 bg-blue-50'
                                      : 'text-red-600 bg-red-50'
                                  }`}
                                >
                                  Status: {report.status === 'resolved' ? 'Resolved' : report.status === 'pending' ? 'Pending' : 'Rejected'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

