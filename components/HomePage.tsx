import React from 'react';
import { useRouter } from 'next/router';

export default function HomePage() {
  const router = useRouter();

  const sections = [
    {
      title: 'Developer Documentation',
      description: 'Smart contract references, API documentation, and integration guides for developers building on Integra.',
      icon: '👩‍💻',
      path: '/developers',
      color: 'from-blue-600 to-blue-700',
      hoverColor: 'hover:from-blue-700 hover:to-blue-800',
    },
    {
      title: 'User Guide',
      description: 'Learn how to register documents, verify authenticity, and use the Integra Trust Platform.',
      icon: '📚',
      path: '/users',
      color: 'from-emerald-600 to-emerald-700',
      hoverColor: 'hover:from-emerald-700 hover:to-emerald-800',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-200 to-sky-300">
      {/* Header */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <img
            src="/integra-logo-300.png"
            alt="Integra"
            className="h-16 mx-auto mb-8"
          />
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Trust with Integra Documentation
          </h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Comprehensive documentation for developers and users
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 max-w-4xl gap-8 mx-auto">
          {sections.map((section) => (
            <button
              key={section.path}
              onClick={() => router.push(section.path)}
              className={`
                relative overflow-hidden rounded-2xl p-8
                bg-gradient-to-br ${section.color} ${section.hoverColor}
                shadow-2xl hover:shadow-3xl
                transform transition-all duration-300
                hover:scale-105 hover:-translate-y-2
                text-left group
              `}
            >
              {/* Icon */}
              <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                {section.icon}
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white mb-3">
                {section.title}
              </h2>

              {/* Description */}
              <p className="text-blue-100 mb-4 leading-relaxed">
                {section.description}
              </p>

              {/* Arrow Icon */}
              <div className="absolute bottom-8 right-8 text-white opacity-50 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>

              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-600">
          <p>Need help? Contact support@integraledger.com</p>
        </div>
      </div>
    </div>
  );
}
