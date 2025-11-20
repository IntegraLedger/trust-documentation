'use client'

import { ApiReferenceReact } from '@scalar/api-reference-react'
import '@scalar/api-reference-react/style.css'

interface ApiReferenceProps {
  specUrl: string
  title?: string
}

export default function ApiReference({ specUrl, title }: ApiReferenceProps) {
  return (
    <div style={{ minHeight: '100vh' }}>
      <ApiReferenceReact
        configuration={{
          spec: {
            url: specUrl,
          },
          hideDownloadButton: false,
          darkMode: false,
          layout: 'modern',
          theme: 'purple',
          customCss: `
            .scalar-app {
              font-family: inherit;
            }
          `,
        }}
      />
    </div>
  )
}
