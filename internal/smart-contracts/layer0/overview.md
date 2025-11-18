# Layer 0: Foundation Layer Overview

## Purpose

Layer 0 provides the foundational infrastructure for the Integra V7 smart contract system. This layer establishes immutable capability definitions, provider registries, and attestation-based access control that all higher layers depend on.

## Architecture Philosophy

Layer 0 follows a **progressive ossification** strategy:

- **Immutable Components**: Capability namespace and registries are deployed once and never upgraded
- **Upgradeable Components**: Access control contracts can be upgraded during governance transition, then ossified
- **Separation of Concerns**: Routing logic separated from authorization logic through provider abstraction

## Layer Components

### 1. Immutable Contracts (Deploy Once, Never Upgrade)

#### CapabilityNamespaceV7_Immutable
- **Purpose**: Defines permanent capability bit positions (0-255)
- **Why Immutable**: Capability meanings must never change across time or contracts
- **Key Feature**: Organized 256-bit namespace with role templates

#### AttestationProviderRegistryV7_Immutable
- **Purpose**: Registry for attestation providers (EAS, VC, ZK, DIDs)
- **Why Immutable**: Provider references must remain valid forever
- **Key Feature**: Code hash validation prevents malicious provider upgrades

#### IntegraVerifierRegistryV7_Immutable
- **Purpose**: Registry for ZK proof verifiers
- **Why Immutable**: Verifier references must remain valid forever
- **Key Feature**: Code hash validation for verifier integrity

### 2. Upgradeable Contracts (Ossify After Governance Transition)

#### AttestationAccessControlV7
- **Purpose**: Abstract base for attestation-based access control
- **Upgrade Path**: BOOTSTRAP → MULTISIG → DAO → OSSIFIED
- **Key Feature**: Provider-agnostic verification with immutable registry references

#### EASAttestationProviderV7
- **Purpose**: EAS implementation of IAttestationProvider
- **Upgrade Path**: UUPS upgradeable during governance transition
- **Key Feature**: 13-step verification with cross-chain replay prevention

### 3. Interfaces

#### IAttestationProvider
- **Purpose**: Standard interface for all attestation providers
- **Design**: Minimal, provider-agnostic capability verification
- **Extensibility**: Supports multiple attestation systems without contract changes

## How Contracts Work Together

### Verification Flow

```
1. User calls function with attestation proof
                ↓
2. AttestationAccessControlV7 (routing layer)
   - Gets provider ID (document-specific or default)
   - Looks up provider in AttestationProviderRegistryV7_Immutable
   - Provider registry validates code hash (security check)
                ↓
3. Provider Implementation (authorization layer)
   - EASAttestationProviderV7 decodes proof
   - Runs 13-step verification process
   - Returns (verified, capabilities)
                ↓
4. CapabilityNamespaceV7_Immutable (capability check)
   - hasCapability(granted, required)
   - Admin override if CORE_ADMIN set
                ↓
5. Function executes if all checks pass
```

### Architectural Layers

```
┌─────────────────────────────────────────────────┐
│  Layer 1+ (Documents, Tokens, etc.)             │
│  - Inherits AttestationAccessControlV7         │
│  - Uses requiresCapability modifier             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  AttestationAccessControlV7 (Routing)           │
│  - Provider selection logic                     │
│  - Capability verification orchestration        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  AttestationProviderRegistryV7 (Security)       │
│  - Provider lookup with code hash validation    │
│  - Returns address(0) if compromised            │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  IAttestationProvider Implementation (Auth)     │
│  - EASAttestationProviderV7                     │
│  - VCAttestationProvider (future)               │
│  - ZKAttestationProvider (future)               │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  CapabilityNamespaceV7 (Definitions)            │
│  - Permanent capability bit positions           │
│  - Role templates (VIEWER, PARTICIPANT, etc.)   │
└─────────────────────────────────────────────────┘
```

## Security Model

### Defense in Depth

1. **Code Hash Validation**
   - Registries capture code hash at registration
   - getProvider()/getVerifier() validates hash before returning
   - Returns address(0) if code changed (graceful degradation)

2. **Immutable References**
   - AttestationAccessControlV7 stores immutable references to registries
   - Capability namespace never changes after deployment
   - Provider code hash validation always works

3. **Provider Isolation**
   - Each provider implements standard IAttestationProvider interface
   - Provider handles all authorization logic (issuer validation, etc.)
   - Base contract only handles routing and capability checking

4. **Reentrancy Protection**
   - All functions using requiresCapability MUST use nonReentrant
   - External calls to providers isolated in verification flow
   - State changes happen after verification

5. **Progressive Ossification**
   - Governance transitions: BOOTSTRAP → MULTISIG → DAO → OSSIFIED
   - Upgrade authority transfers through secure handoffs
   - Final ossification makes contracts immutable forever

### Threat Model

#### Prevented Attacks

| Attack | Prevention Mechanism |
|--------|---------------------|
| Malicious provider upgrade | Code hash validation in registry |
| Cross-chain replay | Chain ID embedded in attestations |
| Provider spoofing | EAS contract address validation |
| Contract spoofing | Document contract address validation |
| Front-running | Recipient binding in attestations |
| Capability confusion | Immutable namespace with permanent bit positions |
| Governance takeover | Multi-stage transition with role revocation |

#### Graceful Degradation

- Provider code change → returns address(0) → caller can use fallback or revert
- Provider deactivated → returns address(0) → system continues with other providers
- Provider missing → returns address(0) → clear error handling in caller

## Governance Timeline (24 Months)

### Month 0-6: BOOTSTRAP Stage
- **Authority**: Team multisig
- **Purpose**: Rapid iteration and bug fixes
- **Capabilities**: Full upgrade authority, provider management
- **Security**: Code audits, formal verification

### Month 6-12: MULTISIG Stage
- **Authority**: 3-of-5 guardian multisig
- **Purpose**: Distributed control with experienced operators
- **Capabilities**: Upgrade authority, emergency pause
- **Security**: Guardian vetting, time-locked upgrades

### Month 12-24: DAO Stage
- **Authority**: Community DAO governance
- **Purpose**: Full decentralization
- **Capabilities**: Upgrade authority via proposals
- **Security**: Vote thresholds, proposal delays

### Month 24+: OSSIFIED Stage
- **Authority**: None (contract frozen)
- **Purpose**: Permanent infrastructure
- **Capabilities**: No upgrades possible
- **Security**: Mathematical certainty of behavior

## Design Patterns

### 1. Provider Pattern
- Abstraction layer for different attestation systems
- Providers implement IAttestationProvider interface
- Registry manages provider lifecycle with code hash validation

### 2. Immutable References
- Upgradeable contracts store immutable references to critical infrastructure
- Ensures core security model remains intact during upgrades
- References set at initialization, cannot change

### 3. Graceful Degradation
- Registry functions return address(0) instead of reverting
- Callers decide whether to revert or use fallback
- Prevents DOS if provider/verifier changes

### 4. Capability Bitmask
- 256-bit organized namespace for permissions
- Bitwise operations for efficient checking
- Admin override (bit 7) for all capabilities

### 5. Progressive Ossification
- Planned path from centralized to immutable
- Multi-stage governance transitions
- Final freeze ensures permanent infrastructure

## Integration Guide

### For Contract Developers

1. **Inherit AttestationAccessControlV7**
   ```solidity
   contract MyContract is AttestationAccessControlV7 {
       function initialize(
           address namespace,
           address providerRegistry,
           bytes32 defaultProvider,
           address governor
       ) external initializer {
           __AttestationAccessControl_init(
               namespace,
               providerRegistry,
               defaultProvider,
               governor
           );
       }
   }
   ```

2. **Use Capability Modifiers**
   ```solidity
   function claimToken(bytes32 documentHash, bytes32 easUID)
       external
       requiresCapabilityWithUID(documentHash, NAMESPACE.CORE_CLAIM(), easUID)
       nonReentrant
   {
       // Function logic
   }
   ```

3. **Reference Capability Namespace**
   ```solidity
   uint256 requiredCaps = NAMESPACE.CORE_CLAIM() | NAMESPACE.CORE_TRANSFER();
   ```

### For Provider Developers

1. **Implement IAttestationProvider**
   ```solidity
   contract MyProvider is IAttestationProvider {
       function verifyCapabilities(
           bytes calldata proof,
           address recipient,
           bytes32 documentHash,
           uint256 requiredCapability
       ) external view returns (bool verified, uint256 grantedCapabilities) {
           // Provider-specific verification
       }
   }
   ```

2. **Register Provider**
   ```solidity
   providerRegistry.registerProvider(
       providerId,
       address(myProvider),
       "MyProviderType",
       "My Custom Provider V1"
   );
   ```

### For Governance

1. **Set Default Provider**
   ```solidity
   attestationControl.setDefaultProvider(providerId);
   ```

2. **Override Provider for Document**
   ```solidity
   attestationControl.setDocumentProvider(documentHash, providerId);
   ```

3. **Deactivate Compromised Provider**
   ```solidity
   providerRegistry.deactivateProvider(providerId, "Security concern");
   ```

## Gas Optimization

### Efficient Patterns

1. **Bitwise Operations**: Capabilities use bitwise AND/OR (constant gas)
2. **Admin Check First**: CORE_ADMIN check before capability check (early exit)
3. **Storage Packing**: Provider info structs packed efficiently
4. **View Functions**: Namespace utility functions are pure (no state reads)
5. **Batch Operations**: Registry supports batch provider registration

### Gas Costs (Approximate)

| Operation | Gas Cost | Notes |
|-----------|----------|-------|
| hasCapability() | ~500 | Pure function, bitwise ops only |
| getProvider() | ~5,000 | Storage read + code hash check |
| verifyCapabilities() | ~50,000-100,000 | Depends on provider implementation |
| registerProvider() | ~100,000 | One-time cost per provider |

## Testing Strategy

### Unit Tests
- Capability namespace bit operations
- Provider registry code hash validation
- Access control verification flow
- Governance stage transitions

### Integration Tests
- End-to-end verification with real attestations
- Multi-provider scenarios
- Graceful degradation cases
- Reentrancy protection

### Formal Verification
- Capability bitmask operations are sound
- Code hash validation cannot be bypassed
- Governance transitions are one-way
- No overflow in capability composition

## Migration Guide

### From V6 to V7

**Key Changes**:
- V6: Hard-coded EAS verification
- V7: Provider abstraction with multiple attestation systems

**Migration Steps**:
1. Deploy immutable contracts (namespace, registries)
2. Deploy EAS provider with V7 schema
3. Deploy access control with references to immutable contracts
4. Register EAS provider in registry
5. Set default provider
6. Migrate existing attestations to V7 schema

**Backward Compatibility**:
- V7 schema is superset of V6 schema
- Existing V6 attestations can be wrapped
- Gradual migration supported

## References

### Related Documentation
- [CapabilityNamespaceV7_Immutable](./CapabilityNamespaceV7_Immutable.md)
- [AttestationProviderRegistryV7_Immutable](./AttestationProviderRegistryV7_Immutable.md)
- [IntegraVerifierRegistryV7_Immutable](./IntegraVerifierRegistryV7_Immutable.md)
- [AttestationAccessControlV7](./AttestationAccessControlV7.md)
- [EASAttestationProviderV7](./EASAttestationProviderV7.md)
- [IAttestationProvider](./IAttestationProvider.md)

### External Resources
- [EAS Documentation](https://docs.attest.sh/)
- [OpenZeppelin UUPS Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable)
- [OpenZeppelin Access Control](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControl)
