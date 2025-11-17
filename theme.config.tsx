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
};

export default config;
