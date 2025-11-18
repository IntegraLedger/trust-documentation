# Process Hash: Blockchain-Application Integration

## Overview

The **processHash** field is Integra's universal correlation mechanism that links on-chain smart contract events with off-chain application workflows. This simple yet powerful pattern enables seamless integration between blockchain transactions and traditional software systems.

### The Problem It Solves

When integrating blockchain with existing applications, you need to answer:

**"Which workflow triggered this blockchain transaction?"**
**"Which blockchain events belong to workflow #12345?"**

Without `processHash`, you'd need to:
- ❌ Parse transaction data and guess
- ❌ Maintain separate correlation databases
- ❌ Use timestamps (unreliable)
- ❌ Complex event matching logic

With `processHash`:
- ✅ Direct correlation via event emission
- ✅ Query all blockchain events for a workflow
- ✅ Link off-chain records to on-chain proof
- ✅ Simple, universal pattern

## How It Works

### The Pattern

Every Integra contract function accepts an optional `processHash` parameter:

```solidity
function registerDocument(
    bytes32 documentHash,
    bytes32 referenceHash,
    address tokenizer,
    address executor,
    bytes32 processHash,  // ← Correlation identifier
    ...
) external returns (bytes32 integraHash)
```

**What happens:**
1. Smart contract executes the operation
2. Emits event with `processHash` included
3. Off-chain system listens for events
4. Matches events to workflow using `processHash`

### Event Emission

Every event includes `processHash`:

```solidity
event DocumentRegistered(
    bytes32 indexed integraHash,
    address indexed owner,
    bytes32 documentHash,
    address tokenizer,
    bytes32 processHash,  // ← Enables correlation
    uint256 timestamp
);

event TokenClaimed(
    bytes32 indexed integraHash,
    uint256 indexed tokenId,
    address indexed claimant,
    bytes32 processHash,  // ← Same pattern everywhere
    uint256 timestamp
);
```

## Real-World Integration Examples

### Example 1: Property Management System

**Scenario:** Property management SaaS integrating with Integra smart contracts.

**Off-chain workflow:**
```javascript
// User creates rental listing in web app
const listing = await db.createListing({
  propertyId: "prop-123",
  address: "123 Main St",
  rent: 2000,
  tenantId: "tenant-456"
});

// Generate processHash from workflow ID
const processHash = ethers.keccak256(
  ethers.toUtf8Bytes(`rental-workflow-${listing.id}`)
);

// Store for correlation
await db.updateListing(listing.id, { processHash });
```

**Blockchain transaction:**
```javascript
// Register rental on blockchain
const tx = await documentRegistry.registerDocument(
  leaseHash,
  ipfsCID,
  rentalTokenizer,
  executor,
  processHash,  // ← Links to listing.id
  bytes32(0),
  contactResolverId,
  []
);

await tx.wait();
```

**Event listener (correlates back to application):**
```javascript
documentRegistry.on("DocumentRegistered", async (
  integraHash,
  owner,
  documentHash,
  tokenizer,
  processHash,  // ← Received in event
  timestamp
) => {
  // Find workflow in database
  const listing = await db.findByProcessHash(processHash);

  // Update with blockchain proof
  await db.updateListing(listing.id, {
    integraHash: integraHash,
    blockchainTimestamp: timestamp,
    status: 'registered'
  });

  // Notify user
  await sendEmail(listing.tenantId, "Lease registered on blockchain");
});
```

### Example 2: Enterprise Document Management

**Scenario:** Corporate document system with approval workflows.

**Workflow process:**
```javascript
// Step 1: Document created in DocuSign
const docId = "contract-789";
const workflowId = "approval-workflow-2024-001";

// Step 2: Approval process (3 signers)
await approvalSystem.requestSignatures(docId, [ceo, cfo, legal]);

// Step 3: All signatures collected → trigger blockchain registration
const processHash = ethers.keccak256(
  ethers.toUtf8Bytes(workflowId)
);

// Register on blockchain with workflow correlation
await documentRegistry.registerDocument(
  keccak256(finalDocument),
  ipfsCID,
  ownershipTokenizer,
  executor,
  processHash,  // ← Links to approval workflow
  ...
);
```

**Audit trail:**
```javascript
// Query all blockchain events for this workflow
const events = await queryEventsByProcessHash(processHash);

// Results:
[
  {
    event: "DocumentRegistered",
    processHash: "0xabc...",
    timestamp: 1700000000,
    integraHash: "0xdef..."
  },
  {
    event: "TokenReserved",
    processHash: "0xabc...",  // Same workflow
    timestamp: 1700000100,
    recipient: "0x123..."
  },
  {
    event: "TokenClaimed",
    processHash: "0xabc...",  // Same workflow
    timestamp: 1700000200,
    claimant: "0x123..."
  }
]

// Can reconstruct entire workflow from blockchain events
```

### Example 3: E-Commerce Integration

**Scenario:** Online marketplace selling tokenized items.

**Purchase flow:**
```javascript
// User checks out shopping cart
const order = await createOrder({
  userId: "user-123",
  items: [{ tokenizerId: "ownership", documentId: "item-456" }],
  total: 1.5  // ETH
});

const processHash = ethers.keccak256(
  ethers.toUtf8Bytes(`order-${order.id}`)
);

// Reserve token for buyer
await tokenizer.reserveToken(
  integraHash,
  tokenId,
  buyerAddress,
  1,
  processHash  // ← Links to order.id
);

// Create claim attestation
await eas.attest({
  schema: claimSchema,
  data: {
    recipient: buyerAddress,
    data: abi.encode(integraHash, tokenId, CLAIM_CAPABILITY),
    ...
  }
});

// Listen for claim
tokenizer.on("TokenClaimed", async (
  integraHash,
  tokenId,
  claimant,
  processHash,
  timestamp
) => {
  // Match to order
  const order = await findOrderByProcessHash(processHash);

  // Update order status
  await updateOrder(order.id, {
    status: 'fulfilled',
    claimedAt: timestamp,
    txHash: event.transactionHash
  });

  // Send confirmation email
  await sendOrderConfirmation(order.userId, integraHash, tokenId);
});
```

## Querying by ProcessHash

### Pattern: Find All Events for Workflow

```javascript
// Using ethers.js
const filter = documentRegistry.filters.DocumentRegistered(
  null,  // integraHash (any)
  null,  // owner (any)
  null,  // documentHash (any)
  null,  // tokenizer (any)
  processHash,  // ← Filter by workflow
  null   // timestamp (any)
);

const events = await documentRegistry.queryFilter(filter);

// Returns all DocumentRegistered events for this workflow
events.forEach(event => {
  console.log(`Document: ${event.args.integraHash}`);
  console.log(`Owner: ${event.args.owner}`);
  console.log(`Time: ${event.args.timestamp}`);
});
```

### Pattern: Multi-Contract Workflow Tracking

```javascript
// Track workflow across multiple contract interactions
const processHash = ethers.keccak256(
  ethers.toUtf8Bytes("multi-step-workflow-001")
);

// Step 1: Register document
await documentRegistry.registerDocument(..., processHash, ...);

// Step 2: Reserve tokens
await tokenizer.reserveToken(..., processHash);

// Step 3: Create attestations
await eas.attest(...);

// Step 4: Claim tokens
await tokenizer.claimToken(..., processHash);

// Step 5: Send payment signal
await integraSignal.sendPaymentRequest(..., processHash, ...);

// Query all events for entire workflow
const allEvents = await getAllEventsForProcess(processHash);
// Returns events from ALL contracts with this processHash
```

## Integration Patterns

### Pattern 1: Simple Correlation

**Use case:** Basic workflow tracking

```javascript
// Backend workflow
const workflowId = uuid();  // "550e8400-e29b-41d4-a716-446655440000"

const processHash = ethers.keccak256(
  ethers.toUtf8Bytes(`workflow-${workflowId}`)
);

// Store in database
await db.workflows.create({
  id: workflowId,
  processHash: processHash,
  status: 'pending'
});

// Execute blockchain transaction
await contract.someFunction(..., processHash);

// Listen for completion
contract.on("OperationComplete", async (integraHash, processHash) => {
  // Update workflow status
  await db.workflows.update(
    { processHash },
    { status: 'completed', integraHash }
  );
});
```

### Pattern 2: Multi-Step Process Correlation

**Use case:** Complex multi-transaction workflows

```javascript
class PropertySaleWorkflow {
  constructor(saleId) {
    // Single processHash for entire sale process
    this.processHash = ethers.keccak256(
      ethers.toUtf8Bytes(`property-sale-${saleId}`)
    );
    this.saleId = saleId;
  }

  async step1_RegisterDocument() {
    const tx = await documentRegistry.registerDocument(
      ...,
      this.processHash  // ← Same hash
    );
    await this.recordStep("document_registered", tx.hash);
  }

  async step2_ReserveToken() {
    const tx = await tokenizer.reserveToken(
      ...,
      this.processHash  // ← Same hash
    );
    await this.recordStep("token_reserved", tx.hash);
  }

  async step3_CreateAttestation() {
    const tx = await eas.attest(...);
    await this.recordStep("attestation_created", tx.hash);
  }

  async step4_ClaimToken() {
    const tx = await tokenizer.claimToken(
      ...,
      this.processHash  // ← Same hash
    );
    await this.recordStep("token_claimed", tx.hash);
  }

  async recordStep(step, txHash) {
    await db.workflowSteps.create({
      saleId: this.saleId,
      processHash: this.processHash,
      step: step,
      txHash: txHash,
      timestamp: Date.now()
    });
  }

  async getAuditTrail() {
    // Get all blockchain events for this sale
    return await queryAllEventsForProcessHash(this.processHash);
  }
}
```

### Pattern 3: Batch Operation Tracking

**Use case:** Bulk operations with workflow correlation

```javascript
// Process 100 documents in batch
const batchId = "batch-2024-11-18-001";
const processHash = ethers.keccak256(
  ethers.toUtf8Bytes(`batch-${batchId}`)
);

// Single batch transaction
await documentRegistry.registerDocumentBatch(
  integraHashes,  // 100 documents
  documentHashes,
  identityExtensions,
  tokenizers,
  primaryResolverIds,
  executor,
  Array(100).fill(processHash),  // ← Same processHash for all
  true
);

// Later: Query all registrations from this batch
const batchEvents = await documentRegistry.queryFilter(
  documentRegistry.filters.DocumentRegistered(
    null, null, null, null, processHash
  )
);

console.log(`Batch ${batchId}: ${batchEvents.length} documents registered`);
```

## Benefits for Different Systems

### CRM Systems (Salesforce, HubSpot)

```javascript
// Link opportunity to blockchain transaction
const opportunity = await salesforce.getOpportunity(oppId);

const processHash = ethers.keccak256(
  ethers.toUtf8Bytes(`salesforce-opp-${oppId}`)
);

await documentRegistry.registerDocument(..., processHash, ...);

// Update opportunity with blockchain proof
await salesforce.updateOpportunity(oppId, {
  blockchainRegistered: true,
  integraHash: result.integraHash,
  processHash: processHash
});
```

### ERP Systems (SAP, Oracle)

```javascript
// Link purchase order to blockchain asset
const purchaseOrder = await erp.getPurchaseOrder(poNumber);

const processHash = ethers.keccak256(
  ethers.toUtf8Bytes(`po-${poNumber}`)
);

// Register asset on blockchain
await documentRegistry.registerDocument(..., processHash, ...);

// Update ERP with blockchain reference
await erp.updatePO(poNumber, {
  blockchainAssetId: integraHash,
  blockchainProof: txHash
});
```

### Workflow Engines (Camunda, Temporal)

```javascript
// Temporal workflow
async function propertyTransferWorkflow(workflowId) {
  const processHash = ethers.keccak256(
    ethers.toUtf8Bytes(`temporal-${workflowId}`)
  );

  // Step 1: Title search
  await activities.performTitleSearch();

  // Step 2: Register on blockchain
  const integraHash = await activities.registerOnBlockchain(processHash);

  // Step 3: Escrow
  await activities.setupEscrow(integraHash);

  // Step 4: Token transfer
  await activities.transferToken(integraHash, processHash);

  // Step 5: Close escrow
  await activities.closeEscrow(processHash);

  // All blockchain events correlated via processHash
  return await activities.getBlockchainAuditTrail(processHash);
}
```

### Document Management Systems (SharePoint, Box)

```javascript
// Link SharePoint document to blockchain
const document = await sharepoint.getDocument(docId);

const processHash = ethers.keccak256(
  ethers.toUtf8Bytes(`sharepoint-${docId}`)
);

// Register on blockchain
const result = await documentRegistry.registerDocument(
  keccak256(document.content),
  ipfsCID,
  tokenizer,
  executor,
  processHash,  // ← Links to SharePoint docId
  ...
);

// Update SharePoint metadata
await sharepoint.updateDocumentMetadata(docId, {
  blockchainHash: result.integraHash,
  blockchainProof: result.txHash,
  processHash: processHash
});

// Now can query blockchain for this document
// Using processHash or integraHash
```

## Advanced Patterns

### Pattern 1: Hierarchical Process IDs

```javascript
// Parent process
const parentProcessHash = keccak256("project-2024-001");

// Child processes (sub-workflows)
const step1Hash = keccak256(`${parentProcessHash}-step1`);
const step2Hash = keccak256(`${parentProcessHash}-step2`);
const step3Hash = keccak256(`${parentProcessHash}-step3`);

// Execute steps
await contract.operation1(..., step1Hash);
await contract.operation2(..., step2Hash);
await contract.operation3(..., step3Hash);

// Query all events for parent process
const allEvents = await queryEventsByProcessPrefix(parentProcessHash);
// Returns events from all child processes
```

### Pattern 2: Process Hash with Metadata

```javascript
// Encode metadata into processHash
const processMetadata = {
  workflowType: "property-sale",
  workflowId: "sale-123",
  initiator: "user-456",
  timestamp: Date.now()
};

const processHash = ethers.keccak256(
  ethers.toUtf8Bytes(JSON.stringify(processMetadata))
);

// Anyone with processHash can decode metadata
const decoded = JSON.parse(
  ethers.toUtf8String(
    ethers.getBytes(processHash)
  )
);
// But on-chain it's just a hash (privacy preserved)
```

### Pattern 3: Multi-Chain Workflow Correlation

```javascript
// Same workflow across multiple chains
const workflowId = "cross-chain-workflow-001";
const processHash = ethers.keccak256(
  ethers.toUtf8Bytes(workflowId)
);

// Polygon: Register document
await polygonRegistry.registerDocument(..., processHash, ...);

// Ethereum: Fractionalize into shares
await ethereumRegistry.registerDocument(..., processHash, ...);

// Arbitrum: Create derivatives
await arbitrumRegistry.registerDocument(..., processHash, ...);

// Query events across all chains with same processHash
const polygonEvents = await queryPolygon(processHash);
const ethereumEvents = await queryEthereum(processHash);
const arbitrumEvents = await queryArbitrum(processHash);

// Complete cross-chain audit trail
```

## Database Schema Patterns

### Simple Correlation Table

```sql
CREATE TABLE workflow_blockchain_correlation (
  workflow_id VARCHAR PRIMARY KEY,
  process_hash VARCHAR NOT NULL UNIQUE,
  integra_hash VARCHAR,
  status VARCHAR,
  created_at TIMESTAMP,
  blockchain_timestamp BIGINT,

  INDEX idx_process_hash (process_hash),
  INDEX idx_integra_hash (integra_hash)
);
```

### Multi-Step Workflow Tracking

```sql
CREATE TABLE workflow_steps (
  id SERIAL PRIMARY KEY,
  workflow_id VARCHAR,
  process_hash VARCHAR,
  step_name VARCHAR,
  contract_address VARCHAR,
  function_name VARCHAR,
  tx_hash VARCHAR,
  block_number BIGINT,
  event_name VARCHAR,
  event_data JSONB,
  timestamp TIMESTAMP,

  INDEX idx_workflow (workflow_id),
  INDEX idx_process_hash (process_hash)
);
```

## Event Indexing

### Indexer Configuration

```javascript
// Index all Integra events with processHash
const indexer = {
  contracts: [
    {
      address: documentRegistryAddress,
      events: [
        "DocumentRegistered",
        "OwnershipTransferred"
      ],
      processHashField: 4  // processHash at index 4 in event
    },
    {
      address: tokenizerAddress,
      events: [
        "TokenReserved",
        "TokenClaimed",
        "TokenTransferred"
      ],
      processHashField: 3  // processHash at index 3
    }
  ],

  async onEvent(event) {
    const processHash = event.args[this.processHashField];

    await db.blockchainEvents.create({
      contract: event.address,
      eventName: event.event,
      processHash: processHash,
      data: event.args,
      blockNumber: event.blockNumber,
      txHash: event.transactionHash,
      timestamp: (await event.getBlock()).timestamp
    });
  }
};
```

### Query API

```javascript
// API endpoint: GET /api/workflow/:processHash/events
async function getWorkflowEvents(processHash) {
  return await db.blockchainEvents.findAll({
    where: { processHash },
    order: [['blockNumber', 'ASC']]
  });
}

// Example response:
[
  {
    event: "DocumentRegistered",
    processHash: "0xabc...",
    integraHash: "0xdef...",
    owner: "0x123...",
    blockNumber: 1000000,
    timestamp: 1700000000
  },
  {
    event: "TokenReserved",
    processHash: "0xabc...",  // Same workflow
    integraHash: "0xdef...",
    tokenId: 1,
    recipient: "0x456...",
    blockNumber: 1000001,
    timestamp: 1700000100
  }
]
```

## Use Cases by Industry

### Real Estate

```javascript
// MLS listing → blockchain registration
processHash = keccak256(`mls-${listingNumber}`);

// Link:
- MLS database record
- Blockchain document registration
- Token reservation for buyer
- Escrow transactions
- Title transfer
```

### Healthcare

```javascript
// Patient consent workflow → blockchain proof
processHash = keccak256(`consent-${patientId}-${consentId}`);

// Link:
- EMR system consent record
- Blockchain attestation
- Access grant events
- Revocation events
```

### Supply Chain

```javascript
// Bill of lading → blockchain tracking
processHash = keccak256(`shipment-${trackingNumber}`);

// Link:
- ERP shipment record
- Blockchain BoL registration
- Custody transfers
- Delivery confirmation
```

### Legal

```javascript
// Contract execution → blockchain proof
processHash = keccak256(`contract-${caseNumber}`);

// Link:
- Legal management system
- Document signatures
- Blockchain registration
- Token distributions
```

## Best Practices

### 1. Use Meaningful Process IDs

```javascript
// Good: Descriptive, unique
const processHash = keccak256("property-sale-123-main-st-2024-11-18");

// Bad: Generic
const processHash = keccak256("process1");
```

### 2. Include Timestamp for Uniqueness

```javascript
const processHash = keccak256(
  `${workflowType}-${workflowId}-${Date.now()}`
);
// Prevents collisions across workflows
```

### 3. Store Bidirectional References

```javascript
// In your database
{
  workflowId: "sale-123",
  processHash: "0xabc...",  // Can query blockchain
  integraHash: "0xdef..."   // Can query by document
}

// Enables queries in both directions:
// - Given workflowId → find blockchain events
// - Given integraHash → find workflow record
```

### 4. Use processHash = 0 When Not Applicable

```javascript
// Simple operations without workflow
await tokenizer.reserveToken(
  integraHash,
  tokenId,
  recipient,
  amount,
  bytes32(0)  // No workflow correlation needed
);
```

## Security Considerations

### ProcessHash is NOT Secret

**Important:** `processHash` is emitted in public events, so:

- ✅ Use for correlation only
- ❌ Don't encode secrets
- ❌ Don't include PII
- ❌ Don't include sensitive identifiers

**Good:**
```javascript
processHash = keccak256("workflow-12345");
```

**Bad:**
```javascript
processHash = keccak256("ssn-123-45-6789");  // ❌ PII exposed
processHash = keccak256("api-key-secret");   // ❌ Secret exposed
```

### Privacy-Preserving Process IDs

If workflow IDs are sensitive, use hashing:

```javascript
// Sensitive workflow ID
const sensitiveWorkflowId = "patient-medical-record-123";

// Hash it before using as processHash
const processHash = keccak256(
  keccak256(sensitiveWorkflowId)  // Double hash
);

// Now processHash reveals nothing about workflow
// But you can still correlate in your backend
```

## Summary

Integra's `processHash` pattern:

1. **Links** blockchain transactions to off-chain workflows
2. **Enables** seamless integration with any software system
3. **Provides** universal correlation mechanism across all contracts
4. **Supports** multi-step, multi-contract workflow tracking
5. **Simplifies** event indexing and querying
6. **Works** across chains with same processHash
7. **Requires** no additional infrastructure (just use the field)

This simple pattern makes Integra contracts **integration-ready** for CRM, ERP, document management, workflow engines, and any application that needs blockchain proof with workflow correlation.

## Learn More

- [Integration Guide](../guides/integration.md) - Detailed integration examples
- [Batch Operations](../patterns/batch-operations.md) - Batch processing with processHash
- [Messaging](../messaging/overview.md) - ProcessHash in messaging contracts
- [Web2 Integration](../web2-integration/overview.md) - Connecting traditional systems
