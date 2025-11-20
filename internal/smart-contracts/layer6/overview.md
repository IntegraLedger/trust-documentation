# Layer 6: Execution Layer Overview

## Purpose

Layer 6 provides the execution infrastructure for the Integra smart contract system. This layer enables gasless operations, meta-transaction relaying, and whitelisted contract execution, abstracting gas costs from end users while maintaining security through strict access controls.

## Architecture Philosophy

Layer 6 follows a **gas abstraction** strategy:

- **Relayer Pattern**: Backend pays gas for user operations
- **Whitelisting**: Only approved targets and selectors can be executed
- **Meta-Transactions**: Users sign operations, relayers execute
- **Nonce Management**: Prevents replay attacks
- **Minimal Trust**: Execution limited to whitelisted operations only

## Layer Components

### 1. IntegraExecutor (Meta-Transaction Executor)

Execution layer for gasless/meta-transactions with whitelisted contract calls.

**Purpose**: Enable gas-free operations for users by relaying transactions through trusted backend

**Key Features**:
- Whitelisted target contracts
- Whitelisted function selectors
- Nonce-based replay prevention
- Role-based access control
- Emergency pause mechanism

[View Full Documentation →](./IntegraExecutor.md)

## Execution Patterns

### Gas Abstraction Flow

```
1. User signs operation off-chain
   - Target contract address
   - Function call data
   - User's nonce
                ↓
2. User submits signature to backend
                ↓
3. Backend (relayer) validates:
   - Signature is valid
   - Target is whitelisted
   - Selector is whitelisted
   - User's nonce is correct
                ↓
4. Backend submits transaction on-chain
   - Backend pays gas
   - Executor validates whitelists
   - Nonce incremented (replay prevention)
                ↓
5. Target contract executes function
                ↓
6. Event emitted (OperationExecuted)
```

**Security Model**:
- Whitelisted targets prevent arbitrary execution
- Whitelisted selectors prevent unauthorized functions
- Nonce prevents replay attacks
- Role-based access limits executor authority
- Event logging provides audit trail

### Gasless Operation Use Cases

**1. Document Registration**:
```
User signs: registerDocument(...)
Backend relays to: DocumentRegistry
User pays: $0 (backend pays gas)
```

**2. Token Claims**:
```
User signs: claimToken(...)
Backend relays to: DocumentTokenizer
User pays: $0 (backend pays gas)
```

**3. Payment Marking**:
```
User signs: markPaid(...)
Backend relays to: IntegraSignal
User pays: $0 (backend pays gas)
```

**4. Message Registration**:
```
User signs: registerMessage(...)
Backend relays to: IntegraMessage
User pays: $0 (backend pays gas)
```

## How Contracts Work Together

### Cross-Layer Integration

```
┌─────────────────────────────────────────────────┐
│  Layer 6: Execution                             │
│  - IntegraExecutor (meta-transactions)        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Layer 4: Communication                         │
│  - IntegraMessage (via executor)              │
│  - IntegraSignal (via executor)               │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Layer 3: Tokenization                          │
│  - Document tokenizers (via executor)           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Layer 2: Document Identity                     │
│  - Document registry (via executor)             │
└─────────────────────────────────────────────────┘
```

### Whitelist Configuration

```
Governor sets whitelists:

Allowed Targets:
- IntegraDocumentRegistry_Immutable
- IntegraMessage
- IntegraSignal
- DocumentTokenizer instances
- Other approved contracts

Allowed Selectors:
- registerDocument(bytes32,bytes32,...)
- registerMessage(bytes32,uint256,...)
- sendPaymentRequest(bytes32,uint256,...)
- markPaid(bytes32,bytes32,bytes32)
- claimToken(bytes32,bytes32)
- Other approved functions
```

## Security Model

### Defense in Depth

1. **Target Whitelisting**
   - Only approved contracts can be called
   - Prevents arbitrary contract execution
   - Governance-controlled whitelist

2. **Selector Whitelisting**
   - Only approved functions can be called
   - Prevents unauthorized operations
   - Governance-controlled whitelist

3. **Nonce Management**
   - Per-user nonce tracking
   - Incremented before external call (CEI pattern)
   - Prevents replay attacks

4. **Role-Based Access**
   - EXECUTOR_ROLE required to execute operations
   - GOVERNOR_ROLE manages whitelists
   - RELAYER_ROLE for backend relayers

5. **Emergency Pause**
   - GOVERNOR can pause all operations
   - Used for security incidents
   - Resumes when safe

### Threat Model

#### Prevented Attacks

| Attack | Prevention Mechanism |
|--------|---------------------|
| Arbitrary contract execution | Target whitelist |
| Unauthorized function calls | Selector whitelist |
| Replay attacks | Nonce management |
| Unauthorized relayers | EXECUTOR_ROLE requirement |
| Gas griefing | Execution reverts on failure |
| Whitelist manipulation | GOVERNOR_ROLE requirement |

#### Trust Assumptions

**Trusted Parties**:
- Governor (whitelists, pause authority)
- Relayers (EXECUTOR_ROLE holders)

**Untrusted Parties**:
- End users (can only call whitelisted functions)
- Target contracts (execution controlled by whitelists)

## Gas Optimization

### Meta-Transaction Benefits

**Traditional Flow**:
```
User wallet → pays gas → contract execution
Gas cost: User pays full amount
```

**Meta-Transaction Flow**:
```
User wallet → signs → backend → pays gas → executor → contract execution
Gas cost: Backend pays, user pays $0
```

**Gas Overhead**:
- Executor validation: ~10,000 gas
- Nonce management: ~5,000 gas
- Event emission: ~2,000 gas
- Total overhead: ~17,000 gas

**Benefits**:
- Users don't need native token (ETH, MATIC, etc.)
- Better UX (no wallet funding required)
- Predictable costs (backend manages gas)
- Batch operations possible

### Gas Costs (Approximate)

| Operation | Gas Cost | Notes |
|-----------|----------|-------|
| executeOperation() | ~17,000 + target gas | Overhead + target function |
| setTargetAllowed() | ~45,000 | Governance operation |
| setSelectorAllowed() | ~45,000 | Governance operation |

## Design Patterns

### 1. Relayer Pattern

- Backend acts as trusted intermediary
- Backend pays gas for users
- Backend validates signatures off-chain
- Backend submits transactions on-chain
- Users sign operations off-chain (free)

### 2. Whitelist Security

- Only approved targets and selectors
- Governance controls whitelists
- Prevents arbitrary execution
- Minimizes attack surface

### 3. Nonce-Based Replay Prevention

- Per-user nonce tracking
- Nonce incremented before external call (CEI pattern)
- Prevents transaction replay
- Standard meta-transaction pattern

### 4. Role-Based Execution

- EXECUTOR_ROLE for relayers
- GOVERNOR_ROLE for governance
- Separation of concerns
- Minimizes trust requirements

### 5. Fail-Fast Validation

- Target whitelist checked first
- Selector whitelist checked second
- Nonce incremented before call
- Execution reverts on failure

## Integration Guide

### For Backend Relayers

#### Setting Up Relayer

```javascript
import { ethers } from 'ethers';

class IntegraRelayer {
    constructor(executorAddress, relayerSigner) {
        this.executor = new ethers.Contract(
            executorAddress,
            IntegraExecutorABI,
            relayerSigner
        );
    }

    async executeForUser(userAddress, target, calldata) {
        // 1. Validate target and selector
        const selector = calldata.slice(0, 10);

        const isTargetAllowed = await this.executor.allowedTargets(target);
        if (!isTargetAllowed) {
            throw new Error("Target not whitelisted");
        }

        const isSelectorAllowed = await this.executor.allowedSelectors(selector);
        if (!isSelectorAllowed) {
            throw new Error("Selector not whitelisted");
        }

        // 2. Get user's current nonce
        const nonce = await this.executor.nonces(userAddress);

        // 3. Execute operation (backend pays gas)
        const tx = await this.executor.executeOperation(
            target,
            calldata
        );

        // 4. Wait for confirmation
        const receipt = await tx.wait();

        // 5. Extract event
        const event = receipt.events.find(
            e => e.event === 'OperationExecuted'
        );

        return {
            transactionHash: receipt.transactionHash,
            gasUsed: receipt.gasUsed,
            nonce: event.args.nonce,
            success: event.args.success
        };
    }
}
```

#### Handling User Requests

```javascript
// Express.js endpoint for gasless operations

app.post('/api/execute', async (req, res) => {
    try {
        const { userAddress, target, calldata, signature } = req.body;

        // 1. Verify user signature (off-chain)
        const messageHash = ethers.utils.solidityKeccak256(
            ['address', 'address', 'bytes', 'uint256'],
            [userAddress, target, calldata, await executor.nonces(userAddress)]
        );

        const recoveredAddress = ethers.utils.verifyMessage(
            messageHash,
            signature
        );

        if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        // 2. Execute operation (relayer pays gas)
        const result = await relayer.executeForUser(
            userAddress,
            target,
            calldata
        );

        // 3. Return result
        res.json({
            success: true,
            transactionHash: result.transactionHash,
            gasUsed: result.gasUsed.toString()
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

### For Frontend Developers

#### Creating Gasless Operations

```javascript
// Frontend: Sign operation and submit to backend

async function executeGasless(target, functionName, args) {
    // 1. Encode function call
    const iface = new ethers.utils.Interface(targetABI);
    const calldata = iface.encodeFunctionData(functionName, args);

    // 2. Get current nonce
    const nonce = await executor.nonces(userAddress);

    // 3. Create message to sign
    const messageHash = ethers.utils.solidityKeccak256(
        ['address', 'address', 'bytes', 'uint256'],
        [userAddress, target, calldata, nonce]
    );

    // 4. Sign with user's wallet
    const signature = await signer.signMessage(
        ethers.utils.arrayify(messageHash)
    );

    // 5. Submit to backend
    const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userAddress,
            target,
            calldata,
            signature
        })
    });

    const result = await response.json();

    if (!result.success) {
        throw new Error(result.error);
    }

    console.log('Operation executed:', result.transactionHash);
    return result;
}

// Usage
await executeGasless(
    documentRegistryAddress,
    'registerDocument',
    [integraHash, documentHash, ...]
);
```

### For Governance

#### Managing Whitelists

```solidity
// Allow target contract
await executor.connect(governor).setTargetAllowed(
    documentRegistryAddress,
    true
);

// Allow function selector
const selector = ethers.utils.id("registerDocument(bytes32,bytes32,bytes32,bytes32,uint256[2],uint256[2][2],uint256[2],address,bytes32,address,bytes32)").slice(0, 10);

await executor.connect(governor).setSelectorAllowed(
    selector,
    true
);

// Revoke access
await executor.connect(governor).setTargetAllowed(
    compromisedContract,
    false
);
```

#### Emergency Pause

```solidity
// Emergency: pause all operations
await executor.connect(governor).pause();

// After fix: resume operations
await executor.connect(governor).unpause();
```

## Best Practices

### For Relayers

1. **Signature Verification**: Always verify signatures off-chain first
2. **Gas Monitoring**: Track gas costs and set limits
3. **Rate Limiting**: Implement rate limits per user
4. **Error Handling**: Log failures for debugging
5. **Nonce Tracking**: Cache nonces for efficiency

### For Frontend Developers

1. **Clear Messaging**: Inform users operations are gasless
2. **Signature Requests**: Clearly explain what user is signing
3. **Error Handling**: Handle backend failures gracefully
4. **Nonce Management**: Let backend handle nonce tracking
5. **Transaction Tracking**: Show pending/confirmed states

### For Governance

1. **Whitelist Carefully**: Only approve trusted contracts/functions
2. **Regular Audits**: Review whitelists periodically
3. **Revoke Quickly**: Remove compromised targets immediately
4. **Monitor Usage**: Track executor usage patterns
5. **Emergency Preparedness**: Have pause procedures ready

## Testing Strategy

### Unit Tests

- Target whitelist validation
- Selector whitelist validation
- Nonce increment and replay prevention
- Role-based access control
- Emergency pause functionality

### Integration Tests

- End-to-end gasless operations
- Multiple relayer scenarios
- Whitelist management
- Cross-contract execution
- Failure handling

### Security Tests

- Replay attack attempts
- Unauthorized target access attempts
- Unauthorized selector access attempts
- Role escalation attempts
- Whitelist manipulation attempts

## Deployment Checklist

### Pre-Deployment

- [ ] Identify target contracts for whitelisting
- [ ] Identify function selectors for whitelisting
- [ ] Prepare relayer infrastructure
- [ ] Set up backend signing
- [ ] Prepare governor address

### Deployment

- [ ] Deploy IntegraExecutor proxy
- [ ] Initialize with governor address
- [ ] Verify contract on block explorer
- [ ] Grant EXECUTOR_ROLE to relayer addresses
- [ ] Whitelist target contracts
- [ ] Whitelist function selectors

### Post-Deployment

- [ ] Test gasless operations end-to-end
- [ ] Set up monitoring and alerting
- [ ] Document whitelists
- [ ] Train relayer operators
- [ ] Create user guides
- [ ] Set up analytics dashboard

## Upgrade Path

### UUPS Upgradeable

IntegraExecutor is UUPS upgradeable:

**Upgrade Process**:
1. Deploy new implementation
2. Test on testnet
3. Audit new implementation
4. Governance proposal
5. Execute upgrade via governor
6. Verify functionality
7. Monitor for issues

**Upgrade Use Cases**:
- Gas optimizations
- New whitelist management features
- Bug fixes
- Security improvements

## Migration Guide

### Migration from V6

**Key Changes**:
- V6: Basic executor
- Current: Enhanced whitelist management, improved gas efficiency

**Migration Steps**:
1. Deploy executor
2. Migrate whitelists
3. Update backend to use current version
4. Update frontend to use current version
5. Test end-to-end
6. Deprecate V6 executor

## Resources

### Contract Documentation
- [IntegraExecutor](./IntegraExecutor.md)

### Related Layers
- [Layer 2: Document Identity Layer](../layer2/overview.md)
- [Layer 3: Tokenization Layer](../layer3/overview.md)
- [Layer 4: Communication Layer](../layer4/overview.md)

### External Resources
- [Meta-Transactions](https://eips.ethereum.org/EIPS/eip-2771)
- [EIP-712 Typed Data](https://eips.ethereum.org/EIPS/eip-712)
- [Gas Station Network](https://opengsn.org/)

## Version

**Current Version**: 1.0.0
**Solidity Version**: 0.8.28
**License**: MIT

## Support

- **Security Issues**: security@integra.io
- **Technical Support**: docs@integra.io
- **GitHub**: https://github.com/IntegraLedger/smart-contracts-evm-v7
