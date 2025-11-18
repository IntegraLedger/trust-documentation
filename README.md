# Integra Trust Platform Documentation

This is a Nextra-powered documentation site for the Integra Trust Platform.

## Overview

The documentation is built as a standalone static site using Nextra (Next.js + MDX) and deployed to Cloudflare Pages.

## Structure

```
trust-documentation/
├── pages/                    # Documentation pages (MDX/MD)
│   ├── index.mdx            # Home page
│   ├── architecture/        # Architecture docs
│   ├── observability/       # Observability docs
│   ├── workflows/           # Workflow docs
│   └── smart-contracts/     # Smart contract documentation
│       ├── layer0/          # Attestation & Access Control
│       ├── layer2/          # Document Registry & Resolvers
│       ├── layer3/          # Tokenizers (13 types)
│       ├── layer4/          # Message & Signal contracts
│       ├── layer6/          # Executor contracts
│       ├── guides/          # Integration, deployment, security guides
│       └── patterns/        # Design patterns & best practices
├── theme.config.tsx         # Nextra theme configuration
├── next.config.mjs          # Next.js configuration
└── package.json
```

## Documentation Coverage

The documentation includes comprehensive coverage of:

- **Smart Contracts V7** - Complete reference for all contract layers (Layer 0-6)
- **Architecture** - System design and architectural patterns
- **Deployment Guides** - Step-by-step deployment instructions
- **Integration Guides** - How to integrate with Integra contracts
- **Security Best Practices** - Security patterns and recommendations
- **Testing Guides** - Contract testing strategies
- **Observability** - Monitoring and alerting documentation
- **Workflows** - Process and workflow documentation

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

## Deployment

Deploy to Cloudflare Pages:

```bash
npm run deploy
```

This builds the static site and deploys it to Cloudflare Pages as a standalone documentation site.

The documentation will be accessible at your Cloudflare Pages URL (e.g., `integra-documentation.pages.dev`).

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
- Standalone deployment (not embedded in other applications)
