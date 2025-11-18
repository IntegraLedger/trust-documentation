import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { usePrivy } from '@privy-io/react-auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();

  useEffect(() => {
    // Wait for Privy to be ready
    if (!ready) return;

    // If not authenticated, show login
    if (!authenticated) {
      login();
    }
  }, [ready, authenticated, login]);

  // Show loading while checking authentication
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#010044] via-[#001B5A] to-[#0041B1]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#010044] via-[#001B5A] to-[#0041B1]">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <img
            src="/integra-logo-300.png"
            alt="Integra"
            className="h-16 mx-auto mb-6"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Internal Documentation
          </h1>
          <p className="text-gray-600 mb-6">
            This section is restricted to Integra staff. Please log in to continue.
          </p>
          <button
            onClick={() => login()}
            className="w-full bg-[#0041B1] hover:bg-[#001B5A] text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Log In with Privy
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full mt-3 text-gray-600 hover:text-gray-900 font-medium py-2 transition-colors duration-200"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  // User is authenticated, show the protected content
  return <>{children}</>;
}
