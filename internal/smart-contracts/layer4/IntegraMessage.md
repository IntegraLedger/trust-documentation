# IntegraMessage

## Overview

**Version**: 7.0.0
**Type**: UUPS Upgradeable Contract
**License**: MIT
**Inherits**: UUPSUpgradeable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable

IntegraMessage is an event-sourced messaging system for workflow coordination. It enables workflow participants to register messages correlated to workflows using ZK proof-based anti-spam protection.

### Purpose

- Enable workflow participants to register event messages
- Correlate messages to workflows via processHash
- Prevent spam through ZK proof requirements
- Minimize gas costs through event-sourced design
- Support off-chain message indexing and correlation

### Key Features

- ZK proof required for processHash (anti-spam protection)
- Event-sourced design (no storage, only events)
- Poseidon hash for ID generation (ZK-friendly)
- No on-chain correlation checking (done off-chain)
- Message and event reference validation
- Pausable for emergency stops

## Architecture

### Design Philosophy

**Why Event-Sourced?**

1. **Gas Efficiency**: No storage writes (only event emissions)
2. **Scalability**: Unlimited messages without storage growth
3. **Flexibility**: Off-chain indexers can query/filter as needed
4. **Privacy**: Correlation only possible with processHash knowledge

**Why ZK Proofs?**

1. **Anti-Spam**: Must prove knowledge of processHash
2. **Privacy-Preserving**: No processHash pre-image revealed
3. **Decentralized**: No centralized permission system
4. **Poseidon-Friendly**: Compatible with ZK circuits

### Integration Points

- **IntegraVerifierRegistry_Immutable**: ZK proof verifier lookup
- **BasicAccessV1Poseidon Verifier**: Poseidon hash proof verification
- **Off-Chain Indexers**: Event listening and correlation
- **Frontend**: ZK proof generation and message submission

## Key Concepts

### 1. Process Hash Correlation

The `processHash` is the workflow correlation identifier:

```
processHash = Poseidon(workflowSecret, participants, timestamp)
```

**Properties**:
- Derived from workflow secret (known to participants)
- Poseidon hash (ZK-friendly, efficient in circuits)
- Same for all messages in a workflow
- Enables off-chain correlation

**Privacy Model**:
- Hash reveals nothing about workflow
- Only participants know the pre-image
- Cannot brute-force without knowing workflow secret
- Off-chain correlation requires processHash knowledge

### 2. ZK Proof Anti-Spam

**Proof Requirements**:
```solidity
// Prove knowledge of processHash without revealing it
proof = generateProof(processHash, publicInputs)

// Verifier checks:
// 1. Proof is valid
// 2. Public output matches processHash
// 3. Prover knows the pre-image
```

**Security Properties**:
- Cannot spam without knowing processHash
- Cannot forge proofs for random processHash values
- Invalid proofs revert early (no gas griefing)
- Verifier is immutable (registered in Layer 0)

### 3. Event-Sourced Design

**No Storage**:
```solidity
// Traditional approach (NOT used):
mapping(bytes32 => Message[]) public messages; // Storage writes = expensive

// Event-sourced approach (USED):
emit MessageRegistered(...); // Only event emission = cheap
```

**Off-Chain Correlation**:
```javascript
// Indexer listens to events
contract.on("MessageRegistered", (integraHash, processHash, ...) => {
    db.insert({ processHash, integraHash, ... });
});

// Query by processHash
const messages = await db.messages
    .where({ processHash: targetProcessHash })
    .orderBy('timestamp', 'asc')
    .toArray();
```

### 4. Message Format

**Components**:
- `integraHash`: Document identifier (Layer 2)
- `tokenId`: Token ID of message sender
- `processHash`: Workflow correlation identifier
- `eventRef`: Event type (e.g., "PAYMENT_INITIATED")
- `message`: Event data/description
- `timestamp`: Block timestamp
- `registrant`: Address that registered message

**Example Events**:
```
eventRef: "PAYMENT_INITIATED"
message: "Payment request sent for invoice INV-2024-001"

eventRef: "DOCUMENT_SIGNED"
message: "Contract signed by buyer (token #1)"

eventRef: "MILESTONE_REACHED"
message: "50% completion milestone achieved"

eventRef: "DISPUTE_OPENED"
message: "Delivery dispute opened by seller"
```

## State Variables

### Constants

```solidity
bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
uint256 public constant MAX_EVENT_REF_LENGTH = 100;
uint256 public constant MAX_MESSAGE_LENGTH = 1000;
```

**Validation Limits**:
- Event references: 1-100 characters (standardized types)
- Messages: 1-1000 characters (detailed descriptions)
- Both are required (cannot be empty)

### Immutable References

```solidity
IntegraVerifierRegistry_Immutable public verifierRegistry;
```

Set during initialization, cannot be changed. Preserves anti-spam protection forever.

## Functions

### Initialization

```solidity
function initialize(
    address _verifierRegistry,
    address _governor
) external initializer
```

Initialize the message contract.

**Parameters**:
- `_verifierRegistry`: IntegraVerifierRegistry_Immutable address
- `_governor`: Governor address (gets all roles)

**Validation**:
- Both addresses must be non-zero

**Roles Granted**:
- DEFAULT_ADMIN_ROLE
- GOVERNOR_ROLE
- OPERATOR_ROLE

**Example**:
```solidity
integraMessage.initialize(
    verifierRegistryAddress,
    governorAddress
);
```

### Core Functions

#### registerMessage

```solidity
function registerMessage(
    bytes32 integraHash,
    uint256 tokenId,
    bytes32 processHash,
    uint256[2] calldata proofA,
    uint256[2][2] calldata proofB,
    uint256[2] calldata proofC,
    string calldata eventRef,
    string calldata message
) external nonReentrant whenNotPaused
```

Register a workflow event message with ZK proof.

**Parameters**:
- `integraHash`: Document identifier (Layer 2)
- `tokenId`: Token ID of sender (for correlation)
- `processHash`: Workflow correlation identifier (ZK proven)
- `proofA`, `proofB`, `proofC`: Groth16 ZK proof components
- `eventRef`: Event type (1-100 chars, e.g., "PAYMENT_INITIATED")
- `message`: Event description (1-1000 chars)

**ZK Proof Format**:
The proof must demonstrate knowledge of the processHash pre-image using the BasicAccessV1Poseidon verifier:

```solidity
verifier.verifyProof(proofA, proofB, proofC, uint256(processHash))
```

**Validation**:
1. `integraHash` is not zero
2. `processHash` is not zero
3. `eventRef` is not empty and ≤ 100 chars
4. `message` is not empty and ≤ 1000 chars
5. ZK proof is valid for processHash

**Events**: Emits `MessageRegistered`

**Gas Cost**: ~60,000-80,000 (including ZK verification)

**Example**:
```solidity
// Generate ZK proof off-chain
const { proofA, proofB, proofC } = await generateProcessHashProof(
    processHash,
    workflowSecret
);

// Register message on-chain
await integraMessage.registerMessage(
    integraHash,
    tokenId,
    processHash,
    proofA,
    proofB,
    proofC,
    "PAYMENT_INITIATED",
    "Payment request INV-2024-001 sent to buyer"
);
```

**Security Considerations**:
- ZK proof prevents spam (must know processHash)
- Reentrancy guard prevents reentrancy attacks
- Pausable allows emergency stop
- No storage means no gas griefing via storage growth

### Emergency Functions

#### pause / unpause

```solidity
function pause() external onlyRole(GOVERNOR_ROLE)
function unpause() external onlyRole(GOVERNOR_ROLE)
```

Pause/unpause message registration.

**Effects**:
- When paused, `registerMessage()` reverts
- All message registration stops

**Use Cases**:
- Critical bug discovered
- ZK verifier compromised
- Spam attack mitigation
- Emergency security response

**Example**:
```solidity
// Emergency: pause all messaging
await integraMessage.connect(governor).pause();

// After fix: resume messaging
await integraMessage.connect(governor).unpause();
```

## Events

### MessageRegistered

```solidity
event MessageRegistered(
    bytes32 indexed integraHash,
    bytes32 indexed processHash,
    uint256 indexed tokenId,
    string eventRef,
    string message,
    uint256 timestamp,
    address registrant
)
```

Emitted when a message is registered.

**Indexed Fields** (efficient filtering):
- `integraHash`: Query messages for specific document
- `processHash`: Query messages for specific workflow
- `tokenId`: Query messages from specific token holder

**Non-Indexed Fields**:
- `eventRef`: Event type (standardized)
- `message`: Event description
- `timestamp`: Block timestamp (when registered)
- `registrant`: Address that registered message

**Indexing Example**:
```javascript
// Filter by processHash
const filter = integraMessage.filters.MessageRegistered(
    null,              // any integraHash
    targetProcessHash, // specific processHash
    null               // any tokenId
);

const events = await integraMessage.queryFilter(filter);
const messages = events.map(e => ({
    integraHash: e.args.integraHash,
    processHash: e.args.processHash,
    tokenId: e.args.tokenId,
    eventRef: e.args.eventRef,
    message: e.args.message,
    timestamp: e.args.timestamp,
    registrant: e.args.registrant
}));
```

## Errors

### Validation Errors

```solidity
error InvalidIntegraHash();
error InvalidProcessHash();
error EventRefRequired();
error EventRefTooLong(uint256 length, uint256 maximum);
error MessageCannotBeEmpty();
error MessageTooLong(uint256 length, uint256 maximum);
```

**Error Handling**:
```javascript
try {
    await integraMessage.registerMessage(...);
} catch (error) {
    if (error.errorName === 'MessageTooLong') {
        console.error(`Message too long: ${error.args.length} > ${error.args.maximum}`);
    } else if (error.errorName === 'InvalidProof') {
        console.error('ZK proof verification failed');
    }
}
```

### ZK Proof Errors

```solidity
error InvalidProof();
error VerifierNotFound();
```

**Causes**:
- `InvalidProof`: ZK proof verification failed
- `VerifierNotFound`: BasicAccessV1Poseidon verifier not registered

### General Errors

```solidity
error ZeroAddress();
```

## Security Considerations

### ZK Proof Security

**Verifier Trust**:
```
1. Verifier registered in IntegraVerifierRegistry_Immutable
                ↓
2. Code hash captured at registration
                ↓
3. Code hash validated on every lookup
                ↓
4. Returns address(0) if code changed
                ↓
5. Contract reverts if verifier not found
```

**Proof Forgery Prevention**:
- Cannot generate valid proof without knowing processHash pre-image
- Groth16 proofs are cryptographically secure
- Verifier validates all proof components

**Replay Attack Prevention**:
- Proof is bound to specific processHash value
- Cannot reuse proof for different processHash
- Each workflow needs unique proof

### Spam Prevention

**ZK Proof Barrier**:
```
Without processHash knowledge:
- Cannot generate valid ZK proof
- Transaction reverts early (minimal gas wasted)
- No events emitted
- No spam possible

With processHash knowledge:
- Legitimate workflow participant
- Can generate valid proof
- Message registered successfully
```

**Gas Griefing Prevention**:
- No storage writes (only events)
- Invalid proofs revert early
- Maximum message length enforced
- No unbounded loops or operations

### Privacy Properties

**Process Hash Privacy**:
- processHash is a Poseidon hash
- Cannot reverse to get pre-image
- Cannot brute-force without workflow secret
- Only participants know pre-image

**Message Privacy**:
- Messages stored in events (public)
- Encrypt sensitive data off-chain before submitting
- Only include necessary information in message field

**Correlation Privacy**:
- Off-chain correlation requires processHash knowledge
- Cannot correlate messages without knowing processHash
- Cannot discover workflows by scanning events

## Usage Examples

### Basic Message Registration

```solidity
// Setup
const integraHash = "0x123..."; // Document hash
const tokenId = 1; // Sender's token ID
const processHash = "0xabc..."; // Workflow correlation hash

// Generate ZK proof (off-chain using circom/snarkjs)
const { proofA, proofB, proofC } = await generateProof({
    processHashPreImage: workflowSecret,
    publicOutput: processHash
});

// Register message
await integraMessage.registerMessage(
    integraHash,
    tokenId,
    processHash,
    proofA,
    proofB,
    proofC,
    "PAYMENT_INITIATED",
    "Payment request sent for invoice INV-2024-001"
);
```

### Workflow Event Sequence

```javascript
// Workflow: Purchase Order Process

// Event 1: Order created
await registerMessage({
    eventRef: "ORDER_CREATED",
    message: "Purchase order #PO-001 created by buyer"
});

// Event 2: Order confirmed
await registerMessage({
    eventRef: "ORDER_CONFIRMED",
    message: "Purchase order confirmed by seller"
});

// Event 3: Payment requested
await registerMessage({
    eventRef: "PAYMENT_REQUESTED",
    message: "Payment request for $10,000 sent"
});

// Event 4: Payment received
await registerMessage({
    eventRef: "PAYMENT_RECEIVED",
    message: "Payment received via wire transfer"
});

// Event 5: Goods shipped
await registerMessage({
    eventRef: "GOODS_SHIPPED",
    message: "Order shipped via FedEx, tracking: 123456789"
});

// Event 6: Goods received
await registerMessage({
    eventRef: "GOODS_RECEIVED",
    message: "Goods received and inspected, order complete"
});
```

### Off-Chain Indexing

```javascript
// Set up event listener
const integraMessage = new ethers.Contract(address, abi, provider);

integraMessage.on("MessageRegistered", async (
    integraHash,
    processHash,
    tokenId,
    eventRef,
    message,
    timestamp,
    registrant,
    event
) => {
    // Store in database
    await db.messages.insert({
        id: event.transactionHash + "-" + event.logIndex,
        integraHash: integraHash,
        processHash: processHash,
        tokenId: tokenId.toString(),
        eventRef: eventRef,
        message: message,
        timestamp: timestamp.toNumber(),
        registrant: registrant,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
    });

    console.log(`Message registered: ${eventRef} - ${message}`);
});

// Query workflow messages
async function getWorkflowMessages(processHash) {
    return await db.messages
        .where({ processHash })
        .orderBy('timestamp', 'asc')
        .toArray();
}

// Query document messages
async function getDocumentMessages(integraHash) {
    return await db.messages
        .where({ integraHash })
        .orderBy('timestamp', 'asc')
        .toArray();
}

// Query messages by event type
async function getMessagesByEventType(eventRef) {
    return await db.messages
        .where({ eventRef })
        .orderBy('timestamp', 'desc')
        .toArray();
}
```

### ZK Proof Generation

```javascript
// Using circom and snarkjs

// 1. Load circuit
const circuit = await loadCircuit('BasicAccessV1Poseidon.circom');

// 2. Prepare inputs
const inputs = {
    secret: workflowSecret, // Private input
    publicHash: processHash // Public input/output
};

// 3. Generate witness
const witness = await circuit.calculateWitness(inputs);

// 4. Generate proof
const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    witness,
    'circuit.wasm',
    'circuit_final.zkey'
);

// 5. Format for Solidity
const proofA = [proof.pi_a[0], proof.pi_a[1]];
const proofB = [[proof.pi_b[0][1], proof.pi_b[0][0]],
               [proof.pi_b[1][1], proof.pi_b[1][0]]];
const proofC = [proof.pi_c[0], proof.pi_c[1]];

// 6. Use in contract call
await integraMessage.registerMessage(
    integraHash,
    tokenId,
    processHash,
    proofA,
    proofB,
    proofC,
    eventRef,
    message
);
```

## Integration Guide

### Frontend Integration

```javascript
import { ethers } from 'ethers';

class WorkflowMessaging {
    constructor(contractAddress, provider, signer) {
        this.contract = new ethers.Contract(
            contractAddress,
            IntegraMessageABI,
            signer
        );
    }

    async registerMessage(params) {
        // Validate inputs
        if (params.eventRef.length > 100) {
            throw new Error('Event reference too long');
        }
        if (params.message.length > 1000) {
            throw new Error('Message too long');
        }

        // Generate ZK proof
        const { proofA, proofB, proofC } = await this.generateProof(
            params.processHash,
            params.workflowSecret
        );

        // Submit transaction
        const tx = await this.contract.registerMessage(
            params.integraHash,
            params.tokenId,
            params.processHash,
            proofA,
            proofB,
            proofC,
            params.eventRef,
            params.message
        );

        // Wait for confirmation
        const receipt = await tx.wait();

        // Extract event
        const event = receipt.events.find(
            e => e.event === 'MessageRegistered'
        );

        return {
            transactionHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber,
            event: event.args
        };
    }

    async generateProof(processHash, workflowSecret) {
        // Call ZK proof generation service
        const response = await fetch('/api/zkproof/generate', {
            method: 'POST',
            body: JSON.stringify({
                type: 'BasicAccessV1Poseidon',
                inputs: {
                    secret: workflowSecret,
                    publicHash: processHash
                }
            })
        });

        return await response.json();
    }
}
```

### Backend Integration

```javascript
// Express.js backend for ZK proof generation

const express = require('express');
const snarkjs = require('snarkjs');
const app = express();

app.post('/api/zkproof/generate', async (req, res) => {
    try {
        const { inputs } = req.body;

        // Generate proof
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            inputs,
            'circuits/BasicAccessV1Poseidon.wasm',
            'circuits/BasicAccessV1Poseidon_final.zkey'
        );

        // Format for Solidity
        const proofA = [proof.pi_a[0], proof.pi_a[1]];
        const proofB = [[proof.pi_b[0][1], proof.pi_b[0][0]],
                       [proof.pi_b[1][1], proof.pi_b[1][0]]];
        const proofC = [proof.pi_c[0], proof.pi_c[1]];

        res.json({ proofA, proofB, proofC, publicSignals });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

## Best Practices

### For Message Senders

1. **Standardize Event References**: Use consistent eventRef values (e.g., "PAYMENT_INITIATED" not "payment initiated")
2. **Keep Messages Concise**: Stay well under 1000 character limit
3. **Include Context**: Add relevant identifiers (invoice numbers, order IDs, etc.)
4. **Off-Chain Encryption**: Encrypt sensitive data before including in message
5. **ZK Proof Caching**: Cache proofs for repeated processHash values

### For Indexer Operators

1. **Index All Fields**: Store all event data for flexible querying
2. **Normalize Event Types**: Standardize eventRef values in database
3. **Handle Reorgs**: Implement block reorg handling
4. **Add Full-Text Search**: Enable message content search
5. **Monitor Performance**: Track indexing lag and query performance

### For Governance

1. **Verifier Monitoring**: Monitor BasicAccessV1Poseidon verifier for changes
2. **Pause Authority**: Keep pause authority for emergency situations
3. **Event Standards**: Publish recommended eventRef standards
4. **Spam Monitoring**: Watch for unusual message patterns

## References

- [Layer 4 Overview](./overview.md)
- [IntegraSignal](./IntegraSignal.md)
- [IntegraVerifierRegistry_Immutable](../layer0/IntegraVerifierRegistry_Immutable.md)
- [Poseidon Hash](https://www.poseidon-hash.info/)
- [Groth16 ZK Proofs](https://eprint.iacr.org/2016/260.pdf)
- [Circom Documentation](https://docs.circom.io/)
- [snarkjs Documentation](https://github.com/iden3/snarkjs)
