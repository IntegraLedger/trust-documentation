# Debugging Multi-Service Flows with Sentry Performance Monitoring

## Real-World Scenario

**User Action**: User uploads a document to create an AAA arbitration case
**Expected Result**: Document registered on blockchain with case ID returned
**Actual Result**: User sees "Processing..." spinner forever, no case created
**Problem**: Request flows through 10 services - where did it fail?

## Request Flow Through IntegraLedger

```
User clicks "Upload Document"
  ↓
1. React App (CF Worker - Frontend)
  ↓
2. Trust Platform API (/api/documents/upload)
  ↓
3. Auth Worker (verify user token)
  ↓
4. Document Service (process PDF)
  ↓
5. Data Service (extract metadata)
  ↓
6. AAA Service (create arbitration case)
  ↓
7. Blockchain Indexer (prepare transaction)
  ↓
8. Smart Contract Service (call contract)
  ↓
9. Base Sepolia Testnet (blockchain tx)
  ↓
10. Blockchain Indexer (confirm + index)
  ↓
RESULT: Case ID + blockchain hash
```

**Question**: Which of these 10 steps failed?

## How Sentry Performance Monitoring Solves This

### Step 1: Instrument the Frontend (Already Done)

```typescript
// src/main.tsx
Sentry.init({
  dsn: "https://87466769912cecda927f6a4cfe7e2db1@o4510366831345664.ingest.us.sentry.io/4510366921981952",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 0.1, // 10% of all requests
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0, // 100% when errors occur
});
```

**What this does**:
- Creates a unique **trace ID** for every user action
- Starts a **transaction** representing the entire operation
- Tracks **spans** for each step within the operation
- Captures **user context** (who, when, where)

### Step 2: Propagate Trace ID to Backend

```typescript
// src/services/apiService.ts - Example instrumented call
import * as Sentry from "@sentry/react";

export async function uploadDocument(file: File, metadata: DocumentMetadata) {
  // Start a Sentry transaction
  const transaction = Sentry.startTransaction({
    name: "uploadDocument",
    op: "http.client.request",
    data: {
      fileSize: file.size,
      fileName: file.name,
      caseType: metadata.caseType,
    },
  });

  // Sentry automatically injects these headers into fetch requests:
  // - sentry-trace: {trace-id}-{span-id}-{sampled}
  // - baggage: sentry-trace_id=xxx,sentry-environment=production

  const uploadSpan = transaction.startChild({
    op: "http.client.post",
    description: "POST /api/documents/upload",
  });

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
      // Sentry SDK automatically adds trace headers here
    });

    uploadSpan.setStatus('ok');

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();

    const processingSpan = transaction.startChild({
      op: "processing",
      description: "Wait for blockchain confirmation",
    });

    // Poll for completion
    const caseId = await pollForCompletion(result.requestId);
    processingSpan.finish();

    transaction.setStatus('ok');
    transaction.setData('caseId', caseId);

    return caseId;

  } catch (error) {
    uploadSpan.setStatus('unknown_error');
    transaction.setStatus('unknown_error');

    Sentry.captureException(error, {
      contexts: {
        document: {
          fileName: file.name,
          fileSize: file.size,
          caseType: metadata.caseType,
        },
      },
    });

    throw error;
  } finally {
    uploadSpan.finish();
    transaction.finish();
  }
}
```

**Critical part**: The `sentry-trace` header is automatically included in the fetch request. This header contains:
```
sentry-trace: 7d4c9b5e8f1a2b3c4d5e6f7a8b9c0d1e-3a4b5c6d7e8f9a0b-1
                └── trace ID ──────────────────┘ └── span ID ──┘ └sampled
```

### Step 3: Backend Services Continue the Trace

#### Option A: Node.js Backend (Recommended)

```typescript
// services/integra-auth-worker/src/index.ts
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.ENVIRONMENT || 'development',
  integrations: [
    // Automatic instrumentation
    Sentry.httpIntegration(),
    Sentry.expressIntegration(),
    Sentry.prismaIntegration(),
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
});

// Express middleware - automatically continues traces
import express from 'express';
const app = express();

// This must be FIRST
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Your routes
app.post('/verify-token', async (req, res) => {
  // Sentry automatically extracts sentry-trace header
  // and continues the existing trace

  const span = Sentry.getCurrentScope().getSpan();

  const dbSpan = span?.startChild({
    op: 'db.query',
    description: 'SELECT user FROM tokens',
  });

  try {
    const user = await db.users.findByToken(req.body.token);
    dbSpan?.setStatus('ok');

    // Call next service
    const docSpan = span?.startChild({
      op: 'http.client',
      description: 'POST document-service/process',
    });

    const result = await fetch('http://document-service/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Sentry SDK automatically adds sentry-trace header
      },
      body: JSON.stringify({ userId: user.id, document: req.body.document }),
    });

    docSpan?.finish();

    res.json({ success: true, user });
  } catch (error) {
    dbSpan?.setStatus('unknown_error');
    Sentry.captureException(error);
    res.status(500).json({ error: 'Verification failed' });
  } finally {
    dbSpan?.finish();
  }
});

// Error handler - must be LAST
app.use(Sentry.Handlers.errorHandler());
```

#### Option B: Python Backend

```python
# services/integra-data-service/app.py
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

sentry_sdk.init(
    dsn=os.environ.get("SENTRY_DSN"),
    environment=os.environ.get("ENVIRONMENT", "development"),
    integrations=[
        FlaskIntegration(),
    ],
    traces_sample_rate=0.1,
)

from flask import Flask, request
app = Flask(__name__)

@app.route('/extract-metadata', methods=['POST'])
def extract_metadata():
    # Sentry automatically continues the trace from sentry-trace header

    with sentry_sdk.start_span(op="file.read", description="Read PDF") as span:
        file_data = request.files['document'].read()
        span.set_data("file_size", len(file_data))

    with sentry_sdk.start_span(op="ai.extract", description="Extract metadata with AI") as span:
        metadata = extract_with_ai(file_data)
        span.set_data("fields_extracted", len(metadata))

    # Call next service
    with sentry_sdk.start_span(op="http.client", description="POST aaa-service/create-case") as span:
        response = requests.post(
            "http://aaa-service/create-case",
            json=metadata,
            # Sentry SDK automatically propagates trace headers
        )
        span.set_http_status(response.status_code)

    return jsonify({"success": True, "metadata": metadata})
```

### Step 4: Track Blockchain Interaction

```typescript
// services/integra-blockchain-indexer/src/blockchain.ts
import * as Sentry from "@sentry/node";
import { ethers } from "ethers";

export async function registerDocument(
  documentHash: string,
  caseId: string
): Promise<string> {
  const transaction = Sentry.getCurrentScope().getTransaction();

  const prepareSpan = transaction?.startChild({
    op: 'blockchain.prepare',
    description: 'Prepare transaction data',
  });

  const txData = await contract.interface.encodeFunctionData('registerDocument', [
    documentHash,
    caseId,
  ]);

  prepareSpan?.setData('documentHash', documentHash);
  prepareSpan?.setData('caseId', caseId);
  prepareSpan?.finish();

  // Send to blockchain
  const sendSpan = transaction?.startChild({
    op: 'blockchain.send',
    description: 'Submit transaction to Base Sepolia',
  });

  try {
    const tx = await wallet.sendTransaction({
      to: contractAddress,
      data: txData,
      gasLimit: 500000,
    });

    sendSpan?.setData('txHash', tx.hash);
    sendSpan?.setData('gasLimit', 500000);
    sendSpan?.setStatus('ok');

    // Wait for confirmation
    const confirmSpan = transaction?.startChild({
      op: 'blockchain.wait',
      description: 'Wait for transaction confirmation',
    });

    const receipt = await tx.wait(2); // Wait for 2 confirmations

    confirmSpan?.setData('blockNumber', receipt.blockNumber);
    confirmSpan?.setData('gasUsed', receipt.gasUsed.toString());
    confirmSpan?.setData('confirmations', 2);
    confirmSpan?.finish();

    return tx.hash;

  } catch (error) {
    sendSpan?.setStatus('unknown_error');

    // Capture blockchain-specific error context
    Sentry.captureException(error, {
      contexts: {
        blockchain: {
          network: 'base-sepolia',
          contractAddress,
          documentHash,
          caseId,
        },
      },
    });

    throw error;
  } finally {
    sendSpan?.finish();
  }
}
```

## What You See in Sentry Dashboard

### 1. Performance Tab → Transactions

When you open Sentry and go to **Performance** → **Transactions**, you see:

```
┌──────────────────────────────────────────────────────────────────┐
│ Transactions                                                      │
├──────────────────────────────────────────────────────────────────┤
│ Transaction Name        │ p50  │ p95  │ Failure Rate │ Throughput│
├─────────────────────────┼──────┼──────┼──────────────┼───────────┤
│ uploadDocument          │ 2.4s │ 8.1s │ 3.2%         │ 45/min    │
│ POST /api/documents     │ 1.8s │ 5.2s │ 0.5%         │ 120/min   │
│ verifyToken            │ 120ms│ 450ms│ 0.1%         │ 300/min   │
│ extractMetadata        │ 3.1s │ 9.8s │ 1.2%         │ 40/min    │
│ createCase             │ 450ms│ 1.2s │ 0.8%         │ 45/min    │
│ registerOnBlockchain   │ 5.2s │ 12s  │ 5.4% ⚠️      │ 40/min    │
└─────────────────────────┴──────┴──────┴──────────────┴───────────┘
```

**You immediately see**: `registerOnBlockchain` has a 5.4% failure rate! 🚨

### 2. Click into the Problem Transaction

Click on `registerOnBlockchain` → See all recent traces:

```
┌────────────────────────────────────────────────────────────────────┐
│ registerOnBlockchain - Recent Traces                               │
├────────────────────────────────────────────────────────────────────┤
│ Trace ID             │ Duration │ Status │ User              │ Time│
├──────────────────────┼──────────┼────────┼───────────────────┼─────┤
│ 7d4c9b5e8f1a2b3c... │ 8.2s     │ ✓ OK   │ user@example.com  │ 2m  │
│ 1a2b3c4d5e6f7a8b... │ 12.1s    │ ✓ OK   │ admin@integra.com │ 5m  │
│ 9f8e7d6c5b4a3210... │ --       │ ✗ ERROR│ demo@test.com     │ 8m  │ ← THIS ONE!
│ 3c4d5e6f7a8b9c0d... │ 5.8s     │ ✓ OK   │ user2@example.com │ 12m │
└──────────────────────┴──────────┴────────┴───────────────────┴─────┘
```

### 3. Click on the Failed Trace → See the Waterfall

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Trace: 9f8e7d6c5b4a3210 - uploadDocument                                    │
│ User: demo@test.com | Browser: Chrome 120 | Started: 2025-11-15 21:34:12   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ uploadDocument                                    [████████████████] 30.2s  │
│   ├─ POST /api/documents/upload                  [██]              1.2s    │
│   │   └─ auth-worker: verifyToken                [█]               120ms   │
│   │       └─ db.query: SELECT user               [▌]               45ms    │
│   │                                                                          │
│   ├─ document-service: processDocument           [████]            3.1s    │
│   │   ├─ file.read: Read PDF                     [█]               850ms   │
│   │   └─ file.validate: Check PDF structure      [█]               420ms   │
│   │                                                                          │
│   ├─ data-service: extractMetadata               [████]            3.8s    │
│   │   ├─ ai.extract: GPT-4 extraction            [███]             3.2s    │
│   │   └─ validation: Validate fields             [▌]               280ms   │
│   │                                                                          │
│   ├─ aaa-service: createCase                     [█]               650ms   │
│   │   ├─ db.insert: Create case record           [▌]               220ms   │
│   │   └─ http.client: POST blockchain-indexer    [▌]               180ms   │
│   │                                                                          │
│   └─ blockchain-indexer: registerDocument        [█████████████] 21.1s ⚠️  │
│       ├─ blockchain.prepare: Prepare tx data     [▌]               120ms   │
│       ├─ blockchain.send: Submit to Base Sepolia [█]               890ms   │
│       └─ blockchain.wait: Wait for confirmation  [████████████] 20.0s ❌   │
│           └─ ERROR: Transaction timeout after 30s                           │
│                                                                              │
│ Error Details:                                                               │
│   Type: TransactionTimeoutError                                              │
│   Message: Transaction 0x7a8b9c... not confirmed after 30 seconds           │
│   Location: blockchain-indexer/src/blockchain.ts:87                          │
│                                                                              │
│ Blockchain Context:                                                          │
│   Network: base-sepolia                                                      │
│   Contract: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5                      │
│   TX Hash: 0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b          │
│   Gas Limit: 500000                                                          │
│   Document Hash: QmX4Fc7...                                                  │
│   Case ID: AAA-2025-0142                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Debugging insights from this single view:**

1. ✅ **Frontend worked fine** (1.2s)
2. ✅ **Auth worked fine** (120ms)
3. ✅ **Document processing worked fine** (3.1s)
4. ✅ **Metadata extraction worked fine** (3.8s)
5. ✅ **AAA case creation worked fine** (650ms)
6. ✅ **Transaction was submitted to blockchain** (890ms)
7. ❌ **Problem: Blockchain confirmation timeout** (20s, then failed)

**Root cause identified**: The blockchain transaction was submitted successfully but never confirmed. You can:
- Check the transaction on [BaseScan](https://sepolia.basescan.org)
- See if it's still pending
- Check if gas price was too low
- Verify RPC endpoint is working

### 4. Session Replay (If Error Occurred)

Click **"View Replay"** button → Watch exactly what the user saw:

```
┌────────────────────────────────────────────────────────────┐
│ Session Replay - demo@test.com                             │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  00:00 - User navigates to /documents                      │
│  00:05 - User clicks "Upload Document"                     │
│  00:08 - User selects file "arbitration-case-142.pdf"      │
│  00:12 - User fills out case details form                  │
│  00:18 - User clicks "Submit"                              │
│  00:19 - UI shows "Processing..." spinner                  │
│  00:20 - ... still processing ...                          │
│  00:25 - ... still processing ...                          │
│  00:30 - ... still processing ...                          │
│  00:35 - ... still processing ...                          │
│  00:48 - ERROR TOAST: "Blockchain confirmation timeout"    │
│                                                             │
│  [Video playback shows frustrated user clicking refresh]   │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## Real Debugging Workflow

### Scenario: "My document upload isn't working"

**User report**: "I uploaded a document 10 minutes ago and it's still processing"

#### Step 1: Find the User's Transaction

1. Go to Sentry → **Performance**
2. Click **"Search"** → Add filter:
   - `user.email:demo@test.com`
   - `transaction:uploadDocument`
   - `timestamp:-15m` (last 15 minutes)

```
Results: 1 trace found
Trace ID: 9f8e7d6c5b4a3210
Status: ERROR
Duration: 30.2s
```

#### Step 2: Open the Trace Waterfall

Click on the trace → See the full waterfall (shown above)

**Immediate insights:**
- ✅ First 9 services worked perfectly (total: 9.8s)
- ❌ Last service (blockchain) timed out (20s)
- Error occurred at `blockchain.wait` span
- Transaction hash: `0x7a8b9c0d1e2f...`

#### Step 3: Investigate the Root Cause

**Option A: Check Blockchain Explorer**
1. Copy transaction hash from Sentry context
2. Open BaseScan: `https://sepolia.basescan.org/tx/0x7a8b9c0d1e2f...`
3. See transaction status:
   - ✓ Transaction found
   - ⚠️ Status: Pending (20 minutes)
   - ⚠️ Gas price: 1 gwei (too low!)
   - ✓ From/To addresses correct

**Root cause**: Gas price too low during network congestion

**Option B: Check Related Errors**

In Sentry, click **"Issues"** tab on same trace:
```
Related Issues:
1. TransactionTimeoutError (12 occurrences in last hour)
   ├─ Same root cause: blockchain.wait timeout
   ├─ All transactions: base-sepolia network
   └─ Pattern: Started 1 hour ago (RPC issue?)

2. NetworkError: Connection timeout (3 occurrences)
   ├─ Service: blockchain-indexer
   └─ Related to issue #1
```

**This shows**: Multiple users affected, not just one user!

#### Step 4: Check Service Health

Go to **Performance** → **Service Health**:

```
┌──────────────────────────────────────────────────────┐
│ Service Health - Last Hour                           │
├──────────────────────────────────────────────────────┤
│ Service                │ Apdex │ Error Rate │ p95   │
├────────────────────────┼───────┼────────────┼───────┤
│ trust-platform         │ 0.98  │ 0.2%       │ 1.2s  │
│ auth-worker            │ 0.99  │ 0.1%       │ 450ms │
│ document-service       │ 0.97  │ 0.5%       │ 4.1s  │
│ data-service           │ 0.96  │ 1.2%       │ 5.2s  │
│ aaa-service            │ 0.98  │ 0.8%       │ 1.1s  │
│ blockchain-indexer     │ 0.72⚠️│ 12.4%⚠️    │ 28s⚠️ │
└────────────────────────┴───────┴────────────┴───────┘
```

**Blockchain-indexer is degraded!** 12.4% error rate vs 0.1-1.2% for other services.

#### Step 5: Check Alerts

Sentry → **Alerts** shows:

```
🚨 CRITICAL: blockchain-indexer error rate > 10%
   Triggered: 47 minutes ago
   Status: ONGOING
   Affected: 24 users

   Recent errors:
   - TransactionTimeoutError (18 occurrences)
   - RPC Connection Failed (6 occurrences)
```

#### Step 6: Correlate with Infrastructure

**Option A**: Check metrics (if Prometheus integrated):
```
blockchain_rpc_response_time: 8.2s (normal: 200ms)
blockchain_rpc_errors: 18/min (normal: 0/min)
```

**Option B**: Check Base Sepolia status page:
```
https://status.base.org
⚠️ DEGRADED: RPC endpoints experiencing high latency
```

### Resolution Path

**From Sentry trace, you know**:
1. ✅ Problem is isolated to blockchain-indexer service
2. ✅ Specific operation: `blockchain.wait` (waiting for confirmations)
3. ✅ Root cause: Base Sepolia RPC latency
4. ✅ Transaction submitted successfully but not confirmed
5. ✅ Affected 24 users in last hour

**Actions**:
1. **Immediate**: Switch to backup RPC endpoint
2. **Short-term**: Increase gas price during congestion
3. **Long-term**: Implement RPC fallback logic

**Code fix** (based on Sentry insights):

```typescript
// services/integra-blockchain-indexer/src/blockchain.ts
const RPC_ENDPOINTS = [
  process.env.BASE_SEPOLIA_RPC_PRIMARY,
  process.env.BASE_SEPOLIA_RPC_BACKUP_1,
  process.env.BASE_SEPOLIA_RPC_BACKUP_2,
];

async function getHealthyProvider(): Promise<ethers.Provider> {
  const span = Sentry.getCurrentScope().getSpan();

  for (const endpoint of RPC_ENDPOINTS) {
    const healthSpan = span?.startChild({
      op: 'rpc.health_check',
      description: `Check ${endpoint}`,
    });

    try {
      const provider = new ethers.JsonRpcProvider(endpoint);
      const blockNumber = await provider.getBlockNumber();

      healthSpan?.setData('blockNumber', blockNumber);
      healthSpan?.setData('endpoint', endpoint);
      healthSpan?.setStatus('ok');
      healthSpan?.finish();

      return provider; // Found healthy endpoint
    } catch (error) {
      healthSpan?.setStatus('unavailable');
      healthSpan?.finish();

      Sentry.captureMessage(`RPC endpoint ${endpoint} unhealthy`, {
        level: 'warning',
        contexts: {
          rpc: { endpoint, error: error.message },
        },
      });

      continue; // Try next endpoint
    }
  }

  throw new Error('All RPC endpoints unavailable');
}
```

## Benefits of This Approach

### 1. Single Pane of Glass
- One dashboard shows entire request flow
- No switching between 10 different service logs
- User context preserved across all services

### 2. Automatic Problem Detection
- Sentry alerts when error rate spikes
- Identifies slow transactions automatically
- Shows which service is the bottleneck

### 3. Historical Comparison
```
Sentry shows:
"registerOnBlockchain p95 latency increased 600%"
"Before: 2.0s → Now: 12.0s"
"Started: 47 minutes ago"
```

### 4. User Impact Analysis
```
Affected Users: 24
Affected Transactions: 42
Geographic Distribution:
  - US East: 15 users
  - Europe: 7 users
  - Asia: 2 users

Browser Distribution:
  - Chrome: 18
  - Safari: 4
  - Firefox: 2
```

### 5. Quick Resolution
- **Before Sentry**: Hours of log diving across services
- **With Sentry**: 5 minutes to identify root cause

## Advanced Features

### 1. Custom Instrumentation

Track business-critical operations:

```typescript
// Track document processing quality
const qualitySpan = transaction.startChild({
  op: 'quality.check',
  description: 'Document quality validation',
});

const qualityScore = calculateQuality(document);
qualitySpan.setData('qualityScore', qualityScore);
qualitySpan.setTag('passed', qualityScore > 0.8);

if (qualityScore < 0.5) {
  Sentry.captureMessage('Low quality document detected', {
    level: 'warning',
    contexts: {
      document: {
        fileName: document.name,
        qualityScore,
        issues: identifyIssues(document),
      },
    },
  });
}

qualitySpan.finish();
```

### 2. Business Metrics

Track revenue-impacting events:

```typescript
// Track successful case creation
Sentry.metrics.increment('cases.created', {
  tags: {
    caseType: metadata.caseType,
    hasBlockchain: true,
  },
});

Sentry.metrics.distribution('case.creation.duration', duration, {
  unit: 'millisecond',
  tags: { caseType: metadata.caseType },
});

// Track failures
if (error) {
  Sentry.metrics.increment('cases.failed', {
    tags: {
      errorType: error.name,
      step: 'blockchain',
    },
  });
}
```

### 3. Alerts Configuration

Set up proactive alerts:

```yaml
# Sentry Alert Rules
alerts:
  - name: "Blockchain indexer degraded"
    conditions:
      - service: blockchain-indexer
      - error_rate: > 5%
      - window: 10 minutes
    actions:
      - slack: #engineering-alerts
      - pagerduty: blockchain-oncall

  - name: "Case creation failures"
    conditions:
      - transaction: uploadDocument
      - failure_rate: > 10%
      - affected_users: > 5
    actions:
      - slack: #product-alerts
      - email: product-team@integra.com
```

## Summary: Your Debugging Superpower

**Before Sentry Performance Monitoring:**
```
User: "My upload failed"
You: "Let me check..."
  → SSH into 10 different servers
  → tail -f 10 different log files
  → Search for user email across logs
  → Try to correlate timestamps
  → Still not sure which service failed
  → 2 hours later: "Maybe it's the blockchain?"
```

**With Sentry Performance Monitoring:**
```
User: "My upload failed"
You: *Opens Sentry, searches user email*
  → Sees trace waterfall in 10 seconds
  → "blockchain.wait timeout at Base Sepolia RPC"
  → Checks BaseScan: "Gas price too low"
  → Switches to backup RPC with higher gas
  → Problem solved in 5 minutes
```

**That's the power of distributed tracing!** 🚀

---

**Next Steps:**
1. ✅ Frontend instrumentation (already done)
2. ⏭️ Add Sentry to backend services
3. ⏭️ Configure alerts
4. ⏭️ Build custom dashboards
