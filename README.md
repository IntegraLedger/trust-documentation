# Integra Trust Platform Documentation

This is a Nextra-powered documentation site for the Integra Trust Platform.

## Overview

The documentation is built as a static site using Nextra (Next.js + MDX) and served from within the main Trust Platform application via an iframe.

## Structure

```
trust-documentation/
├── pages/                    # Documentation pages (MDX/MD)
│   ├── index.mdx            # Home page
│   ├── architecture/        # Architecture docs
│   ├── observability/       # Observability docs
│   └── workflows/           # Workflow docs
├── theme.config.tsx         # Nextra theme configuration
├── next.config.mjs          # Next.js configuration
└── package.json
```

## Development

```bash
# Install dependencies
npm install

# Start dev server (serves on http://localhost:3000)
npm run dev

# Build for standalone deployment (no basePath, outputs to out/)
npm run build

# Build for embedded deployment (basePath: /docs, outputs to ../cf-integra-trust-platform/public/docs)
npm run build:embedded
```

## Adding Documentation

1. **Add markdown files** to the `pages/` directory
2. **Update _meta.ts** files to configure sidebar navigation
3. **Run build** to generate static site

Example:
```bash
# Add a new doc
echo "# My New Doc" > pages/my-doc.md

# Update pages/_meta.ts
export default {
  index: 'Introduction',
  'my-doc': 'My New Doc',
};

# Build
npm run build
```

## Build Output

There are two build modes:

1. **Standalone deployment** - Built to `out/` directory for hosting at integra-documentation.pages.dev
2. **Embedded deployment** - Built to `../cf-integra-trust-platform/public/docs` with basePath `/docs` for iframe integration

## Integration with Trust Platform

The documentation is embedded in the Trust Platform at `/documentation` route using an iframe:

- **Page Component**: `cf-integra-trust-platform/src/pages/DocumentationPage.tsx`
- **Router**: Added to `cf-integra-trust-platform/src/router/index.tsx`
- **Sidebar**: "Documentation" link in `cf-integra-trust-platform/src/components/Sidebar.tsx`
- **Landing Page**: "Documentation" button on `cf-integra-trust-platform/src/pages/HomePage.tsx`

## Deployment

The static site is deployed as part of the Trust Platform:

1. Build docs: `npm run build` (in trust-documentation/)
2. Deploy Trust Platform to Cloudflare Pages (includes public/docs)

## Syncing Docs from Other Repos

You can sync markdown files from other repositories:

```bash
# Example: Sync smart contract docs
cp -r ../smart-contracts/docs/*.md pages/contracts/

# Rebuild
npm run build
```

## Notes

- Uses Nextra v3 (requires `pages/_app.tsx` and `_meta.ts` files)
- Static export configured for Cloudflare Pages compatibility
- Base path set to `/docs` for iframe integration
