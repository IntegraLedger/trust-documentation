import { useEffect, useRef } from 'react'

interface ApiReferenceProps {
  specUrl: string
  title?: string
}

export default function ApiReference({ specUrl, title }: ApiReferenceProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Load Scalar from CDN
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference'
    script.onload = () => {
      if (containerRef.current && (window as any).Scalar) {
        (window as any).Scalar.createApiReference(containerRef.current, {
          spec: {
            url: specUrl,
          },
          hideDownloadButton: false,
          darkMode: false,
          layout: 'modern',
          theme: 'purple',
        })
      }
    }
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [specUrl])

  return <div ref={containerRef} style={{ minHeight: '100vh', width: '100%' }} />
}
