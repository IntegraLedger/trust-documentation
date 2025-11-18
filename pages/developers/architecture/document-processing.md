# Document Processing Architecture Plan

## Overview
This document outlines the architecture for a multi-step document processing system with clear separation of concerns using Zustand for state management.

## Core Principles
1. **Separation of Concerns**: Each component should have a single, well-defined responsibility
2. **State Management**: Use Zustand stores to manage state, not component state
3. **Progressive Enhancement**: Users can preview documents without processing them
4. **Step-by-Step Flow**: Clear progression through document handling stages

## System Components

### 1. Document Selection & Preview (Step 1)
**Purpose**: Allow users to select and preview documents without any processing
**Components**:
- `DocumentSelector`: File selection via drag-drop or file picker
- `DocumentPreview`: Display document content (PDF, images, text, etc.)
**State**: 
- `selectedFile: File | null`
- `previewError: string | null`
**No dependencies on**: Processing, workflows, blockchain, or external services

### 2. Document Processing (Step 2)
**Purpose**: Process document to generate hash and metadata
**Components**:
- `DocumentProcessor`: Handles document processing
- `ProcessingStatus`: Shows progress
**State**:
- `processingStatus: 'idle' | 'processing' | 'completed' | 'error'`
- `processedData: { hash: string, metadata: object } | null`
- `processingError: string | null`
**Dependencies**: @integraledger/document-processor-react

### 3. Document Verification (Step 3)
**Purpose**: Check if document exists on blockchain
**Components**:
- `DocumentVerifier`: Checks blockchain for existing registration
- `VerificationResult`: Displays verification status
**State**:
- `verificationStatus: 'idle' | 'checking' | 'found' | 'not-found' | 'error'`
- `verificationData: object | null`
**Dependencies**: Workflow API (document-verification workflow)

### 4. Document Registration (Step 4)
**Purpose**: Register new documents on blockchain
**Components**:
- `DocumentRegistration`: Form for document metadata
- `RegistrationStatus`: Shows registration progress
**State**:
- `registrationStatus: 'idle' | 'registering' | 'completed' | 'error'`
- `registrationData: object | null`
**Dependencies**: Workflow API (register-document workflow)

## Zustand Store Structure

```typescript
// stores/documentStore.ts
interface DocumentStore {
  // Stage 1: File Selection
  file: {
    selected: File | null
    setSelectedFile: (file: File | null) => void
  }
  
  // Stage 2: Processing Results (from document-processor-react)
  processing: {
    status: 'idle' | 'processing' | 'completed' | 'error'
    result: {
      documentHash: {
        sha256: string
        keccak256: string
      }
      documentInfo: {
        fileName: string
        fileSize: number
        mimeType: string
        fileType: 'pdf' | 'image' | 'text' | 'code' | 'unknown'
        isPDF: boolean
        pageCount?: number
        dimensions?: { width: number; height: number }
      }
      enhancedDocument?: Blob  // If QR code or metadata was added
    } | null
    error: string | null
    processFile: (file: File) => Promise<void>
  }
  
  // Stage 3: Preview State
  preview: {
    isReady: boolean
    error: string | null
    currentPage: number  // For PDF pagination
    setCurrentPage: (page: number) => void
    setPreviewError: (error: string | null) => void
  }
  
  // Stage 4: Verification Results
  verification: {
    status: 'idle' | 'checking' | 'not-found' | 'found-db-only' | 'found-blockchain' | 'error'
    databaseRecord: {
      id: string
      status: 'pending' | 'confirmed'
      createdAt: string
      transactionHash?: string
    } | null
    blockchainRecord: {
      transactionHash: string
      blockNumber: number
      timestamp: string
      registrar: string
    } | null
    error: string | null
    checkDocument: (hash: string) => Promise<void>
  }
  
  // Stage 5: Registration (Branch A)
  registration: {
    status: 'idle' | 'submitting' | 'completed' | 'error'
    formData: {
      title: string
      description: string
      tags: string[]
    }
    result: {
      transactionHash: string
      workflowId: string
    } | null
    error: string | null
    updateFormData: (data: Partial<RegistrationFormData>) => void
    submitRegistration: () => Promise<void>
  }
  
  // Global Actions
  resetAll: () => void
  getCurrentStage: () => 'selection' | 'processing' | 'preview' | 'verification' | 'registration' | 'complete'
}
```

## User Flow - Sequential Stages

### Stage 1: Document Selection
- User drops or selects a document
- File object stored in Zustand
- No processing happens yet

### Stage 2: Automatic Processing
- document-processor-react automatically processes the file
- Calculates hashes (SHA-256, Keccak-256, etc.)
- Extracts metadata (file type, size, page count, etc.)
- All results saved to Zustand
- This happens immediately after Stage 1

### Stage 3: Document Preview
- Preview logic reads processed data from Zustand
- Determines preview method based on file type from Stage 2
- Renders appropriate preview (PDF viewer, image display, text viewer, etc.)

### Stage 4: Verification Check
- Database query to check if document hash exists
- If found in DB, run blockchain verification workflow
- Results determine next path

### Stage 5: Branching Logic
Based on Stage 4 results:

**Branch A: Document Not Found**
- Show registration form
- Allow user to add metadata
- Submit to blockchain

**Branch B: Document Found in DB Only**
- Show "pending blockchain confirmation" status
- Display database record details
- Option to retry blockchain verification

**Branch C: Document Fully Verified**
- Show verification success
- Display blockchain transaction details
- Provide certificate download
- Share proof options

## Component Structure

```
DocumentProcessingPage/
├── DocumentSelector
│   └── Reads: file.selected
│   └── Writes: file.setSelectedFile()
│
├── DocumentPreview
│   └── Reads: file.selected
│   └── Writes: file.setPreviewError()
│
├── ProcessingControls
│   └── Reads: file.selected, processing.status
│   └── Writes: processing.startProcessing()
│
├── ProcessingStatus
│   └── Reads: processing.status, processing.error
│
├── VerificationStatus
│   └── Reads: verification.status, verification.data
│
└── RegistrationForm
    └── Reads: registration.formData, registration.status
    └── Writes: registration.updateFormData(), registration.startRegistration()
```

## Error Handling

Each slice maintains its own error state:
- `file.previewError`: File reading/preview errors
- `processing.error`: Document processing errors
- `verification.error`: Blockchain verification errors
- `registration.error`: Registration submission errors

## Benefits of This Approach

1. **Testability**: Each component can be tested in isolation
2. **Reusability**: Preview component can be used anywhere
3. **Progressive Enhancement**: System works even if some services are down
4. **Clear Data Flow**: Unidirectional data flow through Zustand
5. **Debugging**: Easy to trace state changes
6. **Flexibility**: Easy to add new steps or modify flow

## Implementation Priority

1. First: Implement file selection and preview (no external dependencies)
2. Second: Add document processing (requires document-processor library)
3. Third: Add verification (requires workflow API)
4. Fourth: Add registration (requires workflow API)

## Implementation Notes

### Stage Transitions
- **Stage 1 → 2**: Automatic when file is selected
- **Stage 2 → 3**: Automatic when processing completes
- **Stage 3 → 4**: Automatic after preview renders
- **Stage 4 → 5**: Based on verification results

### Key Design Decisions
1. **File Storage**: Store actual File object in Zustand (not serializable, won't persist)
2. **Processing Results**: Store all hash and metadata results for use in preview and verification
3. **Preview Logic**: Use `fileType` from processing results, not MIME type guessing
4. **Verification**: Always check database first, then blockchain only if found in DB
5. **Error Recovery**: Each stage can be retried independently

### Data Flow Example
```
User drops PDF file
↓
Stage 1: file.selected = File object
↓
Stage 2: Automatic processing
  - processing.status = 'processing'
  - document-processor-react runs
  - processing.result = { documentHash, documentInfo }
  - processing.status = 'completed'
↓
Stage 3: Preview renders based on documentInfo.fileType
  - preview.isReady = true
↓
Stage 4: Automatic verification
  - verification.status = 'checking'
  - API call with documentHash.keccak256
  - verification.status = 'found-db-only' | 'not-found' | etc.
↓
Stage 5: UI branches based on verification.status
```

## Questions to Resolve

1. Should we show a loading state between stages or make it seamless?
2. How to handle files that fail processing (corrupted, encrypted, etc.)?
3. Should verification be automatic or require user action?
4. Do we need to store the enhanced document (with QR code) separately?
5. Should we allow skipping verification and going straight to registration?