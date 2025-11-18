import { useState } from 'react';

interface AbiFunction {
  name: string;
  type: string;
  inputs?: Array<{name: string; type: string; internalType?: string}>;
  outputs?: Array<{name: string; type: string; internalType?: string}>;
  stateMutability?: string;
}

interface AbiViewerProps {
  abiUrl: string;
  contractName: string;
}

export default function AbiViewer({ abiUrl, contractName }: AbiViewerProps) {
  return (
    <div style={{
      marginTop: '2rem',
      marginBottom: '2rem',
    }}>
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        backgroundColor: '#f9fafb',
      }}>
        <h3 style={{ marginTop: 0 }}>Download ABI</h3>
        <p>
          <a
            href={abiUrl}
            download
            style={{
              display: 'inline-block',
              padding: '0.5rem 1rem',
              backgroundColor: '#0041B1',
              color: 'white',
              borderRadius: '0.375rem',
              textDecoration: 'none',
              fontWeight: '500',
            }}
          >
            Download {contractName} ABI
          </a>
        </p>
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Use this ABI file to interact with the {contractName} contract from your application.
        </p>
      </div>

      <div style={{
        marginTop: '2rem',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        overflow: 'hidden',
      }}>
        <details style={{ padding: '1rem' }}>
          <summary style={{
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '1.125rem',
            userSelect: 'none',
          }}>
            View Full ABI JSON
          </summary>
          <pre style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#1e293b',
            color: '#e2e8f0',
            borderRadius: '0.375rem',
            overflow: 'auto',
            fontSize: '0.875rem',
          }}>
            <code>
              {`View the full ABI at: ${abiUrl}`}
            </code>
          </pre>
        </details>
      </div>
    </div>
  );
}
