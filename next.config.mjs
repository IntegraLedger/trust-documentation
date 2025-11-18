import nextra from 'nextra';

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
});

export default withNextra({
  output: 'export',
  images: {
    unoptimized: true,
  },
  distDir: 'out',
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
});
