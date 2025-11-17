import React from 'react';
import { DocsThemeConfig } from 'nextra-theme-docs';

const config: DocsThemeConfig = {
  logo: <span style={{ fontWeight: 'bold' }}>Integra Trust Platform</span>,
  project: {
    link: 'https://github.com/IntegraLedger',
  },
  docsRepositoryBase: 'https://github.com/IntegraLedger',
  footer: {
    content: <span>© 2025 Integra Trust Platform</span>,
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
  head: (
    <>
      <style>{`
        .rwc-hero {
          background-color: #1e40af;
          color: white;
          padding: 4rem 2rem;
          border-radius: 0.5rem;
          margin: 2rem 0;
        }
        .dark .rwc-hero {
          background-color: #1e3a8a;
          color: white;
        }
      `}</style>
    </>
  ),
};

export default config;
