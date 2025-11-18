import React from 'react';
import { DocsThemeConfig } from 'nextra-theme-docs';
import IntegraLogo from './components/IntegraLogo';

const config: DocsThemeConfig = {
  logo: <IntegraLogo variant="dark" height={32} />,
  project: {
    link: 'https://github.com/IntegraLedger',
  },
  docsRepositoryBase: 'https://github.com/IntegraLedger/trust-documentation',
  footer: {
    content: (
      <div style={{ width: '100%', textAlign: 'center' }}>
        <span>© 2025 Integra Trust Platform. All rights reserved.</span>
      </div>
    ),
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
  search: {
    placeholder: 'Search documentation...',
  },
  head: (
    <>
      <link rel="icon" href="/integra-favicon.png" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content="Integra Documentation - Comprehensive guides for developers, users, and internal teams" />
      <style>{`
        :root {
          --integra-dark-blue: #010044;
          --integra-medium-blue: #001B5A;
          --integra-blue: #0041B1;
          --integra-green: #00CC77;
        }

        .rwc-hero {
          background: linear-gradient(135deg, var(--integra-blue) 0%, var(--integra-medium-blue) 100%);
          color: white;
          padding: 4rem 2rem;
          border-radius: 0.75rem;
          margin: 2rem 0;
        }

        .dark .rwc-hero {
          background: linear-gradient(135deg, var(--integra-medium-blue) 0%, var(--integra-dark-blue) 100%);
        }

        /* Customize link colors to match Integra brand */
        .nextra-content a {
          color: var(--integra-blue);
        }

        .nextra-content a:hover {
          color: var(--integra-medium-blue);
        }

        /* Active sidebar item */
        .nextra-sidebar-menu .active {
          background-color: rgba(0, 65, 177, 0.1);
          color: var(--integra-blue);
        }
      `}</style>
    </>
  ),
};

export default config;
