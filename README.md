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

# Build static site
npm run build
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

The static site is built to `out/` directory for deployment to Cloudflare Pages.

## Integration with Trust Platform

The documentation is deployed to Cloudflare Pages at `integra-documentation.pages.dev` and embedded in the Trust Platform at `/documentation` route using an iframe:

- **Page Component**: `cf-integra-trust-platform/src/pages/DocumentationPage.tsx`
- **Router**: Added to `cf-integra-trust-platform/src/router/index.tsx`
- **Sidebar**: "Documentation" link in `cf-integra-trust-platform/src/components/Sidebar.tsx`
- **Landing Page**: "Documentation" button on `cf-integra-trust-platform/src/pages/HomePage.tsx`

## Deployment

Deploy to Cloudflare Pages:

```bash
npm run deploy
```

This builds the static site and deploys it to the `integra-documentation` Cloudflare Pages project.

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
