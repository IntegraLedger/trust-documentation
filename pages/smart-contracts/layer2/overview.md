# Layer 2: Document Identity Layer

## Overview

Layer 2 provides the core document identity and resolver composition infrastructure for Integra V7. This layer separates document identity from service composition, enabling flexible, extensible document management while maintaining immutable identity records.

## Architectural Philosophy

### Pure Identity Layer

The Document Registry maintains only the essential identity of each document:

- **Ownership**: Who owns the document
- **Identity**: Content hash, reference hash, and extension fields
- **Tokenization**: Associated tokenizer contract
- **Timestamps**: Registration and update times
- **Service Composition**: References to resolver contracts

### Resolver Composition Pattern

Services are accessed via resolver contracts, enabling:

- **Separation of Concerns**: Identity vs. functionality
- **Extensibility**: Add new services without upgrading core contracts
- **Flexibility**: Choose resolvers per document
- **Security**: Code hash verification prevents malicious upgrades

## Core Contracts

### IntegraDocumentRegistryV7_Immutable

The heart of Layer 2 - an immutable, pure document identity registry.

**Status**: Immutable (deployed once per chain, never upgraded)

**Key Features**:
- Pure identity storage (owner, hashes, timestamps)
- Resolver composition (primary + additional resolvers)
- Emergency multisig controls (time-limited to 6 months)
- Identity extension field (for ZK commitments, DIDs, cross-chain refs)
- Configurable gas limits for resolver calls
- Fee system with emergency circuit breaker

[View Full Documentation →](./document-registry)

### IntegraResolverRegistryV7_Immutable

Immutable registry for document resolver contracts with code integrity verification.

**Status**: Immutable (deployed once per chain, never upgraded)

**Key Features**:
- Code hash verification prevents resolver replacement attacks
- Active/inactive status tracking for lifecycle management
- Resolver metadata and type categorization
- Graceful degradation on code changes (returns address(0))

[View Full Documentation →](./resolver-registry)

### SimpleContactResolverV7

A communication resolver providing encrypted contact endpoint storage.

**Status**: UUPS Upgradeable (application layer)

**Key Features**:
- Encrypted URL storage (AES-256-GCM)
- Client-side decryption using keccak256(documentHash) as key
- Owner-controlled contact information
- IDocumentResolver interface implementation

[View Full Documentation →](./simple-contact-resolver)

## Resolver Pattern Deep Dive

### Primary vs Additional Resolvers

**Primary Resolver**:
- Critical services that must succeed
- Failure reverts the transaction
- Example: Compliance checks, payment validation
- One per document

**Additional Resolvers**:
- Optional services (best-effort execution)
- Failure logged but transaction continues
- Example: Communication endpoints, metadata providers
- Up to 10 per document

### Resolver Lifecycle

1. **Registration**: Governance registers resolver in ResolverRegistry with code hash
2. **Document Association**: Owner sets primary and/or additional resolvers for document
3. **Execution**: Registry calls resolver hooks during document operations
4. **Validation**: Registry verifies code hash matches before each call
5. **Graceful Degradation**: If code changes, resolver returns address(0)

### Code Hash Security

The resolver registry captures the code hash at registration and validates it on every retrieval:

```solidity
// At registration
bytes32 codeHash;
assembly {
    codeHash := extcodehash(resolver)
}
resolvers[resolverId].codeHash = codeHash;

// At retrieval
bytes32 currentHash;
assembly {
    currentHash := extcodehash(resolverAddr)
}
if (currentHash != info.codeHash) {
    return address(0); // Code changed - resolver may be compromised
}
```

This prevents malicious resolver upgrades from affecting existing documents.

## Emergency Controls

### Time-Limited Multisig Pattern

The Document Registry includes emergency controls that automatically expire:

**Duration**: 6 months from deployment

**Capabilities** (before expiry):
- Unlock locked resolver configurations
- Disable fee collection
- Both emergency address OR governance

**After Expiry**:
- Only governance has emergency powers
- Progressive decentralization milestone

**Immutability**:
- Emergency address set at deployment (cannot change)
- Expiry timestamp immutable
- Recommended: Use multisig wallet (Gnosis Safe)

### Emergency Justification Required

All emergency actions require a public justification string:

```solidity
function emergencyUnlockResolvers(
    bytes32 integraHash,
    string calldata justification
) external
```

This provides transparency and an audit trail for emergency actions.

## Identity Extension Field

### Purpose

A `bytes32` field reserved for future protocol extensions without requiring contract upgrades.

### Use Cases

1. **Zero-Knowledge Commitments**
   - Store ZK proof commitments
   - Enable privacy-preserving document verification
   - Link to off-chain ZK circuits

2. **Decentralized Identifiers (DIDs)**
   - Reference DID documents
   - Enable W3C DID standard integration
   - Support verifiable credentials

3. **Cross-Chain References**
   - Point to documents on other chains
   - Enable multi-chain document graphs
   - Support bridge protocols

4. **Protocol Upgrades**
   - Future functionality hooks
   - Backward compatibility markers
   - Version flags

### Example Usage

```solidity
// ZK commitment
bytes32 commitment = zkProver.generateCommitment(secretData);
documentRegistry.setIdentityExtension(integraHash, commitment);

// DID reference
bytes32 didHash = keccak256(abi.encodePacked("did:integra:", documentId));
documentRegistry.setIdentityExtension(integraHash, didHash);

// Cross-chain reference
bytes32 l2DocHash = keccak256(abi.encodePacked(chainId, l2IntegraHash));
documentRegistry.setIdentityExtension(integraHash, l2DocHash);
```

## Gas Limit Configuration

### Default Limits

- **Primary Resolver**: 200,000 gas (default)
- **Additional Resolver**: 100,000 gas (default)
- **Maximum Reasonable**: 30,000,000 gas (configurable per chain)

### Per-Resolver Overrides

Governance can set custom gas limits for specific resolvers:

```solidity
// High-complexity compliance resolver
documentRegistry.setResolverGasLimitOverride(complianceResolverId, 500_000);

// Lightweight communication resolver
documentRegistry.setResolverGasLimitOverride(contactResolverId, 50_000);
```

### Chain-Specific Configuration

Different chains have different block gas limits:

```solidity
// Ethereum/Polygon/Optimism/Base
documentRegistry.setMaxReasonableGasLimit(30_000_000);

// Arbitrum
documentRegistry.setMaxReasonableGasLimit(40_000_000);

// Future L2s
documentRegistry.setMaxReasonableGasLimit(chainSpecificLimit);
```

## Fee System

### Configuration

**Initial State**: Free registration (0 fee)

**Fee Bounds**:
- Minimum: 0 (always allows free option)
- Maximum: 0.01 ether (~$20-30)

**Fee Recipient**: Immutable (set at deployment, recommended: multisig)

### Governance Control

```solidity
// Set registration fee (bounded by MAX_REGISTRATION_FEE)
documentRegistry.setRegistrationFee(0.002 ether); // ~$4-5

// Emergency disable fees
documentRegistry.emergencyDisableFees("Critical UX issue affecting adoption");

// Re-enable fees (governance only)
documentRegistry.reenableFees();
```

### Fee Collection Flow

1. **Validation**: Check if fee is required (amount > 0 and not disabled)
2. **Payment Check**: Ensure msg.value >= required fee
3. **Transfer**: Immediately transfer fee to recipient (no accumulation)
4. **Refund**: Return excess to sender
5. **Accounting**: Update totalFeesCollected
6. **Event**: Emit FeeCollected event

### Security Properties

- **Immediate Transfer**: No balance accumulation (prevents fund extraction)
- **CEI Pattern**: Effects before interactions (reentrancy protection)
- **Refund Handling**: Excess returned to sender
- **Emergency Circuit Breaker**: Can be disabled if needed

## Document Executor Pattern

### Purpose

Allows document owners to authorize a contract or EOA to perform operations on their behalf.

### Use Cases

1. **Gas Abstraction**
   - Frontend users authorize Integra backend
   - Backend pays gas, maintains user privacy
   - Ephemeral wallet pattern

2. **DAO Governance**
   - DAO controls document operations
   - Multi-sig execution
   - Proposal-based actions

3. **Escrow & Automation**
   - Time-locked releases
   - Conditional transfers
   - Automated workflows

### Authorization Model

```solidity
// Owner authorizes executor
documentRegistry.authorizeDocumentExecutor(integraHash, executorAddress);

// Executor performs actions
documentRegistry.transferDocumentOwnership(integraHash, newOwner, "Sale");

// Owner can revoke anytime
documentRegistry.revokeDocumentExecutor(integraHash);

// Atomic replacement (no gap)
documentRegistry.replaceDocumentExecutor(integraHash, newExecutor);
```

### Validation Logic

**Whitelist-First Approach** (optimized for Integra's backend):

1. **If whitelisted** → Pass immediately (fastest, ~2,100 gas)
2. **Else if contract** → Validate IIntegraExecutor interface (~14,700 gas)
3. **Else (EOA)** → Pass (self-hosted instances, ~4,700 gas)

### Batch Operations

```solidity
// Authorize executor for 50 documents in one transaction
documentRegistry.authorizeDocumentExecutorBatch(integraHashes, executor);

// Revoke executor for multiple documents
documentRegistry.revokeDocumentExecutorBatch(integraHashes);
```

## Batch Operations

### Design Philosophy

**Enterprise-Scale Onboarding**: Support registering thousands of documents efficiently.

### Available Batch Operations

**Registration**:
```solidity
registerDocumentBatch(
    integraHashes,
    documentHashes,
    identityExtensions,
    tokenizers,
    primaryResolverIds,
    executor,
    processHashes,
    callResolverHooks
)
```

**Resolver Configuration**:
```solidity
setPrimaryResolverBatch(integraHashes, resolverId);
```

**Executor Management**:
```solidity
authorizeDocumentExecutorBatch(integraHashes, executor);
revokeDocumentExecutorBatch(integraHashes);
```

**Queries**:
```solidity
getDocumentsBatch(integraHashes);
existsBatch(integraHashes);
getDocumentOwnersBatch(integraHashes);
getDocumentExecutorsBatch(integraHashes);
```

### Gas Savings

- **Individual**: 170k gas × 50 = 8.5M gas
- **Batch**: ~950k gas (with resolver hooks: ~1.05M)
- **Savings**: 90% gas reduction

### Restrictions

Batch registration has specific restrictions for safety and gas predictability:

- **No Reference Proofs**: Prevents gas bombs from ZK verification
- **Same Executor**: All documents share one executor (or none)
- **Validated Resolvers**: All primary resolvers validated before batch starts
- **Max Batch Size**: 50 documents per transaction

## Integration Examples

### Basic Document Registration

```solidity
// Register document with primary resolver
bytes32 integraHash = documentRegistry.registerDocument(
    integraHash,
    documentHash,
    identityExtension,
    referenceHash,
    referenceProofA,
    referenceProofB,
    referenceProofC,
    tokenizer,
    primaryResolverId,
    authorizedExecutor,
    processHash
);
```

### Set Contact Information

```solidity
// Owner encrypts contact URL
string memory encrypted = encryptAES256GCM(
    "https://integra.io/contact/doc123",
    keccak256(documentHash)
);

// Set in contact resolver
SimpleContactResolverV7(contactResolver).setContactURL(
    integraHash,
    encrypted
);

// Anyone can retrieve and decrypt
string memory encryptedEndpoint = IDocumentResolver(contactResolver)
    .getContactEndpoint(integraHash, msg.sender, "url");
string memory url = decryptAES256GCM(
    encryptedEndpoint,
    keccak256(documentHash)
);
```

### Resolver Composition

```solidity
// Set primary resolver (compliance checks)
documentRegistry.setPrimaryResolver(integraHash, complianceResolverId);

// Add additional resolvers
documentRegistry.addAdditionalResolver(integraHash, contactResolverId);
documentRegistry.addAdditionalResolver(integraHash, lifecycleResolverId);

// Lock configuration (immutable)
documentRegistry.lockResolvers(integraHash);
```

### Emergency Unlock (Time-Limited)

```solidity
// Before 6 months: Emergency address OR governance can unlock
documentRegistry.emergencyUnlockResolvers(
    integraHash,
    "Critical security issue with resolver contract"
);

// After 6 months: Only governance
// emergencyAddress loses powers (progressive decentralization)
```

## Security Considerations

### Immutability Trade-offs

**Benefits**:
- No upgrade attacks
- Permanent infrastructure
- Predictable behavior
- Reduced governance risk

**Mitigations for Bugs**:
- Emergency pause (governance)
- Emergency fee disable (6 months)
- Resolver unlock (6 months)
- Graceful degradation (resolver code hash check)

### Access Control Layers

1. **Document Owner**: Full control over their documents
2. **Authorized Executor**: Limited delegation by owner
3. **Emergency Address**: Time-limited emergency powers (6 months)
4. **Governance**: Long-term protocol administration
5. **Resolver Registry**: Code integrity validation

### Attack Vectors & Mitigations

**Malicious Resolver**:
- Mitigation: Code hash verification on every call
- Mitigation: Owner can lock resolver configuration
- Mitigation: Governance can deactivate resolvers

**Fee Manipulation**:
- Mitigation: MAX_REGISTRATION_FEE constant (0.01 ether)
- Mitigation: Emergency fee disable circuit breaker
- Mitigation: Immutable fee recipient

**Gas Griefing**:
- Mitigation: Configurable gas limits per resolver
- Mitigation: MAX_REASONABLE_GAS_LIMIT validation
- Mitigation: Primary resolver failures revert (prevents wasted gas)

**Executor Abuse**:
- Mitigation: Owner can revoke anytime
- Mitigation: Interface validation for non-whitelisted contracts
- Mitigation: Owner cannot authorize themselves

## Best Practices

### For Document Owners

1. **Resolver Selection**: Choose resolvers carefully, verify code before locking
2. **Executor Authorization**: Only authorize trusted executors, revoke when done
3. **Identity Extension**: Plan usage before setting (immutable per-document)
4. **Lock Consideration**: Only lock resolvers if truly permanent

### For Resolver Developers

1. **Interface Compliance**: Implement all IDocumentResolver methods
2. **Gas Efficiency**: Keep resolver logic lightweight
3. **Graceful Failures**: Additional resolvers should handle failures gracefully
4. **Documentation**: Provide clear documentation for resolver functionality

### For Governance

1. **Resolver Approval**: Audit resolvers before registration
2. **Fee Setting**: Start at 0, increase gradually based on adoption
3. **Emergency Use**: Only use emergency powers when absolutely necessary
4. **Gas Limits**: Set appropriate defaults and overrides per resolver

### For Integrators

1. **Batch Operations**: Use batch functions for multi-document operations
2. **Error Handling**: Check resolver availability (address(0) handling)
3. **Gas Estimation**: Account for resolver gas consumption
4. **Event Monitoring**: Subscribe to registry events for state changes

## Testing & Verification

### Formal Verification (Certora)

The Document Registry undergoes formal verification to prove:

1. **Ownership Integrity**: Only owners can transfer their documents
2. **Executor Authorization**: Executors cannot exceed their permissions
3. **Fee Bounds**: Fees always within [0, MAX_REGISTRATION_FEE]
4. **Emergency Expiry**: Emergency powers expire after 6 months
5. **Resolver Lock**: Locked resolvers cannot be modified (except emergency)

### Test Coverage

- Unit tests: >95% coverage
- Integration tests: Multi-contract flows
- Gas optimization tests: Batch vs individual operations
- Emergency scenario tests: Unlock, fee disable, etc.
- Upgrade tests: UUPS proxy functionality (for resolvers)

## Deployment Checklist

### Pre-Deployment

- [ ] Deploy IntegraVerifierRegistryV7_Immutable (Layer 0 dependency)
- [ ] Deploy IntegraResolverRegistryV7_Immutable
- [ ] Prepare emergency multisig address (Gnosis Safe recommended)
- [ ] Prepare fee recipient multisig address (immutable)
- [ ] Determine initial registration fee (recommend: 0)
- [ ] Configure max reasonable gas limit for target chain

### Deployment

- [ ] Deploy IntegraDocumentRegistryV7_Immutable with validated parameters
- [ ] Verify contract on block explorer
- [ ] Deploy SimpleContactResolverV7 proxy
- [ ] Initialize SimpleContactResolverV7 with registry address

### Post-Deployment

- [ ] Register SimpleContactResolverV7 in ResolverRegistry
- [ ] Approve initial tokenizers via governance
- [ ] Approve Integra backend executor (if applicable)
- [ ] Set resolver gas limit overrides (if needed)
- [ ] Configure monitoring and alerting
- [ ] Document deployment addresses in registry

## Upgrade Path

### Immutable Contracts (Never Upgraded)

- IntegraDocumentRegistryV7_Immutable
- IntegraResolverRegistryV7_Immutable

These contracts are deployed once and never upgraded. Bugs are handled via:
- Emergency pause
- Resolver deactivation
- New resolver deployment

### Upgradeable Contracts (UUPS)

- SimpleContactResolverV7

Upgrade process:
1. Deploy new implementation
2. Test on testnet
3. Audit new implementation
4. Governance proposal
5. Execute upgrade via governor
6. Verify functionality
7. Monitor for issues

## Resources

- [IntegraDocumentRegistryV7_Immutable Documentation](./document-registry)
- [IntegraResolverRegistryV7_Immutable Documentation](./resolver-registry)
- [SimpleContactResolverV7 Documentation](./simple-contact-resolver)
- [IDocumentResolver Interface](./interfaces/document-resolver)
- [IIntegraExecutor Interface](./interfaces/integra-executor)
- [Layer 2 Integration Guide](../guides/layer2-integration)
- [Resolver Development Guide](../guides/resolver-development)

## Version

**Current Version**: V7.0.0
**Solidity Version**: 0.8.28
**License**: MIT

## Support

- **Security Issues**: security@integra.io
- **Technical Support**: docs@integra.io
- **GitHub**: https://github.com/IntegraLedger/smart-contracts-evm-v7
