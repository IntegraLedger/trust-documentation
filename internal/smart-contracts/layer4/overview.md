# Layer 4: Communication Layer Overview

## Purpose

Layer 4 provides the communication infrastructure for the Integra smart contract system. This layer enables workflow participants to exchange messages and payment requests in a privacy-preserving, spam-resistant manner while maintaining correlation with workflow processes.

## Architecture Philosophy

Layer 4 follows an **event-sourced communication** strategy:

- **No Storage**: Communication events are emitted, not stored (minimizes gas costs)
- **Off-Chain Correlation**: Message correlation and aggregation handled off-chain
- **Privacy-First**: Encrypted payloads with hybrid encryption for payment requests
- **Spam Prevention**: ZK proof requirements prevent spam and abuse
- **Trust Substrate**: Token holder verification ensures only authorized parties communicate

## Layer Components

### 1. IntegraMessage (Workflow Messaging)

Event-sourced messaging system for workflow coordination.

**Purpose**: Allow workflow participants to register messages correlated to workflows

**Key Features**:
- ZK proof-based anti-spam protection
- Process hash correlation for workflow tracking
- Event-sourced design (no storage overhead)
- Poseidon hash for all ID generation
- No on-chain correlation checking (done off-chain)

[View Full Documentation →](./IntegraMessage.md)

### 2. IntegraSignal (Payment Requests)

Token-to-token payment request system with encrypted payloads.

**Purpose**: Enable secure, privacy-preserving payment requests between workflow participants

**Key Features**:
- Encrypted payment payloads (privacy-preserving)
- Hybrid encryption (requestor + payer can decrypt)
- EAS attestation for payload integrity
- Configurable timeouts with extension mechanism
- State machine for payment lifecycle
- Batch operations for efficiency

[View Full Documentation →](./IntegraSignal.md)

## Communication Patterns

### Event-Sourced Messaging (IntegraMessage)

```
1. Participant knows processHash (via ZK proof)
                ↓
2. Generates ZK proof of processHash knowledge
                ↓
3. Registers message with proof
   - integraHash (document)
   - processHash (workflow)
   - tokenId (participant identity)
   - eventRef (event type)
   - message (event data)
                ↓
4. Event emitted (MessageRegistered)
                ↓
5. Off-chain indexer correlates messages by processHash
                ↓
6. Workflow participants query indexed messages
```

**Security Model**:
- ZK proof prevents spam (must know processHash)
- No storage means no gas griefing
- Off-chain correlation enables flexible querying
- Token holder verification ensures authorization

### Payment Request Flow (IntegraSignal)

```
1. Requestor encrypts payment details
   - AES-256-GCM encryption
   - Session keys for requestor + payer
                ↓
2. Creates EAS attestation of payload hash
   - Integrity verification
   - Prevents payload tampering
                ↓
3. Sends payment request on-chain
   - Encrypted payload stored
   - Both parties can decrypt
   - Display amount (for UI)
                ↓
4. Payment request enters PENDING state
                ↓
5. Payer decrypts payload, processes payment
                ↓
6. Either party marks PAID
   - Payment proof recorded
   - State transitions to PAID
                ↓
7. Optional: Dispute resolution
   - State transitions to DISPUTED
   - Operator can resolve
```

**Security Model**:
- Token holder verification (trust substrate)
- Encrypted payloads (privacy-preserving)
- EAS attestation (integrity verification)
- State machine (prevents invalid transitions)
- Timeout mechanism (prevents indefinite pending)

## How Contracts Work Together

### Cross-Layer Integration

```
┌─────────────────────────────────────────────────┐
│  Layer 4: Communication                         │
│  - IntegraMessage (workflow events)           │
│  - IntegraSignal (payment requests)           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Layer 3: Tokenization                          │
│  - Document tokenizers                          │
│  - Token holder verification                    │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Layer 2: Document Identity                     │
│  - Document registry (integraHash)              │
│  - Tokenizer lookup                             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Layer 0: Foundation                            │
│  - ZK verifier registry                         │
│  - EAS attestation system                       │
└─────────────────────────────────────────────────┘
```

### Workflow Correlation

```
processHash = Poseidon(workflowSecret, participants, timestamp)

IntegraMessage:
- Proves knowledge of processHash (ZK proof)
- Emits messages tagged with processHash
- Off-chain indexer groups by processHash

IntegraSignal:
- Includes processHash in payment request
- Emits events tagged with processHash
- Links payments to workflow context
```

**Process Hash Properties**:
- Derived from workflow secret (known to participants)
- Poseidon hash (ZK-friendly)
- Correlates events across time
- Privacy-preserving (hash reveals nothing)

## Security Model

### Defense in Depth

1. **ZK Proof Anti-Spam (IntegraMessage)**
   - Must prove knowledge of processHash
   - Prevents random spam messages
   - No gas costs for invalid proofs (revert early)

2. **Token Holder Verification (IntegraSignal)**
   - Requestor must hold requestorTokenId
   - Payer must hold payerTokenId
   - Trust substrate ensures authorized parties

3. **Encrypted Payloads (IntegraSignal)**
   - Payment details never on-chain
   - Only requestor + payer can decrypt
   - Hybrid encryption scheme

4. **EAS Attestation Integrity (IntegraSignal)**
   - Payload hash attested by EAS
   - Prevents payload tampering
   - Verifiable integrity

5. **State Machine Protection (IntegraSignal)**
   - Only valid state transitions allowed
   - Prevents double-payment
   - Timeout mechanism prevents stale requests

### Threat Model

#### Prevented Attacks

| Attack | Prevention Mechanism |
|--------|---------------------|
| Message spam | ZK proof requirement |
| Unauthorized payment requests | Token holder verification |
| Payment detail exposure | Encrypted payloads |
| Payload tampering | EAS attestation verification |
| Invalid state transitions | State machine validation |
| Indefinite pending payments | Configurable timeout + extensions |
| Cross-document replay | processHash binding |
| Front-running | EAS recipient binding |

#### Privacy Guarantees

**IntegraMessage**:
- Message content encrypted off-chain (if needed)
- processHash reveals no workflow details
- Correlation only possible with processHash knowledge

**IntegraSignal**:
- Payment amounts encrypted in payload
- Only display amount visible (UI purposes)
- Neither party's financial details exposed
- Payment proof is hash (no sensitive data)

## Gas Optimization

### Event-Sourced Design

**IntegraMessage**:
- No storage writes (only event emission)
- Gas cost: ~60,000-80,000 (with ZK proof verification)
- Scales to unlimited messages (no storage growth)

**IntegraSignal**:
- Storage only for active payment requests
- Completed payments remain in storage (audit trail)
- Batch operations reduce per-request gas cost

### Gas Costs (Approximate)

| Operation | Gas Cost | Notes |
|-----------|----------|-------|
| registerMessage() | ~70,000 | Includes ZK proof verification |
| sendPaymentRequest() | ~200,000 | Storage + EAS verification |
| markPaid() | ~50,000 | State update + event |
| cancelPayment() | ~45,000 | State update + event |
| extendPaymentRequest() | ~40,000 | Extension tracking update |

## Design Patterns

### 1. Event-Sourced Communication

- All communication via events (no storage)
- Off-chain indexing for correlation
- Minimizes gas costs
- Enables flexible querying

### 2. ZK-Based Anti-Spam

- Prove knowledge without revealing secret
- Poseidon-friendly processHash
- BasicAccessV1Poseidon verifier
- Spam prevention without centralized gating

### 3. Hybrid Encryption

- Session keys encrypted for each party
- AES-256-GCM for payload encryption
- Both parties can decrypt independently
- Privacy-preserving payment details

### 4. Trust Substrate

- Token holder verification
- Document tokenizers as trust root
- No separate permission system needed
- Leverages existing token infrastructure

### 5. Configurable Timeouts

- Default timeout: 60 days
- Custom timeout per request (7-365 days)
- Extensions up to 180 days total
- Grace period: 3 hours

## Integration Guide

### For Workflow Participants

#### Registering Messages

```solidity
// 1. Generate ZK proof of processHash knowledge
uint256[2] memory proofA = [...];
uint256[2][2] memory proofB = [...];
uint256[2] memory proofC = [...];

// 2. Register message
integraMessage.registerMessage(
    integraHash,        // Document identifier
    tokenId,            // Your token ID
    processHash,        // Workflow identifier (ZK proven)
    proofA, proofB, proofC,
    "PAYMENT_INITIATED", // Event type
    "Invoice 123 payment started" // Message
);
```

#### Creating Payment Requests

```solidity
// 1. Encrypt payment details
bytes memory encryptedPayload = encryptPaymentDetails(
    paymentAmount,
    currency,
    bankDetails,
    sessionKey
);

// 2. Encrypt session keys
bytes memory encryptedKeyRequestor = encryptForRequestor(sessionKey);
bytes memory encryptedKeyPayer = encryptForPayer(sessionKey);

// 3. Create EAS attestation
bytes32 attestationUID = createPayloadAttestation(
    keccak256(encryptedPayload)
);

// 4. Send payment request
bytes32 requestId = integraSignal.sendPaymentRequest(
    integraHash,
    requestorTokenId,
    payerTokenId,
    payerAddress,
    encryptedPayload,
    encryptedKeyRequestor,
    encryptedKeyPayer,
    attestationUID,
    "INV-2024-001",    // Invoice reference
    1000_00,           // Display amount (100.00 USD)
    "USD",             // Display currency
    processHash,       // Workflow correlation
    30                 // 30-day timeout
);
```

#### Marking Payments as Paid

```solidity
// Either requestor or payer can mark paid
integraSignal.markPaid(
    requestId,
    paymentProofHash,  // Hash of payment receipt
    processHash        // Workflow correlation
);
```

### For Off-Chain Indexers

#### Indexing Messages

```javascript
// Subscribe to MessageRegistered events
integraMessage.on("MessageRegistered", (
    integraHash,
    processHash,
    tokenId,
    eventRef,
    message,
    timestamp,
    registrant,
    event
) => {
    // Store in database indexed by processHash
    await db.messages.insert({
        processHash: processHash,
        integraHash: integraHash,
        tokenId: tokenId,
        eventRef: eventRef,
        message: message,
        timestamp: timestamp,
        registrant: registrant,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
    });
});

// Query messages by processHash
async function getWorkflowMessages(processHash) {
    return await db.messages
        .where({ processHash })
        .orderBy('timestamp', 'asc')
        .toArray();
}
```

#### Indexing Payment Requests

```javascript
// Subscribe to PaymentRequested events
integraSignal.on("PaymentRequested", async (
    requestId,
    integraHash,
    requestor,
    payer,
    requestorTokenId,
    payerTokenId,
    attestationUID,
    processHash,
    timestamp,
    event
) => {
    // Fetch full payment request
    const request = await integraSignal.getPaymentRequest(requestId);

    // Store in database
    await db.paymentRequests.insert({
        requestId: requestId,
        processHash: processHash,
        integraHash: integraHash,
        requestor: requestor,
        payer: payer,
        encryptedPayload: request.encryptedPayload,
        displayAmount: request.displayAmount,
        displayCurrency: request.displayCurrency,
        state: 'PENDING',
        timestamp: timestamp
    });
});

// Update on state changes
integraSignal.on("PaymentMarkedPaid", async (requestId, markedBy, paymentProof) => {
    await db.paymentRequests.update(requestId, {
        state: 'PAID',
        paymentProof: paymentProof,
        paidTimestamp: Date.now()
    });
});
```

### For Frontend Developers

#### Decrypting Payment Requests

```javascript
// Retrieve payment request
const request = await integraSignal.getPaymentRequest(requestId);

// Determine which session key to use
const isRequestor = request.requestor === userAddress;
const encryptedSessionKey = isRequestor
    ? request.encryptedSessionKeyRequestor
    : request.encryptedSessionKeyPayer;

// Decrypt session key using user's private key
const sessionKey = await decryptWithPrivateKey(
    encryptedSessionKey,
    userPrivateKey
);

// Decrypt payload using session key
const paymentDetails = await decryptAES256GCM(
    request.encryptedPayload,
    sessionKey
);

// paymentDetails now contains:
// - amount
// - currency
// - bank details
// - payment instructions
// - etc.
```

## Best Practices

### For Message Senders

1. **ZK Proof Generation**: Generate proofs off-chain to minimize gas
2. **Message Size**: Keep messages concise (max 1000 characters)
3. **Event References**: Use standardized event types for indexing
4. **Token Verification**: Ensure you hold the token before sending

### For Payment Request Creators

1. **Encryption**: Use strong encryption (AES-256-GCM)
2. **Session Keys**: Generate unique session key per request
3. **Display Amounts**: Set reasonable display amounts for UI
4. **Timeouts**: Choose appropriate timeout based on payment method
5. **EAS Attestations**: Verify attestation creation before sending request

### For Payment Request Recipients

1. **Decryption**: Verify session key integrity before decrypting
2. **Verification**: Validate display amount matches encrypted amount
3. **Timeouts**: Respond before timeout expires
4. **Extensions**: Request extensions if needed before expiry

### For Governance

1. **Default Timeouts**: Set reasonable defaults (current: 60 days)
2. **Extension Limits**: Balance flexibility vs. workflow progression
3. **Monitoring**: Track message spam and payment request patterns
4. **Emergency Pause**: Use pause function only for critical issues

## Testing Strategy

### Unit Tests

- ZK proof verification (valid/invalid proofs)
- Payment request state transitions
- Token holder verification
- Timeout and extension logic
- EAS attestation validation

### Integration Tests

- End-to-end message flow
- Payment request lifecycle (PENDING → PAID)
- Multi-party workflows
- Encryption/decryption roundtrip
- Batch payment operations

### Security Tests

- ZK proof forgery attempts
- Invalid state transition attempts
- Token holder impersonation
- Replay attack prevention
- Timeout boundary conditions

## Deployment Checklist

### Pre-Deployment

- [ ] Deploy Layer 0 dependencies (ZK verifier registry)
- [ ] Deploy Layer 2 dependencies (document registry)
- [ ] Configure EAS contract address
- [ ] Register BasicAccessV1Poseidon verifier
- [ ] Create payment payload schema in EAS
- [ ] Prepare governor address

### Deployment (IntegraMessage)

- [ ] Deploy IntegraMessage proxy
- [ ] Initialize with verifier registry and governor
- [ ] Verify contract on block explorer
- [ ] Test message registration with valid ZK proof
- [ ] Configure monitoring and alerting

### Deployment (IntegraSignal)

- [ ] Deploy IntegraSignal proxy
- [ ] Initialize with document registry, EAS, and schema UID
- [ ] Verify contract on block explorer
- [ ] Set default payment timeout (if not using default)
- [ ] Test payment request creation
- [ ] Configure monitoring and alerting

### Post-Deployment

- [ ] Deploy off-chain indexer
- [ ] Set up event listening
- [ ] Create frontend integration
- [ ] Document encryption/decryption flow
- [ ] Prepare user guides
- [ ] Set up analytics dashboard

## Migration Guide

### Migration from V6

**IntegraMessage Changes**:
- V6: No messaging system
- Current: Event-sourced messaging with ZK proof anti-spam

**IntegraSignal Changes**:
- V6: Basic payment requests
- Current: Encrypted payloads, configurable timeouts, extensions

**Migration Steps**:
1. Deploy contracts
2. Update frontend to use encryption
3. Migrate existing payment requests (if any)
4. Update off-chain indexers
5. Train users on new features

## Resources

### Contract Documentation
- [IntegraMessage](./IntegraMessage.md)
- [IntegraSignal](./IntegraSignal.md)

### Related Layers
- [Layer 0: Foundation Layer](../layer0/overview.md)
- [Layer 2: Document Identity Layer](../layer2/overview.md)
- [Layer 3: Tokenization Layer](../layer3/overview.md)

### External Resources
- [Ethereum Attestation Service (EAS)](https://docs.attest.sh/)
- [Poseidon Hash Function](https://www.poseidon-hash.info/)
- [ZK Proof Systems](https://zkp.science/)

## Version

**Current Version**: 1.0.0
**Solidity Version**: 0.8.28
**License**: MIT

## Support

- **Security Issues**: security@integra.io
- **Technical Support**: docs@integra.io
- **GitHub**: https://github.com/IntegraLedger/smart-contracts-evm-v7
