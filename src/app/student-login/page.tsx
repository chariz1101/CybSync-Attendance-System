'use client';

import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// Minimal typing for the Google Identity Services script.
type GoogleCredentialResponse = { credential: string };
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }): void;
          renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
        };
      };
    };
  }
}

export default function StudentLogin() {
  const [studentId, setStudentId] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // The Google callback is registered once, so read the latest form values from refs.
  const studentIdRef = useRef(studentId);
  const rememberMeRef = useRef(rememberMe);
  studentIdRef.current = studentId;
  rememberMeRef.current = rememberMe;

  const handleGoogleCredential = useCallback(async ({ credential }: GoogleCredentialResponse) => {
    const id = studentIdRef.current.trim();
    if (!id) {
      setError('Enter your Student ID first, then sign in with Google.');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: id, credential, rememberMe: rememberMeRef.current }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Login failed. Please try again.');
        return;
      }

      // The session cookie is set by the server; go to the dashboard.
      window.location.href = '/student-dashboard';
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!googleReady || !GOOGLE_CLIENT_ID || !window.google || !googleButtonRef.current) return;
    window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'signin_with',
      width: 320,
    });
  }, [googleReady, handleGoogleCredential]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0000FF] px-4 py-8">
      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 sm:p-10">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
              <svg 
                className="w-12 h-12 text-blue-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                />
              </svg>
            </div>
            <div className="absolute top-0 right-0 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-center text-black mb-2">
          Student Login
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Enter your Student ID, then sign in with your school Google account
        </p>

        {/* Login Form */}
        <div className="space-y-5">
          {/* Student ID Field */}
          <div>
            <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">
              Student ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg 
                  className="h-5 w-5 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" 
                  />
                </svg>
              </div>
              <input
                id="studentId"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g., 2022M0000"
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 text-gray-900 placeholder-gray-400"
                required
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              It must match the student record linked to your school email
            </p>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
              Remember me
            </label>
          </div>

          {/* Google Sign-In */}
          <div className="flex flex-col items-center gap-3">
            {GOOGLE_CLIENT_ID ? (
              <>
                <div ref={googleButtonRef} className={isLoading ? 'pointer-events-none opacity-50' : ''} />
                {isLoading && <p className="text-sm text-gray-600">Signing in...</p>}
              </>
            ) : (
              <p className="text-sm text-red-600 text-center">
                Google sign-in isn&apos;t configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID.
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 text-center bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}
        </div>

        {/* Council Login Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Student Council?{' '}
            <Link href="/" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
              Login Here
            </Link>
          </p>
        </div>
      </div>

      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setGoogleReady(true)} />

      {/* Footer */}
      <footer className="mt-8 text-white text-sm">
        @ Cyb:Robotics Organization
      </footer>
    </main>
  );
}

