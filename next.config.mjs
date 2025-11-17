import nextra from 'nextra';

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
});

const isEmbedded = process.env.NEXT_CONFIG === 'embedded';

export default withNextra({
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Use basePath for embedded version, no basePath for standalone
  ...(isEmbedded ? { basePath: '/docs' } : {}),
  distDir: isEmbedded ? '../cf-integra-trust-platform/public/docs' : 'out',
});
