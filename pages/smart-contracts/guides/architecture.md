# Integra V7 Architecture Deep Dive

Complete architectural overview of Integra V7 smart contract system.

## Table of Contents

- [Overview](#overview)
- [Three-Tier Architecture](#three-tier-architecture)
- [Layer Dependencies and Relationships](#layer-dependencies-and-relationships)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Security Model](#security-model)
- [Upgradeability Strategy](#upgradeability-strategy)
- [Progressive Ossification Timeline](#progressive-ossification-timeline)
- [Design Decisions and Rationale](#design-decisions-and-rationale)

## Overview

Integra V7 implements a sophisticated three-tier architecture designed for permanence, security, and flexibility. The system separates concerns across immutable infrastructure, ossifiable foundations, and upgradeable application layers.

### Architectural Principles

#### 永久 (Permanent)
Immutable foundation contracts that form the bedrock of the protocol, deployed once per chain and never upgraded.

#### 優雅 (Elegant)
Beautiful, auditable code following industry best practices with comprehensive NatSpec documentation.

#### 信頼 (Trusted)
Precedent-backed patterns from battle-tested protocols, with formal verification for critical components.

#### 進化 (Evolving)
Ossifiable core with upgradeable service layer, enabling protocol evolution while maintaining security.

## Three-Tier Architecture

### Tier 1: The Immutable Quad

**Purpose**: Permanent foundation that never changes

**Contracts**:
1. CapabilityNamespaceV7_Immutable
2. AttestationProviderRegistryV7_Immutable
3. IntegraVerifierRegistryV7_Immutable
4. IntegraResolverRegistryV7_Immutable

**Characteristics**:
- Deployed once per chain
- No upgrade mechanism
- Pure functions and immutable storage
- Code hash verification for security
- Formal verification required

**Rationale**: These contracts define the permanent rules of the system. Capability bit positions, registry logic, and verification patterns must never change to ensure consistency across time and contracts.

### Tier 2: Ossifiable Foundation

**Purpose**: Contracts that evolve with governance, then freeze

**Contracts**:
1. AttestationAccessControlV7 (UUPS upgradeable → Ossified)
2. IntegraDocumentRegistryV7_Immutable (immutable but with time-limited emergency controls)

**Characteristics**:
- UUPS proxy pattern
- Progressive governance evolution
- 24-month ossification timeline
- Time-limited emergency powers
- Storage gap management

**Rationale**: These contracts need flexibility during early stages but should eventually become immutable. Progressive ossification provides a clear path to decentralization and permanence.

### Tier 3: Application Layer

**Purpose**: Continuously upgradeable services

**Contracts**:
1. EASAttestationProviderV7 (attestation provider implementation)
2. SimpleContactResolverV7 (communication resolver)
3. 11 Tokenizer contracts (document tokenization)
4. IntegraMessageV7 (messaging)
5. IntegraSignalV7 (payment requests)
6. IntegraExecutorV7 (gasless execution)

**Characteristics**:
- UUPS proxy pattern
- Continuous upgradeability
- Feature additions without migration
- Governor-controlled upgrades
- Storage gap preservation

**Rationale**: Application features need to evolve based on user needs and market conditions. Upgradeability enables innovation while maintaining backward compatibility.

## Layer Dependencies and Relationships

### Dependency Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                        Layer 6: Execution                       │
│                      IntegraExecutorV7                          │
│                   (Gasless operations relay)                    │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Layer 4: Communication                      │
│           IntegraMessageV7, IntegraSignalV7                     │
│                  (Messaging & signaling)                        │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Layer 3: Tokenization                       │
│          OwnershipTokenizerV7, MultiPartyTokenizerV7            │
│     SharesTokenizerV7, RoyaltyTokenizerV7, etc. (11 total)      │
│              (Document → Token transformation)                  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Layer 2: Document Layer                      │
│         IntegraDocumentRegistryV7_Immutable                     │
│         IntegraResolverRegistryV7_Immutable                     │
│             SimpleContactResolverV7                             │
│            (Document identity & resolvers)                      │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Layer 0: Foundation                         │
│         CapabilityNamespaceV7_Immutable                         │
│         AttestationProviderRegistryV7_Immutable                 │
│         IntegraVerifierRegistryV7_Immutable                     │
│         AttestationAccessControlV7                              │
│         EASAttestationProviderV7                                │
│     (Attestation & capability framework)                        │
└─────────────────────────────────────────────────────────────────┘
```

### Cross-Layer Interactions

#### Layer 0 → All Layers
All contracts inherit or reference Layer 0 for:
- Capability definitions (CapabilityNamespaceV7)
- Attestation verification (AttestationAccessControlV7)
- Provider lookup (AttestationProviderRegistryV7)

#### Layer 2 → Layer 3
Tokenizers reference Document Registry for:
- Document ownership verification
- Tokenizer assignment validation
- Executor authorization checks

#### Layer 3 → Layer 4
Communication contracts reference tokenizers for:
- Token holder verification
- Multi-party coordination
- Workflow state tracking

#### Layer 4 → Layer 6
Executor contracts coordinate with:
- Messages for notification
- Signals for payment requests
- Meta-transaction relay

## Data Flow Diagrams

### Document Registration Flow

```
┌──────────────┐
│     User     │
└──────┬───────┘
       │
       │ 1. registerDocument(...)
       ↓
┌─────────────────────────────────────────┐
│  IntegraDocumentRegistryV7_Immutable    │
│                                         │
│  ┌────────────────────────────────┐    │
│  │ 1. Validate inputs             │    │
│  │ 2. Check document doesn't exist│    │
│  │ 3. Verify tokenizer valid      │    │
│  │ 4. Store document record       │    │
│  └────────────┬───────────────────┘    │
│               │                         │
│               │ 5. Call resolver hooks? │
│               ↓                         │
│  ┌────────────────────────────────┐    │
│  │ If primaryResolverId set:      │    │
│  │ - Get resolver from registry   │───┼──→ IntegraResolverRegistryV7
│  │ - Validate code hash           │    │   (Code integrity check)
│  │ - Call onDocumentRegistered()  │    │
│  └────────────┬───────────────────┘    │
│               │                         │
│               │ 6. Emit event           │
│               ↓                         │
│  ┌────────────────────────────────┐    │
│  │ DocumentRegistered event       │    │
│  │ - integraHash                  │    │
│  │ - owner                        │    │
│  │ - documentHash                 │    │
│  │ - tokenizer                    │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Token Claim Flow

```
┌──────────────┐
│  Claimant    │
└──────┬───────┘
       │
       │ 1. claimToken(integraHash, tokenId, attestationUID, processHash)
       ↓
┌────────────────────────────────────────────────────────┐
│              OwnershipTokenizerV7                      │
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │ requireOwnerOrExecutor modifier              │    │
│  │ - Verify document uses this tokenizer        │────┼──→ DocumentRegistry
│  │ - Check msg.sender is owner or executor      │    │    getTokenizer()
│  └──────────────┬───────────────────────────────┘    │
│                 │                                     │
│                 │ 2. Access control passed            │
│                 ↓                                     │
│  ┌──────────────────────────────────────────────┐    │
│  │ requiresCapabilityWithUID modifier           │    │
│  │ - Get provider from registry                 │────┼──→ ProviderRegistry
│  │ - Verify attestation via provider            │    │    getProvider()
│  │ - Check CORE_CLAIM capability                │    │
│  └──────────────┬───────────────────────────────┘    │
│                 │                                     │
│                 ↓                                     │
│         ┌───────────────┐                             │
│         │ EASProvider   │←────────────────────────────┼─── Provider verification
│         │ 13-step check │                             │    (external call)
│         └───────┬───────┘                             │
│                 │                                     │
│                 │ 3. Capability verified              │
│                 ↓                                     │
│  ┌──────────────────────────────────────────────┐    │
│  │ Internal claim logic                         │    │
│  │ - Verify token is reserved                   │    │
│  │ - Check recipient matches (if named)         │    │
│  │ - Mint NFT to claimant                       │    │
│  │ - Delete reservation                         │    │
│  │ - Handle trust credentials (if enabled)      │    │
│  └──────────────┬───────────────────────────────┘    │
│                 │                                     │
│                 │ 4. Trust graph integration?         │
│                 ↓                                     │
│  ┌──────────────────────────────────────────────┐    │
│  │ _handleTrustCredential()                     │    │
│  │ - Track party in documentParties mapping     │    │
│  │ - Check if document complete                 │    │
│  │ - If complete: issue credentials to all      │────┼──→ EAS Contract
│  └──────────────┬───────────────────────────────┘    │    attest()
│                 │                                     │
│                 │ 5. Emit events                      │
│                 ↓                                     │
│  ┌──────────────────────────────────────────────┐    │
│  │ TokenClaimed event                           │    │
│  │ TrustCredentialIssued event (if applicable)  │    │
│  └──────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────┘
```

### Attestation Verification Flow

```
┌───────────────────────────────────────────────┐
│         requiresCapability modifier           │
└────────────────┬──────────────────────────────┘
                 │
                 │ 1. Get provider for document
                 ↓
┌────────────────────────────────────────────────┐
│      AttestationAccessControlV7                │
│                                                │
│  documentProvider[integraHash] set?            │
│    ├─ Yes: Use document-specific provider      │
│    └─ No:  Use default provider                │
└────────────────┬───────────────────────────────┘
                 │
                 │ 2. Lookup provider
                 ↓
┌────────────────────────────────────────────────┐
│   AttestationProviderRegistryV7_Immutable      │
│                                                │
│  ┌──────────────────────────────────────┐     │
│  │ getProvider(providerId)              │     │
│  │ 1. Load provider info from storage   │     │
│  │ 2. Check if active                   │     │
│  │ 3. Verify code hash matches          │     │
│  │ 4. Return address or address(0)      │     │
│  └──────────────┬───────────────────────┘     │
└─────────────────┼──────────────────────────────┘
                  │
                  │ 3. Call provider
                  ↓
┌─────────────────────────────────────────────────┐
│         EASAttestationProviderV7                │
│                                                 │
│  verifyCapabilities(proof, recipient, ...)     │
│                                                 │
│  ┌───────────────────────────────────────┐     │
│  │ Step 1: Decode proof to get UID       │     │
│  └────────────────┬──────────────────────┘     │
│                   ↓                             │
│  ┌───────────────────────────────────────┐     │
│  │ Step 2: Fetch attestation from EAS    │─────┼──→ EAS Contract
│  └────────────────┬──────────────────────┘     │    getAttestation()
│                   ↓                             │
│  ┌───────────────────────────────────────┐     │
│  │ Step 3: Verify attestation exists     │     │
│  │ Step 4: Verify not revoked             │     │
│  │ Step 5: Verify not expired             │     │
│  │ Step 6: Verify schema matches          │     │
│  │ Step 7: Verify recipient matches       │     │ ← FRONT-RUNNING PROTECTION
│  │ Step 8: Verify attester authorized     │     │
│  │ Step 9: Verify source chain ID         │     │
│  │ Step 10: Verify source EAS contract    │     │
│  │ Step 11: Verify document contract      │     │
│  │ Step 12: Verify schema version         │     │
│  │ Step 13: Verify document hash          │     │
│  └────────────────┬──────────────────────┘     │
│                   │                             │
│                   │ Return (verified, caps)     │
│                   ↓                             │
│  ┌───────────────────────────────────────┐     │
│  │ Decode attestation data               │     │
│  │ Extract granted capabilities          │     │
│  │ Return (true, capabilities)           │     │
│  └───────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
                   │
                   │ 4. Check capabilities
                   ↓
┌─────────────────────────────────────────────────┐
│       CapabilityNamespaceV7_Immutable           │
│                                                 │
│  hasCapability(granted, required)               │
│                                                 │
│  ┌───────────────────────────────────────┐     │
│  │ If (granted & CORE_ADMIN) != 0:       │     │
│  │   return true (admin override)        │     │
│  │                                       │     │
│  │ If (granted & required) == required:  │     │
│  │   return true (has capability)        │     │
│  │                                       │     │
│  │ Otherwise:                            │     │
│  │   return false (no capability)        │     │
│  └───────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
                   │
                   │ 5. Require passes or reverts
                   ↓
┌─────────────────────────────────────────────────┐
│           Function execution proceeds           │
└─────────────────────────────────────────────────┘
```

### Resolver Composition Flow

```
┌──────────────────────────────────────────────────┐
│     Document Registration with Resolver          │
└──────────────────┬───────────────────────────────┘
                   │
                   │ registerDocument(..., primaryResolverId, ...)
                   ↓
┌──────────────────────────────────────────────────────────┐
│          IntegraDocumentRegistryV7_Immutable             │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │ _callPrimaryResolverHook(integraHash)          │     │
│  │                                                │     │
│  │ 1. Get resolver from registry                 │─────┼─→ ResolverRegistry
│  │    address = registry.getResolver(id)         │     │   getResolver()
│  │                                                │     │   └─ Validates code hash
│  │ 2. If address == address(0):                  │     │      Returns address(0) if changed
│  │      emit ResolverUnavailable()               │     │
│  │      return                                   │     │
│  │                                                │     │
│  │ 3. Get gas limit for resolver                 │     │
│  │    limit = resolverGasLimitOverride[id]       │     │
│  │    if limit == 0:                             │     │
│  │      limit = DEFAULT_PRIMARY_RESOLVER_GAS     │     │
│  │                                                │     │
│  │ 4. Call resolver with gas limit               │     │
│  │    try resolver.onDocumentRegistered{gas}()   │─────┼─→ Primary Resolver
│  │    catch: revert (primary must succeed)       │     │   onDocumentRegistered()
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │ _callAdditionalResolverHooks(integraHash)      │     │
│  │                                                │     │
│  │ For each additional resolver:                 │     │
│  │                                                │     │
│  │ 1. Get resolver from registry                 │─────┼─→ ResolverRegistry
│  │    address = registry.getResolver(id)         │     │   getResolver()
│  │                                                │     │
│  │ 2. If address == address(0):                  │     │
│  │      emit ResolverUnavailable()               │     │
│  │      continue (skip this resolver)            │     │
│  │                                                │     │
│  │ 3. Get gas limit for resolver                 │     │
│  │    limit = resolverGasLimitOverride[id]       │     │
│  │    if limit == 0:                             │     │
│  │      limit = DEFAULT_ADDITIONAL_RESOLVER_GAS  │     │
│  │                                                │     │
│  │ 4. Call resolver with gas limit               │     │
│  │    try resolver.onDocumentRegistered{gas}()   │─────┼─→ Additional Resolver
│  │    catch Error(reason):                       │     │   onDocumentRegistered()
│  │      emit ResolverHookFailed(id, reason)      │     │
│  │      continue (don't revert)                  │     │
│  │    catch:                                     │     │
│  │      emit ResolverHookFailed(id, "Unknown")   │     │
│  │      continue (don't revert)                  │     │
│  └────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘

Key Differences:
- Primary resolver: Failure reverts transaction
- Additional resolvers: Failures logged but transaction continues
- Code hash validation: Prevents malicious resolver upgrades
- Gas limits: Prevent DOS attacks from expensive resolvers
- Graceful degradation: address(0) handling for deactivated resolvers
```

## Security Model

### Defense in Depth

The security model implements multiple independent layers:

1. **Code Hash Verification** (Registries)
   - Captures bytecode hash at registration
   - Validates on every retrieval
   - Returns address(0) if code changes
   - Prevents malicious upgrades

2. **Immutable References** (Upgradeable Contracts)
   - Tier 2/3 contracts store immutable references to Tier 1
   - Even during upgrades, registry references can't change
   - Core security model remains intact

3. **Provider Isolation** (Layer 0)
   - Each provider implements standard interface
   - Provider handles all authorization logic
   - Base contract only routes and checks capabilities
   - Malicious provider affects only its documents

4. **Reentrancy Protection** (All Contracts)
   - OpenZeppelin ReentrancyGuard on all state-changing functions
   - Minimal gas overhead (~2,600 gas)
   - Zero-trust approach to external calls

5. **Progressive Ossification** (Tier 2)
   - Planned path from centralized to immutable
   - Multi-stage governance transitions
   - Final freeze ensures permanent infrastructure

### Threat Models

#### Malicious Provider Upgrade

**Threat**: Attacker upgrades provider contract to malicious implementation

**Mitigation**:
1. Code hash verification in ProviderRegistry
2. Immediate detection on next call
3. Graceful degradation (returns address(0))
4. Governor can deactivate provider
5. Documents can override to different provider

#### Cross-Chain Replay Attack

**Threat**: Attacker reuses attestation from one chain on another

**Mitigation**:
1. Source chain ID embedded in attestation
2. EASAttestationProviderV7 validates chain ID matches
3. Source EAS contract address validated
4. Source document contract address validated

#### Front-Running Attack

**Threat**: Attacker observes attestation in mempool and front-runs claim

**Mitigation**:
1. Attestation cryptographically bound to recipient address
2. EASAttestationProviderV7 verifies recipient matches msg.sender
3. Named reservations provide double protection
4. Even if attacker sees UID, claim will revert

#### Governance Takeover

**Threat**: Malicious actor gains control of governance

**Mitigation**:
1. Multi-stage progression (BOOTSTRAP → MULTISIG → DAO → OSSIFIED)
2. Each transition requires previous governor approval
3. Cannot skip stages or revert
4. Role revocation on each transition
5. Final ossification removes upgrade risk

#### Resolver DOS Attack

**Threat**: Malicious resolver consumes all gas

**Mitigation**:
1. Configurable gas limits per resolver
2. MAX_REASONABLE_GAS_LIMIT validation
3. Primary resolvers revert (intentional for critical services)
4. Additional resolvers fail gracefully
5. Can override gas limits per resolver

## Upgradeability Strategy

### UUPS Proxy Pattern

```
┌─────────────────────────────────────────┐
│            Proxy Contract               │
│  (Stores state, delegates to impl)      │
│                                         │
│  State Variables:                       │
│  - documentOwner                        │
│  - documentHash                         │
│  - registeredAt                         │
│  - etc.                                 │
│                                         │
│  fallback() → delegatecall(impl)        │
└──────────────┬──────────────────────────┘
               │
               │ delegatecall
               ↓
┌─────────────────────────────────────────┐
│        Implementation Contract          │
│   (Contains logic, no state)            │
│                                         │
│  Functions:                             │
│  - registerDocument()                   │
│  - transferOwnership()                  │
│  - _authorizeUpgrade()                  │
│  - etc.                                 │
│                                         │
│  Storage Gap:                           │
│  uint256[N] private __gap;              │
└─────────────────────────────────────────┘
```

### Storage Layout Management

```solidity
// VERSION 1
contract MyContractV1 {
    uint256 public var1;     // Slot 0
    uint256 public var2;     // Slot 1
    uint256[48] private __gap;  // Slots 2-49
}

// VERSION 2 (Add 2 variables)
contract MyContractV2 {
    uint256 public var1;     // Slot 0 (unchanged)
    uint256 public var2;     // Slot 1 (unchanged)
    uint256 public var3;     // Slot 2 (new)
    uint256 public var4;     // Slot 3 (new)
    uint256[46] private __gap;  // Slots 4-49 (reduced by 2)
}
```

### Upgrade Authorization

```solidity
function _authorizeUpgrade(address newImplementation)
    internal
    override
    onlyRole(GOVERNOR_ROLE)
{
    // Check if contract is ossified
    if (currentStage == GovernanceStage.OSSIFIED) {
        revert ContractIsOssified();
    }

    // Upgrade authorized if not ossified
}
```

## Progressive Ossification Timeline

### Timeline Overview

```
Month 0:        Deployment (BOOTSTRAP)
                └─ Team control for rapid iteration

Month 6:        Transition to MULTISIG
                └─ 3-of-5 guardian multisig for stability

Month 12:       Transition to DAO
                └─ Community governance for decentralization

Month 24:       Ossification (OSSIFIED)
                └─ Frozen forever for permanence

Month 24+:      Permanent Infrastructure
                └─ No upgrades possible, absolute trust
```

### Stage Transitions

#### BOOTSTRAP → MULTISIG

```solidity
function transitionToMultisig(address _multisig) external {
    require(msg.sender == bootstrapGovernor);
    require(currentStage == GovernanceStage.BOOTSTRAP);

    currentStage = GovernanceStage.MULTISIG;
    guardianMultisig = _multisig;

    _grantRole(GOVERNOR_ROLE, _multisig);
    _revokeRole(GOVERNOR_ROLE, bootstrapGovernor);  // ← One-way

    emit GovernanceStageTransitioned(BOOTSTRAP, MULTISIG, block.timestamp);
}
```

#### MULTISIG → DAO

```solidity
function transitionToDAO(address _dao) external {
    require(msg.sender == guardianMultisig);
    require(currentStage == GovernanceStage.MULTISIG);

    currentStage = GovernanceStage.DAO;
    daoGovernor = _dao;

    _grantRole(GOVERNOR_ROLE, _dao);
    _revokeRole(GOVERNOR_ROLE, guardianMultisig);  // ← One-way

    emit GovernanceStageTransitioned(MULTISIG, DAO, block.timestamp);
}
```

#### DAO → OSSIFIED

```solidity
function ossify() external {
    require(msg.sender == daoGovernor);
    require(currentStage == GovernanceStage.DAO);

    currentStage = GovernanceStage.OSSIFIED;
    ossificationTimestamp = block.timestamp;

    emit GovernanceStageTransitioned(DAO, OSSIFIED, block.timestamp);
    emit ContractOssified(msg.sender, block.timestamp);
}
```

### Emergency Controls Evolution

```
Month 0-6:    Emergency Address OR Governance
              └─ Time-limited emergency powers for rapid response

Month 6+:     Governance Only
              └─ Emergency address powers expire
              └─ Progressive decentralization milestone
```

## Design Decisions and Rationale

### 1. Why Three Tiers?

**Decision**: Separate contracts into Immutable, Ossifiable, and Upgradeable tiers

**Rationale**:
- **Immutable (Tier 1)**: Critical infrastructure that must never change (capability definitions, registry logic)
- **Ossifiable (Tier 2)**: Needs flexibility initially but should eventually freeze (access control, document registry)
- **Upgradeable (Tier 3)**: Application features that should evolve (tokenizers, communication, new features)

**Benefits**:
- Clear trust guarantees at each tier
- Flexibility where needed, immutability where critical
- Reduced upgrade risk for core infrastructure

### 2. Why Provider Abstraction?

**Decision**: Abstract attestation providers behind IAttestationProvider interface

**Rationale**:
- V6 hard-coded EAS verification
- Future may bring better attestation systems (VCs, ZK proofs, DIDs)
- Provider abstraction enables migration without contract upgrades
- Multiple attestation systems can coexist

**Benefits**:
- Future-proof against attestation technology changes
- No contract upgrades needed to add new providers
- Documents can choose their preferred provider
- Competition drives better attestation systems

### 3. Why Progressive Ossification?

**Decision**: 24-month governance evolution path ending in immutability

**Rationale**:
- Early stage needs rapid iteration (bug fixes, feature adds)
- Decentralization builds trust but requires maturity
- Community needs time to organize governance
- Final immutability provides ultimate trust guarantee

**Benefits**:
- Flexibility when protocol is young
- Clear path to decentralization
- Transparency in governance transition
- Absolute trust in mature protocol

### 4. Why Resolver Composition?

**Decision**: Separate document identity from service functionality via resolvers

**Rationale**:
- Document registry should be minimal and immutable
- Services change over time (new features, integrations)
- Each document may need different services
- Prevents bloat in core registry

**Benefits**:
- Extensibility without upgrading core contracts
- Per-document service customization
- Security via code hash verification
- Graceful degradation on resolver issues

### 5. Why Multiple Tokenizers?

**Decision**: 11 specialized tokenizers instead of one generic

**Rationale**:
- Different use cases have different requirements
- Single generic tokenizer becomes complex and risky
- Specialized tokenizers are simpler and more auditable
- Users choose appropriate tokenizer for their needs

**Benefits**:
- Simpler, more auditable contracts
- Optimized gas for each use case
- Clear semantics for each token type
- Reduced risk from complexity

### 6. Why Batch Operations?

**Decision**: Implement batch registration and operations

**Rationale**:
- Enterprise onboarding requires thousands of documents
- Individual transactions expensive and slow
- 90% gas savings for bulk operations
- Better UX for large-scale users

**Benefits**:
- Enterprise-scale onboarding
- Massive gas savings (8.5M → 950k for 50 docs)
- Improved user experience
- Competitive advantage

### 7. Why Time-Limited Emergency Powers?

**Decision**: Emergency controls expire after 6 months

**Rationale**:
- Early stage may need rapid response to issues
- Permanent emergency powers undermine decentralization
- 6 months sufficient for protocol to mature
- Automatic expiry ensures progressive decentralization

**Benefits**:
- Security safety net during bootstrap
- Clear path to full decentralization
- Automatic progression (no governance vote needed)
- Transparent to users (on-chain timestamp)

### 8. Why Code Hash Verification?

**Decision**: Registries validate contract bytecode hash

**Rationale**:
- Upgradeable contracts introduce upgrade risk
- Malicious upgrades could compromise security
- Code hash changes indicate contract modification
- Early detection prevents exploitation

**Benefits**:
- Detects malicious upgrades immediately
- Prevents SELFDESTRUCT + redeploy attacks
- Stops metamorphic contract attacks
- Graceful degradation (address(0) instead of exploit)

### 9. Why ERC-6909 for Lite Tokenizer?

**Decision**: Use ERC-6909 instead of ERC-1155 for lite version

**Rationale**:
- ERC-1155 has significant overhead (callbacks, holder tracking)
- ERC-6909 is minimal multi-token standard (Uniswap V4)
- 50% gas savings for mint/transfer operations
- Simpler approval system

**Benefits**:
- Significant gas savings
- Simpler codebase (less attack surface)
- Battle-tested in Uniswap V4
- Better for high-volume applications

### 10. Why Trust Graph Integration?

**Decision**: Optional trust credential issuance on document completion

**Rationale**:
- Reputation systems require verifiable history
- On-chain activity builds trust scores
- Privacy-preserving via ephemeral wallets
- Optional (can disable by setting trustRegistry = address(0))

**Benefits**:
- Builds verifiable reputation
- Privacy-preserving design
- Enables trust-based features
- Optional (no forced participation)

## Summary

Integra V7's architecture achieves:

1. **Permanence**: Tier 1 immutable infrastructure
2. **Security**: Defense-in-depth with multiple layers
3. **Flexibility**: Tier 3 upgradeability for innovation
4. **Decentralization**: Progressive ossification timeline
5. **Extensibility**: Provider abstraction and resolver composition
6. **Efficiency**: Batch operations and gas optimization
7. **Trust**: Formal verification and code hash validation

The three-tier design provides the optimal balance of immutability and upgradeability, ensuring the protocol can evolve while maintaining trust guarantees.

## Next Steps

- [Integration Guide](./integration.md) - Start building with Integra V7
- [Deployment Guide](./deployment.md) - Deploy the contracts
- [Testing Guide](./testing.md) - Test the architecture
- [Security Guide](./security.md) - Understand security patterns
- [Migration Guide](./migration.md) - Migrate from V6 to V7
