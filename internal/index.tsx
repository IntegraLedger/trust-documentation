import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const ALLOWED_EMAILS = ['davidoberger@gmail.com', 'dfisher@integraledger.com'];

export default function InternalPage() {
  const { authenticated, user, login } = usePrivy();
  const router = useRouter();

  const userEmail = user?.email?.address;
  const isAuthorized = authenticated && userEmail && ALLOWED_EMAILS.includes(userEmail);

  useEffect(() => {
    if (authenticated && !isAuthorized) {
      // Authenticated but not authorized - redirect to home
      router.push('/');
    }
  }, [authenticated, isAuthorized, router]);

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-sky-100">
        <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 text-center">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Protected Content
          </h1>
          <p className="text-gray-600 mb-8">
            This section is restricted to authorized Integra staff members.
            Please log in to continue.
          </p>
          <button
            onClick={login}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            Log In with Email
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-sky-100">
        <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 text-center">
          <div className="text-6xl mb-6">⛔</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-8">
            You are not authorized to access this content. This section is restricted to Integra staff.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Internal Documentation
        </h1>

        <p className="text-lg text-gray-700 mb-8">
          Welcome to Integra Internal Documentation. This section contains operational guides,
          support procedures, and administrative documentation for Integra staff.
        </p>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-2xl">🔒</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700 font-semibold">
                Protected Content
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                This documentation is restricted to Integra staff. All content is confidential
                and should not be shared outside the organization.
              </p>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">Overview</h2>

        <p className="text-gray-700 mb-6">
          This internal documentation hub provides Integra team members with the resources needed for:
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-blue-900 mb-3">Operations</h3>
            <ul className="space-y-2 text-blue-800">
              <li>• Deployment procedures and system monitoring</li>
              <li>• Production and staging environment management</li>
              <li>• Maintenance windows and emergency procedures</li>
            </ul>
          </div>

          <div className="bg-emerald-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-emerald-900 mb-3">Customer Support</h3>
            <ul className="space-y-2 text-emerald-800">
              <li>• Ticket priority levels and response times</li>
              <li>• Common issues and resolutions</li>
              <li>• Escalation processes and contacts</li>
            </ul>
          </div>

          <div className="bg-purple-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-purple-900 mb-3">Troubleshooting</h3>
            <ul className="space-y-2 text-purple-800">
              <li>• Diagnostic tools (Sentry, Jaeger, Kubernetes logs)</li>
              <li>• Common system issues and solutions</li>
              <li>• Emergency procedures</li>
            </ul>
          </div>

          <div className="bg-orange-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-orange-900 mb-3">Administration</h3>
            <ul className="space-y-2 text-orange-800">
              <li>• User management and permissions</li>
              <li>• Configuration management via Infisical</li>
              <li>• Database operations and Kubernetes management</li>
            </ul>
          </div>
        </div>

        <div className="text-center">
          <p className="text-gray-600 text-sm">
            Logged in as: <span className="font-semibold">{userEmail}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
