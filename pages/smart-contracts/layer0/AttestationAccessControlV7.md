# AttestationAccessControlV7

## Overview

**Version**: 7.0.0
**Type**: Abstract Upgradeable Contract (Progressive Ossification)
**License**: MIT
**Inherits**: UUPSUpgradeable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable

AttestationAccessControlV7 is the abstract base contract for provider-agnostic attestation access control with progressive ossification. It provides the core capability verification infrastructure that all Layer 1+ contracts inherit.

### Purpose

- Provide attestation-based access control for document contracts
- Route verification requests to appropriate attestation providers
- Manage provider selection (default + per-document overrides)
- Implement progressive governance evolution (BOOTSTRAP → MULTISIG → DAO → OSSIFIED)
- Maintain immutable references to critical infrastructure

### Key Features

- Provider abstraction supporting multiple attestation systems (EAS, VC, ZK, DIDs)
- Immutable references to CapabilityNamespaceV7 and AttestationProviderRegistry
- Two capability modifiers: requiresCapability (generic) and requiresCapabilityWithUID (EAS-optimized)
- Flexible provider configuration (default + document-specific overrides)
- Progressive ossification with four governance stages
- Emergency pause functionality
- Reentrancy protection

## Architecture

### Design Philosophy

**Why Abstract?**

This contract is abstract because:
1. Concrete contracts must implement `_getDocumentOwner()`
2. Different document types have different owner storage patterns
3. Enables reuse across multiple contract types

**Why Upgradeable?**

While immutable registries provide stability, this contract can be upgraded to:
1. Fix bugs discovered post-deployment
2. Add new features during early stages
3. Optimize gas costs
4. Improve security mechanisms

**Progressive Ossification Timeline**:
```
Month 0-6:   BOOTSTRAP (team control)
Month 6-12:  MULTISIG (guardian control)
Month 12-24: DAO (community control)
Month 24+:   OSSIFIED (immutable forever)
```

### Immutable References

Despite being upgradeable, critical infrastructure references are immutable:

```solidity
CapabilityNamespaceV7_Immutable public NAMESPACE;
AttestationProviderRegistryV7_Immutable public PROVIDER_REGISTRY;
```

**Set Once**: During initialization, cannot change afterward
**Why**: Ensures core security model remains intact even during upgrades

### Integration Points

- **Layer 1+ Contracts**: Inherit this contract for attestation-based access control
- **CapabilityNamespaceV7**: Referenced for capability definitions
- **AttestationProviderRegistry**: Referenced for provider lookup
- **IAttestationProvider**: Interface for all attestation providers

## Key Concepts

### 1. Provider Abstraction

V6 was hard-coded to EAS. V7 supports multiple attestation systems:

```
Document → Provider ID → Provider Registry → Provider Implementation
                                           → Capability Verification
```

**Benefits**:
- Support multiple attestation methods simultaneously
- Easy migration between attestation systems
- Gradual rollout of new technologies
- Vendor independence

### 2. Provider Selection

Two levels of provider selection:

1. **Default Provider**: Used for all documents unless overridden
2. **Document-Specific Provider**: Overrides default for specific documents

```solidity
bytes32 providerId = documentProvider[documentHash];
if (providerId == bytes32(0)) {
    providerId = defaultProviderId; // Use default
}
```

**Use Cases**:
- Different document types use different attestation methods
- Migration period with mixed attestation systems
- Experimental features on subset of documents

### 3. Capability Modifiers

Two modifiers for capability checking:

**A. requiresCapability** (Generic)

```solidity
modifier requiresCapability(
    bytes32 documentHash,
    uint256 requiredCapability,
    bytes calldata attestationProof
)
```

Use for complex proofs (VCs, ZK proofs, multi-value attestations).

**B. requiresCapabilityWithUID** (EAS-Optimized)

```solidity
modifier requiresCapabilityWithUID(
    bytes32 documentHash,
    uint256 requiredCapability,
    bytes32 proofValue
)
```

Use for single-value proofs (EAS attestation UIDs).

### 4. Progressive Ossification

Four governance stages with one-way transitions:

```
BOOTSTRAP → MULTISIG → DAO → OSSIFIED
(Team)      (Guardians) (Community) (Frozen)
```

**Transition Rules**:
- Each stage can only transition to next stage (no going back)
- Role authority transfers during transitions
- Upgrade capability removed at OSSIFIED stage

## State Variables

### Version

```solidity
string public constant VERSION = "7.0.0"
```

### Roles

```solidity
bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
```

**Role Purposes**:
- **GOVERNOR**: Upgrade contracts, set default provider, pause/unpause
- **OPERATOR**: Operational management (reserved for future use)
- **EXECUTOR**: Set document-specific providers

### Immutable References

```solidity
CapabilityNamespaceV7_Immutable public NAMESPACE;
AttestationProviderRegistryV7_Immutable public PROVIDER_REGISTRY;
```

Set during initialization, cannot change afterward.

### Governance Stage

```solidity
enum GovernanceStage {
    BOOTSTRAP,  // Team control (months 0-6)
    MULTISIG,   // Guardian multisig (months 6-12)
    DAO,        // Community DAO (months 12-24)
    OSSIFIED    // Frozen forever (month 24+)
}

GovernanceStage public currentStage;
```

### Governance Actors

```solidity
address public bootstrapGovernor;   // Team multisig
address public guardianMultisig;    // 3-of-5 guardians
address public daoGovernor;         // DAO contract
uint256 public ossificationTimestamp; // When ossified (0 = not ossified)
```

### Provider Configuration

```solidity
bytes32 public defaultProviderId;                      // Default for all documents
mapping(bytes32 => bytes32) public documentProvider;   // Per-document overrides
```

## Functions

### Initialization

```solidity
function __AttestationAccessControl_init(
    address _namespace,
    address _providerRegistry,
    bytes32 _defaultProviderId,
    address _bootstrapGovernor
) internal onlyInitializing
```

Initialize AttestationAccessControl (called by concrete contract's initialize).

**Parameters**:
- `_namespace`: CapabilityNamespaceV7_Immutable address
- `_providerRegistry`: AttestationProviderRegistryV7_Immutable address
- `_defaultProviderId`: Default provider ID
- `_bootstrapGovernor`: Initial governor (team)

**Effects**:
- Sets immutable references
- Sets default provider
- Initializes governance at BOOTSTRAP stage
- Grants roles to bootstrap governor

**Example**:
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

### Capability Verification

#### requiresCapability Modifier

```solidity
modifier requiresCapability(
    bytes32 documentHash,
    uint256 requiredCapability,
    bytes calldata attestationProof
)
```

Verify caller has required capability via attestation (generic proof format).

**Parameters**:
- `documentHash`: Document identifier
- `requiredCapability`: Required capability flags
- `attestationProof`: Provider-specific proof data (ABI-encoded)

**Verification Flow**:
1. Get provider ID (document-specific or default)
2. Get provider address from registry (with code hash check)
3. Delegate to provider.verifyCapabilities()
4. Check capabilities using NAMESPACE.hasCapability()

**Security Warning**: Functions using this modifier MUST include `nonReentrant`.

**Example**:
```solidity
function updateDocument(
    bytes32 documentHash,
    string calldata newMetadata,
    bytes calldata attestationProof
)
    external
    requiresCapability(documentHash, NAMESPACE.CORE_UPDATE(), attestationProof)
    nonReentrant
{
    // Update logic...
}
```

#### requiresCapabilityWithUID Modifier

```solidity
modifier requiresCapabilityWithUID(
    bytes32 documentHash,
    uint256 requiredCapability,
    bytes32 proofValue
)
```

Verify caller has required capability using single-value proof (EAS-style).

**Parameters**:
- `documentHash`: Document identifier
- `requiredCapability`: Required capability flags
- `proofValue`: Single value proof (automatically ABI-encoded)

**Encoding**: Automatically encodes as `abi.encode(proofValue)`

**Example**:
```solidity
function claimToken(
    bytes32 integraHash,
    uint256 tokenId,
    bytes32 easUID
)
    external
    requiresCapabilityWithUID(integraHash, NAMESPACE.CORE_CLAIM(), easUID)
    nonReentrant
{
    // Claim logic...
}
```

### Provider Management

#### setDefaultProvider

```solidity
function setDefaultProvider(bytes32 providerId)
    external
    onlyRole(GOVERNOR_ROLE)
```

Set default provider for attestation verification.

**Parameters**:
- `providerId`: Provider ID to use as default

**Validation**:
- Provider ID is not zero
- Provider exists in registry
- Provider is active
- Provider code hash is valid

**Events**: Emits `DefaultProviderSet`

**Example**:
```solidity
bytes32 easProviderId = keccak256("EAS_V1");
accessControl.setDefaultProvider(easProviderId);
```

#### setDocumentProvider

```solidity
function setDocumentProvider(bytes32 documentHash, bytes32 providerId)
    external
    onlyRole(EXECUTOR_ROLE)
```

Set provider for specific document.

**Parameters**:
- `documentHash`: Document identifier
- `providerId`: Provider ID (or bytes32(0) to use default)

**Effects**:
- Sets document-specific provider override
- Use bytes32(0) to clear override and use default

**Events**: Emits `DocumentProviderSet`

**Example**:
```solidity
// Use ZK provider for this document
bytes32 zkProviderId = keccak256("ZK_V1");
accessControl.setDocumentProvider(documentHash, zkProviderId);

// Revert to default provider
accessControl.setDocumentProvider(documentHash, bytes32(0));
```

### Governance Transitions

#### transitionToMultisig

```solidity
function transitionToMultisig(address _multisig) external
```

Transition from BOOTSTRAP to MULTISIG stage.

**Authorization**: Only bootstrap governor
**Precondition**: Current stage is BOOTSTRAP

**Parameters**:
- `_multisig`: Guardian multisig address (3-of-5 recommended)

**Effects**:
- Sets currentStage = MULTISIG
- Sets guardianMultisig address
- Grants GOVERNOR_ROLE to multisig
- Revokes GOVERNOR_ROLE from bootstrap governor

**Events**: Emits `GovernanceStageTransitioned`

**Example**:
```solidity
// Deploy multisig
Multisig guardians = new Multisig(guardianAddresses, 3);

// Transition
accessControl.transitionToMultisig(address(guardians));
```

#### transitionToDAO

```solidity
function transitionToDAO(address _dao) external
```

Transition from MULTISIG to DAO stage.

**Authorization**: Only guardian multisig
**Precondition**: Current stage is MULTISIG

**Parameters**:
- `_dao`: DAO governor address

**Effects**:
- Sets currentStage = DAO
- Sets daoGovernor address
- Grants GOVERNOR_ROLE to DAO
- Revokes GOVERNOR_ROLE from guardian multisig

**Events**: Emits `GovernanceStageTransitioned`

**Example**:
```solidity
// Deploy DAO
GovernorDAO dao = new GovernorDAO(...);

// Transition
guardianMultisig.execute(
    accessControl,
    "transitionToDAO(address)",
    address(dao)
);
```

#### ossify

```solidity
function ossify() external
```

Ossify contract (freeze forever).

**Authorization**: Only DAO governor
**Precondition**: Current stage is DAO

**Effects**:
- Sets currentStage = OSSIFIED
- Sets ossificationTimestamp
- Disables all upgrades permanently

**Events**: Emits `GovernanceStageTransitioned`, `ContractOssified`

**Warning**: This is permanent and irreversible!

**Example**:
```solidity
// After 24 months of successful operation
dao.propose("Ossify contract");
// Vote and execute
dao.execute(proposalId);
```

### View Functions

#### getCurrentProvider

```solidity
function getCurrentProvider(bytes32 documentHash)
    external
    view
    returns (bytes32)
```

Get current provider for a document.

**Returns**: Document-specific provider ID or default provider ID

#### canUpgrade

```solidity
function canUpgrade() external view returns (bool)
```

Check if contract can be upgraded.

**Returns**: `true` if not ossified, `false` if ossified

#### getGovernanceInfo

```solidity
function getGovernanceInfo()
    external
    view
    returns (
        GovernanceStage stage,
        address governor,
        bool canBeUpgraded
    )
```

Get governance stage information.

**Returns**:
- `stage`: Current governance stage
- `governor`: Current governor address
- `canBeUpgraded`: Whether upgrades are allowed

### Emergency Functions

#### pause / unpause

```solidity
function pause() external onlyRole(GOVERNOR_ROLE)
function unpause() external onlyRole(GOVERNOR_ROLE)
```

Pause/unpause all capability verifications.

**Use Cases**:
- Emergency security response
- Critical bug discovered
- Coordinated upgrade window

**Example**:
```solidity
// Emergency pause
accessControl.pause();

// Fix issue, deploy new implementation

// Unpause
accessControl.unpause();
```

#### emergencyWithdraw

```solidity
function emergencyWithdraw(address token, address to, uint256 amount)
    external
    onlyRole(GOVERNOR_ROLE)
```

Emergency withdrawal of accidentally sent ETH or tokens.

**Parameters**:
- `token`: Token address (address(0) for ETH)
- `to`: Recipient address
- `amount`: Amount to withdraw

**Example**:
```solidity
// Withdraw accidentally sent USDC
accessControl.emergencyWithdraw(
    usdcAddress,
    treasuryAddress,
    accidentalAmount
);
```

### Abstract Functions

```solidity
function _getDocumentOwner(bytes32 documentHash)
    internal
    view
    virtual
    returns (address);
```

Get document owner (MUST be implemented by inheriting contracts).

**Implementation Example**:
```solidity
contract IntegraDocumentRegistryV7 is AttestationAccessControlV7 {
    mapping(bytes32 => address) public documentOwners;

    function _getDocumentOwner(bytes32 documentHash)
        internal
        view
        override
        returns (address)
    {
        return documentOwners[documentHash];
    }
}
```

## Events

### CapabilityVerified

```solidity
event CapabilityVerified(
    address indexed user,
    bytes32 indexed documentHash,
    uint256 capabilities,
    bytes32 providerId,
    bytes proof
)
```

Emitted when capability is successfully verified.

### DefaultProviderSet

```solidity
event DefaultProviderSet(
    bytes32 indexed providerId,
    address indexed providerAddress,
    address indexed setBy,
    uint256 timestamp
)
```

Emitted when default provider is changed.

### DocumentProviderSet

```solidity
event DocumentProviderSet(
    bytes32 indexed documentHash,
    bytes32 indexed providerId,
    address indexed setBy,
    uint256 timestamp
)
```

Emitted when document-specific provider is set.

### GovernanceStageTransitioned

```solidity
event GovernanceStageTransitioned(
    GovernanceStage indexed fromStage,
    GovernanceStage indexed toStage,
    address indexed initiator,
    uint256 timestamp
)
```

Emitted when governance stage transitions.

### ContractOssified

```solidity
event ContractOssified(
    address indexed initiator,
    uint256 timestamp
)
```

Emitted when contract is ossified (frozen forever).

## Security Considerations

### Reentrancy Protection

**Critical Requirement**: All functions using capability modifiers MUST include `nonReentrant`.

**Why**: Modifiers make external calls to attestation providers.

**Bad**:
```solidity
function claimToken(bytes32 hash, bytes32 uid)
    external
    requiresCapabilityWithUID(hash, NAMESPACE.CORE_CLAIM(), uid)
    // MISSING nonReentrant - VULNERABLE!
{
    // ...
}
```

**Good**:
```solidity
function claimToken(bytes32 hash, bytes32 uid)
    external
    requiresCapabilityWithUID(hash, NAMESPACE.CORE_CLAIM(), uid)
    nonReentrant  // PROTECTED
{
    // ...
}
```

### Provider Security

**Code Hash Validation**: Provider registry validates code hash before returning address.

**Graceful Degradation**: Returns address(0) if provider compromised.

**Caller Responsibility**: Must handle address(0) appropriately.

**Example**:
```solidity
address provider = PROVIDER_REGISTRY.getProvider(providerId);
if (provider == address(0)) {
    // Handle missing/compromised provider
    revert ProviderNotFound(providerId);
}
```

### Governance Security

**One-Way Transitions**: Cannot revert to previous governance stage.

**Role Revocation**: Previous governor loses role during transition.

**Ossification Finality**: Ossification is permanent and irreversible.

**Multi-Stage Design**: Reduces risk of single point of failure.

### Upgrade Security

**Authorization**: Only GOVERNOR_ROLE can authorize upgrades.

**Ossification Check**: Upgrades disabled after ossification.

**Storage Gap**: 41 slots reserved for future storage variables.

**Testing**: Comprehensive upgrade testing required before each upgrade.

## Usage Examples

### Basic Implementation

```solidity
contract MyDocumentRegistry is AttestationAccessControlV7 {
    mapping(bytes32 => address) public documentOwners;
    mapping(bytes32 => string) public documentMetadata;

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

    function _getDocumentOwner(bytes32 documentHash)
        internal
        view
        override
        returns (address)
    {
        return documentOwners[documentHash];
    }

    function registerDocument(bytes32 documentHash, string calldata metadata)
        external
    {
        documentOwners[documentHash] = msg.sender;
        documentMetadata[documentHash] = metadata;
    }

    function updateMetadata(
        bytes32 documentHash,
        string calldata newMetadata,
        bytes32 easUID
    )
        external
        requiresCapabilityWithUID(documentHash, NAMESPACE.CORE_UPDATE(), easUID)
        nonReentrant
    {
        documentMetadata[documentHash] = newMetadata;
    }
}
```

### Multi-Provider Support

```solidity
contract FlexibleDocumentSystem is AttestationAccessControlV7 {
    // Standard documents use EAS
    bytes32 public easProviderId = keccak256("EAS_V1");

    // Privacy-sensitive documents use ZK
    bytes32 public zkProviderId = keccak256("ZK_V1");

    function createStandardDocument(bytes32 documentHash) external {
        // Uses default provider (EAS)
        _createDocument(documentHash);
    }

    function createPrivateDocument(bytes32 documentHash) external {
        // Override to use ZK provider
        _setDocumentProvider(documentHash, zkProviderId);
        _createDocument(documentHash);
    }
}
```

### Governance Transition Example

```solidity
// Month 0: Deploy with bootstrap governor
contract.initialize(namespace, registry, easProvider, teamMultisig);

// Month 6: Transition to guardian multisig
contract.transitionToMultisig(guardianMultisig);

// Month 12: Transition to DAO
guardianMultisig.execute(
    contract,
    "transitionToDAO(address)",
    daoAddress
);

// Month 24: Ossify
dao.propose("Ossify contract");
dao.vote(proposalId, true);
dao.execute(proposalId); // Calls contract.ossify()
```

## Integration Guide

### For Contract Developers

1. **Inherit Contract**:
   ```solidity
   contract MyContract is AttestationAccessControlV7
   ```

2. **Implement Abstract Function**:
   ```solidity
   function _getDocumentOwner(bytes32 hash)
       internal view override returns (address)
   ```

3. **Initialize**:
   ```solidity
   __AttestationAccessControl_init(namespace, registry, provider, governor)
   ```

4. **Use Modifiers**:
   ```solidity
   requiresCapabilityWithUID(hash, NAMESPACE.CORE_CLAIM(), uid)
   nonReentrant
   ```

### Testing

```javascript
const MyContract = await ethers.getContractFactory("MyContract");
const contract = await upgrades.deployProxy(MyContract, [
    namespaceAddress,
    registryAddress,
    providerIdEAS,
    governor.address
]);

// Test capability verification
const documentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("doc1"));
const easUID = "0x..."; // Valid EAS attestation

await contract.updateMetadata(documentHash, "New metadata", easUID);

// Test governance transition
await contract.connect(governor).transitionToMultisig(multisigAddress);
expect(await contract.currentStage()).to.equal(1); // MULTISIG
```

## References

- [Layer 0 Overview](./overview.md)
- [CapabilityNamespaceV7_Immutable](./CapabilityNamespaceV7_Immutable.md)
- [AttestationProviderRegistryV7_Immutable](./AttestationProviderRegistryV7_Immutable.md)
- [EASAttestationProviderV7](./EASAttestationProviderV7.md)
- [IAttestationProvider](./IAttestationProvider.md)
