# IntegraDocumentRegistry_Immutable

## Overview

The IntegraDocumentRegistry_Immutable contract is the core document identity registry for Integra. It is a non-upgradeable, immutable contract that maintains pure document identity records with resolver composition for service orchestration.

**Status**: Immutable (deployed once per chain, never upgraded)
**Version**: 7.0.0
**Solidity**: 0.8.28
**License**: MIT

## Contract Address

| Network | Address |
|---------|---------|
| Ethereum Mainnet | TBD |
| Polygon | TBD |
| Base | TBD |
| Optimism | TBD |

## Architecture

### Pure Identity Layer

The registry stores only essential document identity information:

- **Ownership**: Document owner address
- **Content Identity**: Document hash (SHA256/Poseidon)
- **Lineage**: Reference hash (parent document)
- **Association**: Tokenizer contract address
- **Metadata**: Registration timestamp, existence flag
- **Extension**: Future-proof identity extension field (ZK commitments, DIDs, cross-chain refs)

### Resolver Composition

Services are accessed via resolver contracts, not stored in the document record:

- **Primary Resolver**: Critical services (blocking, must succeed)
- **Additional Resolvers**: Optional services (non-blocking, best-effort)
- **Resolver Lock**: Configuration can be locked for immutability
- **Code Hash Verification**: Prevents malicious resolver upgrades

### Emergency Controls

Time-limited multisig override for the first 6 months after deployment:

- **Emergency Address**: Immutable (set at deployment)
- **Emergency Expiry**: 6 months from deployment
- **Capabilities**: Unlock resolvers, disable fees
- **Progressive Decentralization**: Auto-expires to governance-only

## Key Features

### 1. Document Registration

Register documents with full identity and service composition:

```solidity
function registerDocument(
    bytes32 integraHash,
    bytes32 documentHash,
    bytes32 identityExtension,
    bytes32 referenceHash,
    uint256[2] calldata referenceProofA,
    uint256[2][2] calldata referenceProofB,
    uint256[2] calldata referenceProofC,
    address tokenizer,
    bytes32 primaryResolverId,
    address authorizedExecutor,
    bytes32 processHash
) external payable returns (bytes32)
```

**Parameters**:
- `integraHash`: Unique document identifier
- `documentHash`: Content hash (SHA256/Poseidon)
- `identityExtension`: ZK commitment, DID, or cross-chain reference (bytes32(0) if unused)
- `referenceHash`: Parent document reference (bytes32(0) if none)
- `referenceProofA/B/C`: ZK proof for reference validation
- `tokenizer`: Associated tokenizer contract (address(0) to defer)
- `primaryResolverId`: Primary resolver ID (bytes32(0) for none)
- `authorizedExecutor`: Optional executor (address(0) if none)
- `processHash`: Workflow process identifier

**Returns**: Document integraHash

**Events**:
- `DocumentRegistered`: Emitted on successful registration
- `DocumentReferenced`: Emitted if referenceHash provided
- `DocumentExecutorAuthorized`: Emitted if executor authorized
- `PrimaryResolverSet`: Emitted if primary resolver set
- `FeeCollected`: Emitted if fee collected

**Fee**: `msg.value` must be >= `registrationFee` (unless fee is 0 or disabled)

**Example**:
```solidity
bytes32 integraHash = keccak256(abi.encodePacked(documentHash, owner, nonce));

bytes32 result = documentRegistry.registerDocument{value: registrationFee}(
    integraHash,
    documentHash,
    bytes32(0),  // No identity extension
    bytes32(0),  // No parent reference
    [uint256(0), uint256(0)],  // No proof needed
    [[uint256(0), uint256(0)], [uint256(0), uint256(0)]],
    [uint256(0), uint256(0)],
    tokenizerAddress,
    primaryResolverId,
    executorAddress,
    processHash
);
```

### 2. Batch Registration

Gas-efficient bulk document registration:

```solidity
function registerDocumentBatch(
    bytes32[] calldata integraHashes,
    bytes32[] calldata documentHashes,
    bytes32[] calldata identityExtensions,
    address[] calldata tokenizers,
    bytes32[] calldata primaryResolverIds,
    address executor,
    bytes32[] calldata processHashes,
    bool callResolverHooks
) external payable returns (bytes32[] memory)
```

**Design Philosophy**:
- **No Reference Proofs**: Prevents gas bombs from ZK verification
- **Optional Resolver Hooks**: Enable for communication resolvers
- **Simple, Fast**: Predictable gas costs
- **Shared Executor**: All documents get same executor (or none)

**Gas Savings**:
- `callResolverHooks = false`: ~950k gas for 50 documents (90% savings)
- `callResolverHooks = true`: ~1.05M gas for 50 documents (88% savings)
- vs individual registration: 8.5M gas

**Restrictions**:
- `referenceHash` must be bytes32(0) (no parent references in batch)
- All documents share same `executor` (or address(0))
- Max batch size: 50 documents
- Fee: `msg.value` must be >= `registrationFee * batchSize`

**Example**:
```solidity
bytes32[] memory hashes = new bytes32[](10);
bytes32[] memory docHashes = new bytes32[](10);
bytes32[] memory extensions = new bytes32[](10);
address[] memory tokenizers = new address[](10);
bytes32[] memory resolverIds = new bytes32[](10);
bytes32[] memory processHashes = new bytes32[](10);

// Populate arrays...

documentRegistry.registerDocumentBatch{value: registrationFee * 10}(
    hashes,
    docHashes,
    extensions,
    tokenizers,
    resolverIds,
    backendExecutor,
    processHashes,
    true  // Call resolver hooks for communication
);
```

### 3. Resolver Management

#### Set Primary Resolver

```solidity
function setPrimaryResolver(bytes32 integraHash, bytes32 resolverId) external
```

Sets the primary resolver for a document. Primary resolver calls are blocking - failures revert the transaction.

**Access**: Document owner only
**Restrictions**: Cannot set if resolvers are locked

**Example**:
```solidity
documentRegistry.setPrimaryResolver(integraHash, complianceResolverId);
```

#### Add Additional Resolver

```solidity
function addAdditionalResolver(bytes32 integraHash, bytes32 resolverId) external
```

Adds an additional resolver to a document. Additional resolver calls are non-blocking - failures are logged but don't revert.

**Access**: Document owner only
**Restrictions**:
- Max 10 additional resolvers per document
- Cannot add if resolvers are locked

**Example**:
```solidity
documentRegistry.addAdditionalResolver(integraHash, contactResolverId);
documentRegistry.addAdditionalResolver(integraHash, lifecycleResolverId);
```

#### Remove Additional Resolver

```solidity
function removeAdditionalResolver(bytes32 integraHash, bytes32 resolverId) external
```

Removes an additional resolver from a document.

**Access**: Document owner only
**Restrictions**: Cannot remove if resolvers are locked

#### Lock Resolvers

```solidity
function lockResolvers(bytes32 integraHash) external
```

Permanently locks the resolver configuration for a document. This is irreversible except via emergency unlock (time-limited to 6 months).

**Access**: Document owner only

**Use Cases**:
- Compliance-critical documents requiring immutable service composition
- Long-term contracts with fixed resolver dependencies
- Documents where resolver changes could violate agreements

**Example**:
```solidity
// Set all resolvers first
documentRegistry.setPrimaryResolver(integraHash, complianceResolverId);
documentRegistry.addAdditionalResolver(integraHash, contactResolverId);

// Lock configuration (immutable)
documentRegistry.lockResolvers(integraHash);
```

#### Emergency Unlock Resolvers

```solidity
function emergencyUnlockResolvers(
    bytes32 integraHash,
    string calldata justification
) external
```

Emergency unlock for locked resolver configurations. Time-limited to 6 months after deployment.

**Access**:
- **Before 6 months**: Emergency address OR governance
- **After 6 months**: Governance only (emergency address loses powers)

**Required**: Non-empty justification string (for audit trail)

**Example**:
```solidity
documentRegistry.emergencyUnlockResolvers(
    integraHash,
    "Critical security issue with compliance resolver contract"
);
```

#### Batch Set Primary Resolver

```solidity
function setPrimaryResolverBatch(
    bytes32[] calldata integraHashes,
    bytes32 resolverId
) external
```

Set the same primary resolver for multiple documents in one transaction.

**Use Cases**:
- Company registers 50 documents, later adds communication resolver to all
- 1 transaction instead of 50 (90% gas savings)

### 4. Identity Extension

```solidity
function setIdentityExtension(bytes32 integraHash, bytes32 extension) external
```

Set or update the identity extension field for a document.

**Access**: Document owner only

**Use Cases**:
1. **ZK Commitments**: Store zero-knowledge proof commitments
2. **DIDs**: Reference decentralized identifier documents
3. **Cross-Chain References**: Point to documents on other chains
4. **Protocol Upgrades**: Future functionality hooks

**Example**:
```solidity
// ZK commitment
bytes32 commitment = zkProver.generateCommitment(secretData);
documentRegistry.setIdentityExtension(integraHash, commitment);

// DID reference
bytes32 didHash = keccak256(abi.encodePacked("did:integra:", documentId));
documentRegistry.setIdentityExtension(integraHash, didHash);

// Cross-chain reference (Polygon document from Ethereum)
bytes32 l2DocHash = keccak256(abi.encodePacked(uint256(137), polygonIntegraHash));
documentRegistry.setIdentityExtension(integraHash, l2DocHash);
```

### 5. Executor Management

#### Authorize Executor

```solidity
function authorizeDocumentExecutor(bytes32 integraHash, address executor) external
```

Authorize a contract or EOA to perform operations on behalf of the document owner.

**Access**: Document owner only
**Restrictions**:
- Cannot authorize yourself
- Cannot authorize if executor already set
- Executor must be valid (whitelisted, implement IIntegraExecutor, or be EOA)

**Example**:
```solidity
// Authorize Integra backend for gas abstraction
documentRegistry.authorizeDocumentExecutor(integraHash, integraBackendAddress);

// Authorize DAO for governance
documentRegistry.authorizeDocumentExecutor(integraHash, daoGovernorAddress);
```

#### Revoke Executor

```solidity
function revokeDocumentExecutor(bytes32 integraHash) external
```

Revoke the current executor authorization.

**Access**: Document owner only

#### Replace Executor

```solidity
function replaceDocumentExecutor(bytes32 integraHash, address newExecutor) external
```

Atomically replace the current executor. Prevents authorization gap during upgrades.

**Access**: Document owner only

**Use Cases**:
- Executor contract upgrades (V1 → V2)
- Zero downtime during migration
- Backend server rotation

**Example**:
```solidity
// Atomic replacement - no gap where document lacks executor
documentRegistry.replaceDocumentExecutor(integraHash, newBackendAddress);
```

#### Batch Authorize Executor

```solidity
function authorizeDocumentExecutorBatch(
    bytes32[] calldata integraHashes,
    address executor
) external
```

Authorize the same executor for multiple documents.

**Use Cases**:
- Company registers 10,000 documents
- Authorizes backend system as executor for all
- 1 transaction instead of 10,000

#### Batch Revoke Executor

```solidity
function revokeDocumentExecutorBatch(bytes32[] calldata integraHashes) external
```

Revoke executors for multiple documents.

### 6. Ownership Management

```solidity
function transferDocumentOwnership(
    bytes32 integraHash,
    address newOwner,
    string calldata reason
) external
```

Transfer document ownership to a new address.

**Access**: Document owner only

**Validation**:
- Primary resolver's `canOwnDocument()` check (if present)
- Reverts if resolver rejects transfer

**Hooks**:
- Calls primary resolver's `onDocumentTransferred()`
- Calls all additional resolvers' `onDocumentTransferred()`

**Example**:
```solidity
documentRegistry.transferDocumentOwnership(
    integraHash,
    buyerAddress,
    "Sale - Invoice #12345"
);
```

### 7. Tokenizer Association

```solidity
function associateTokenizer(
    bytes32 integraHash,
    address tokenizer,
    bytes32 processHash
) external
```

Associate a tokenizer with a document (if not set during registration).

**Access**: Document owner only
**Restrictions**:
- Tokenizer must be approved by governance
- Can only be set once (immutable)

**Hooks**:
- Calls primary resolver's `onTokenizerAssociated()`
- Calls all additional resolvers' `onTokenizerAssociated()`

**Example**:
```solidity
documentRegistry.associateTokenizer(
    integraHash,
    ownershipTokenizerAddress,
    processHash
);
```

### 8. Gas Limit Configuration

#### Set Default Primary Resolver Gas Limit

```solidity
function setDefaultPrimaryResolverGasLimit(uint256 newLimit) external
```

**Access**: Governance only
**Default**: 200,000 gas

#### Set Default Additional Resolver Gas Limit

```solidity
function setDefaultAdditionalResolverGasLimit(uint256 newLimit) external
```

**Access**: Governance only
**Default**: 100,000 gas

#### Set Resolver Gas Limit Override

```solidity
function setResolverGasLimitOverride(bytes32 resolverId, uint256 gasLimit) external
```

Set a custom gas limit for a specific resolver. Overrides default limits.

**Access**: Governance only
**Special**: Set to 0 to remove override and use default

**Example**:
```solidity
// High-complexity compliance resolver
documentRegistry.setResolverGasLimitOverride(complianceResolverId, 500_000);

// Lightweight communication resolver
documentRegistry.setResolverGasLimitOverride(contactResolverId, 50_000);
```

#### Set Max Reasonable Gas Limit

```solidity
function setMaxReasonableGasLimit(uint256 newLimit) external
```

Set the maximum allowed gas limit for all resolver calls. Should be set based on target chain's block gas limit.

**Access**: Governance only
**Default**: 30,000,000 gas (Ethereum/most L2s)

**Chain Recommendations**:
- Ethereum/Polygon/Optimism/Base: 30M gas
- Arbitrum: 40M gas
- Future L2s: Adjust based on chain specifications

**Example**:
```solidity
// Deploying on Arbitrum
documentRegistry.setMaxReasonableGasLimit(40_000_000);
```

### 9. Fee Management

#### Set Registration Fee

```solidity
function setRegistrationFee(uint256 newFee) external
```

Set the document registration fee.

**Access**: Governance only
**Bounds**:
- Minimum: 0 (always allows free option)
- Maximum: 0.01 ether (~$20-30)

**Recommended Timeline**:
- Months 0-12: 0 (free adoption period)
- Month 12+: 0.0005-0.002 ether ($1-5)

**Example**:
```solidity
// Start with free registration
documentRegistry.setRegistrationFee(0);

// After 12 months, set low fee
documentRegistry.setRegistrationFee(0.001 ether); // ~$2
```

#### Emergency Disable Fees

```solidity
function emergencyDisableFees(string calldata justification) external
```

Emergency circuit breaker for fee collection. Registrations continue but are free.

**Access**:
- **Before 6 months**: Emergency address OR governance
- **After 6 months**: Governance only

**Required**: Non-empty justification string

**Use Cases**:
- Critical bug in fee collection
- Severe UX issues affecting adoption
- Temporary market conditions (extreme gas prices)
- Exploit mitigation

**Example**:
```solidity
documentRegistry.emergencyDisableFees(
    "Critical UX issue: fee collection causing high gas costs during network congestion"
);
```

#### Re-enable Fees

```solidity
function reenableFees() external
```

Re-enable fees after emergency disable.

**Access**: Governance only (not emergency address)

### 10. Admin Functions

#### Approve/Unapprove Tokenizer

```solidity
function setTokenizerApproval(address tokenizer, bool approved) external
```

**Access**: Governance only

**Example**:
```solidity
documentRegistry.setTokenizerApproval(ownershipTokenizerAddress, true);
```

#### Batch Approve Tokenizers

```solidity
function setTokenizerApprovalBatch(
    address[] calldata tokenizers,
    bool[] calldata approvals
) external
```

**Access**: Governance only

**Use Cases**:
- Deploy 11 tokenizers across 15 chains
- Without batch: 165 individual transactions
- With batch: 15 transactions (one per chain)
- 91% fewer transactions, 90% gas savings

#### Approve/Unapprove Executor

```solidity
function setExecutorApproval(
    address executor,
    bool approved,
    string calldata name
) external
```

Whitelist an executor to bypass interface validation (gas optimization).

**Access**: Governance only

**When to Whitelist**:
1. Integra's official backend EOA(s) - PRIMARY USE CASE
   - Saves ~2,600 gas per authorization vs non-whitelisted
   - Recommended for all Integra-operated executors
2. Major partner executor contracts
   - High-volume integrators
   - Audited contracts with established trust
3. Governance/multisig contracts
   - DAO governors, Gnosis Safes

**When NOT to Whitelist**:
- Individual self-hosted instances (EOAs auto-allowed)
- Small developers (interface validation sufficient)
- Experimental/unaudited contracts

**Example**:
```solidity
documentRegistry.setExecutorApproval(
    integraBackendAddress,
    true,
    "Integra Official Backend V1"
);
```

#### Batch Approve Executors

```solidity
function setExecutorApprovalBatch(
    address[] calldata executors,
    bool[] calldata approvals,
    string[] calldata names
) external
```

**Access**: Governance only

### 11. Pause/Unpause

```solidity
function pause() external
function unpause() external
```

Emergency pause for critical bugs. When paused, all state-changing functions are disabled.

**Access**: Governance only

## State Variables

### Document Storage

```solidity
mapping(bytes32 => DocumentRecord) public documents;
```

Main document storage mapping.

### DocumentRecord Structure

```solidity
struct DocumentRecord {
    // Identity Core
    address owner;                      // Document owner
    address tokenizer;                  // Associated tokenizer contract
    bytes32 documentHash;               // Content hash (SHA256/Poseidon)
    bytes32 referenceHash;              // Parent document reference
    uint64 registeredAt;                // Registration timestamp
    bool exists;                        // Document existence flag
    bytes32 identityExtension;          // Protocol extension hook

    // Service Layer (via Resolvers)
    bytes32 primaryResolverId;          // Primary resolver identifier
    bytes32[] additionalResolvers;      // Additional resolver identifiers
    bool resolversLocked;               // Resolver configuration lock
}
```

### Tokenizer Approvals

```solidity
mapping(address => bool) public approvedTokenizers;
```

Governance-approved tokenizer contracts.

### Executor Mappings

```solidity
mapping(bytes32 => address) public documentExecutor;
mapping(bytes32 => uint256) public executorAuthorizedAt;
mapping(address => bool) public approvedExecutors;
```

Per-document executor authorization and whitelist.

### Registry References

```solidity
IntegraVerifierRegistry_Immutable public immutable verifierRegistry;
IntegraResolverRegistry_Immutable public immutable resolverRegistry;
```

Immutable references to dependency registries.

### Emergency Controls

```solidity
address public immutable emergencyAddress;
uint256 public immutable emergencyExpiry;
```

Immutable emergency controls (6-month time limit).

### Gas Configuration

```solidity
uint256 public defaultPrimaryResolverGasLimit;      // Default: 200k
uint256 public defaultAdditionalResolverGasLimit;   // Default: 100k
uint256 public maxReasonableGasLimit;               // Default: 30M
mapping(bytes32 => uint256) public resolverGasLimitOverride;
```

Configurable gas limits for resolver calls.

### Fee Configuration

```solidity
uint256 public registrationFee;                     // Current fee
address public immutable feeRecipient;              // Immutable recipient
bool public feesDisabled;                           // Emergency circuit breaker
uint256 public totalFeesCollected;                  // Accounting/transparency
uint256 public constant MIN_REGISTRATION_FEE = 0;
uint256 public constant MAX_REGISTRATION_FEE = 0.01 ether;
```

Fee system configuration.

### Constants

```solidity
string public constant VERSION = "7.0.0";
uint256 public constant MAX_BATCH_SIZE = 50;
uint256 public constant MAX_ADDITIONAL_RESOLVERS = 10;
bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
```

## View Functions

### Get Document

```solidity
function getDocument(bytes32 integraHash) external view returns (DocumentRecord memory)
```

Retrieve complete document record.

### Get Document Owner

```solidity
function getDocumentOwner(bytes32 integraHash) external view returns (address)
```

Get the owner of a document.

### Check Document Existence

```solidity
function exists(bytes32 integraHash) external view returns (bool)
```

Check if a document is registered.

### Check Document Ownership

```solidity
function isDocumentOwner(bytes32 integraHash, address account) external view returns (bool)
```

Check if an address is the owner of a document.

### Get Tokenizer

```solidity
function getTokenizer(bytes32 integraHash) external view returns (address)
```

Get the tokenizer associated with a document.

### Get Document Executor

```solidity
function getDocumentExecutor(bytes32 integraHash) external view returns (address)
```

Get the authorized executor for a document.

### Check Authorized Executor

```solidity
function isAuthorizedDocumentExecutor(bytes32 integraHash, address executor) external view returns (bool)
```

Check if an address is the authorized executor for a document.

### Get Additional Resolvers

```solidity
function getAdditionalResolvers(bytes32 integraHash) external view returns (bytes32[] memory)
```

Get all additional resolvers for a document.

### Get Effective Resolver Gas Limit

```solidity
function getEffectiveResolverGasLimit(bytes32 resolverId, bool isPrimary)
    external view returns (uint256 gasLimit, bool isOverride)
```

Get the effective gas limit that will be used for a resolver.

### Get Emergency Status

```solidity
function getEmergencyStatus()
    external view returns (bool active, uint256 expiresAt, address emergencyAddr)
```

Get emergency address status and expiry information.

### Get Fee Configuration

```solidity
function getFeeConfiguration()
    external view returns (
        uint256 currentFee,
        address recipient,
        bool disabled,
        uint256 maxFee,
        uint256 totalCollected
    )
```

Get current fee configuration.

### Batch View Functions

```solidity
function getDocumentsBatch(bytes32[] calldata integraHashes)
    external view returns (DocumentRecord[] memory)

function existsBatch(bytes32[] calldata integraHashes)
    external view returns (bool[] memory)

function getDocumentOwnersBatch(bytes32[] calldata integraHashes)
    external view returns (address[] memory)

function getDocumentExecutorsBatch(bytes32[] calldata integraHashes)
    external view returns (address[] memory)
```

Batch query functions for off-chain systems, indexers, and dashboards.

## Events

### DocumentRegistered

```solidity
event DocumentRegistered(
    bytes32 indexed integraHash,
    bytes32 indexed documentHash,
    bytes32 indexed referenceHash,
    address owner,
    address tokenizer,
    address authorizedExecutor,
    bytes32 processHash,
    bytes32 identityExtension,
    uint256 timestamp
)
```

Emitted when a document is registered.

### DocumentReferenced

```solidity
event DocumentReferenced(
    bytes32 indexed childHash,
    bytes32 indexed parentHash,
    uint256 timestamp
)
```

Emitted when a document references a parent document.

### DocumentOwnershipTransferred

```solidity
event DocumentOwnershipTransferred(
    bytes32 indexed integraHash,
    address indexed oldOwner,
    address indexed newOwner,
    string reason,
    uint256 timestamp
)
```

Emitted when document ownership is transferred.

### Resolver Events

```solidity
event PrimaryResolverSet(
    bytes32 indexed integraHash,
    bytes32 indexed resolverId,
    address indexed owner,
    uint256 timestamp
)

event AdditionalResolverAdded(
    bytes32 indexed integraHash,
    bytes32 indexed resolverId,
    address indexed owner,
    uint256 timestamp
)

event AdditionalResolverRemoved(
    bytes32 indexed integraHash,
    bytes32 indexed resolverId,
    address indexed owner,
    uint256 timestamp
)

event ResolversLocked(
    bytes32 indexed integraHash,
    address indexed owner,
    uint256 timestamp
)

event ResolversEmergencyUnlocked(
    bytes32 indexed integraHash,
    address indexed unlocker,
    string justification,
    uint256 timestamp,
    bool wasEmergencyAddress,
    bool beforeExpiry
)
```

### Executor Events

```solidity
event DocumentExecutorAuthorized(
    bytes32 indexed integraHash,
    address indexed executor,
    address indexed owner,
    bool isContract,
    uint256 timestamp
)

event DocumentExecutorRevoked(
    bytes32 indexed integraHash,
    address indexed executor,
    address indexed owner,
    uint256 timestamp
)

event ExecutorApproved(
    address indexed executor,
    bool approved,
    string name,
    uint256 timestamp
)
```

### Fee Events

```solidity
event FeeCollected(
    bytes32 indexed integraHash,
    address indexed payer,
    uint256 amount,
    address recipient,
    uint256 timestamp
)

event RegistrationFeeUpdated(
    uint256 oldFee,
    uint256 newFee,
    address indexed updatedBy,
    uint256 timestamp
)

event FeesEmergencyDisabled(
    address indexed disabler,
    string justification,
    uint256 timestamp,
    bool wasEmergencyAddress,
    bool beforeExpiry
)

event FeesReenabled(
    address indexed enabler,
    uint256 timestamp
)
```

### Resolver Call Events

```solidity
event PrimaryResolverCalled(
    bytes32 indexed integraHash,
    bytes32 indexed resolverId,
    bytes4 selector
)

event AdditionalResolverCalled(
    bytes32 indexed integraHash,
    bytes32 indexed resolverId,
    bytes4 selector
)

event PrimaryResolverUnavailable(
    bytes32 indexed integraHash,
    bytes32 indexed resolverId
)

event PrimaryResolverFailed(
    bytes32 indexed integraHash,
    bytes32 indexed resolverId,
    string reason
)

event AdditionalResolverFailed(
    bytes32 indexed integraHash,
    bytes32 indexed resolverId,
    string reason
)
```

## Security Considerations

### Immutability

The contract is immutable and cannot be upgraded. This provides:

**Benefits**:
- No upgrade attacks
- Permanent infrastructure
- Predictable behavior
- Reduced governance risk

**Bug Mitigation**:
- Emergency pause (governance)
- Emergency fee disable (6 months)
- Emergency resolver unlock (6 months)
- Graceful degradation (resolver code hash check)

### Access Control

Multiple layers of access control:

1. **Document Owner**: Full control over their documents
2. **Authorized Executor**: Limited delegation by owner
3. **Emergency Address**: Time-limited emergency powers (6 months)
4. **Governance**: Long-term protocol administration

### Attack Vectors

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

**Reentrancy**:
- Mitigation: ReentrancyGuard on all state-changing functions
- Mitigation: CEI pattern (Checks-Effects-Interactions)
- Mitigation: Immediate fee transfer (no balance accumulation)

## Integration Guide

### Basic Integration

```solidity
import "@integra/contracts/layer2/IntegraDocumentRegistry_Immutable.sol";

contract MyIntegration {
    IntegraDocumentRegistry_Immutable public documentRegistry;

    constructor(address _documentRegistry) {
        documentRegistry = IntegraDocumentRegistry_Immutable(_documentRegistry);
    }

    function registerMyDocument(
        bytes32 documentHash,
        address tokenizer
    ) external payable {
        bytes32 integraHash = keccak256(
            abi.encodePacked(documentHash, msg.sender, block.timestamp)
        );

        uint256 fee = documentRegistry.registrationFee();
        require(msg.value >= fee, "Insufficient fee");

        documentRegistry.registerDocument{value: fee}(
            integraHash,
            documentHash,
            bytes32(0),  // No identity extension
            bytes32(0),  // No parent reference
            [uint256(0), uint256(0)],
            [[uint256(0), uint256(0)], [uint256(0), uint256(0)]],
            [uint256(0), uint256(0)],
            tokenizer,
            bytes32(0),  // No primary resolver
            address(0),  // No executor
            keccak256("MyProcess")
        );
    }
}
```

### Listening to Events

```typescript
const documentRegistry = new ethers.Contract(
    documentRegistryAddress,
    documentRegistryABI,
    provider
);

// Listen for document registrations
documentRegistry.on("DocumentRegistered", (
    integraHash,
    documentHash,
    referenceHash,
    owner,
    tokenizer,
    authorizedExecutor,
    processHash,
    identityExtension,
    timestamp,
    event
) => {
    console.log("Document registered:", {
        integraHash,
        owner,
        timestamp: new Date(timestamp * 1000)
    });
});

// Listen for ownership transfers
documentRegistry.on("DocumentOwnershipTransferred", (
    integraHash,
    oldOwner,
    newOwner,
    reason,
    timestamp,
    event
) => {
    console.log("Ownership transferred:", {
        integraHash,
        from: oldOwner,
        to: newOwner,
        reason
    });
});
```

### Batch Operations

```solidity
// Register 50 documents in one transaction
bytes32[] memory hashes = new bytes32[](50);
bytes32[] memory docHashes = new bytes32[](50);
// ... populate arrays

documentRegistry.registerDocumentBatch{value: fee * 50}(
    hashes,
    docHashes,
    new bytes32[](50),  // No extensions
    new address[](50),  // No tokenizers
    new bytes32[](50),  // No resolvers
    address(0),         // No executor
    new bytes32[](50),  // Process hashes
    false              // Don't call resolver hooks
);
```

## Best Practices

### For Document Owners

1. **Resolver Selection**: Carefully choose resolvers, verify code before locking
2. **Executor Authorization**: Only authorize trusted executors, revoke when done
3. **Identity Extension**: Plan usage before setting
4. **Lock Consideration**: Only lock resolvers if truly permanent

### For Developers

1. **Fee Handling**: Always check current fee before registration
2. **Error Handling**: Handle all possible errors gracefully
3. **Event Monitoring**: Subscribe to relevant events for state changes
4. **Batch Operations**: Use batch functions for multi-document operations

### For Governance

1. **Resolver Approval**: Audit resolvers before registration
2. **Fee Setting**: Start at 0, increase gradually based on adoption
3. **Emergency Use**: Only use emergency powers when absolutely necessary
4. **Gas Limits**: Set appropriate defaults and overrides per resolver

## Testing

### Unit Tests

```solidity
contract DocumentRegistryTest is Test {
    IntegraDocumentRegistry_Immutable registry;

    function testRegisterDocument() public {
        bytes32 hash = keccak256("document");

        registry.registerDocument(
            hash,
            keccak256("content"),
            bytes32(0),
            bytes32(0),
            [uint256(0), uint256(0)],
            [[uint256(0), uint256(0)], [uint256(0), uint256(0)]],
            [uint256(0), uint256(0)],
            address(0),
            bytes32(0),
            address(0),
            keccak256("process")
        );

        assertTrue(registry.exists(hash));
        assertEq(registry.getDocumentOwner(hash), address(this));
    }
}
```

### Integration Tests

Test full document lifecycle with resolvers, tokenizers, and executors.

## Formal Verification

The contract undergoes formal verification with Certora to prove:

1. **Ownership Integrity**: Only owners can transfer their documents
2. **Executor Authorization**: Executors cannot exceed their permissions
3. **Fee Bounds**: Fees always within [0, MAX_REGISTRATION_FEE]
4. **Emergency Expiry**: Emergency powers expire after 6 months
5. **Resolver Lock**: Locked resolvers cannot be modified (except emergency)

## Deployment

### Constructor Parameters

```solidity
constructor(
    address _governor,              // Governance address
    address _verifierRegistry,      // ZK verifier registry
    address _resolverRegistry,      // Resolver registry
    address _emergencyAddress,      // Emergency multisig (6 months)
    address _feeRecipient,          // Fee recipient (IMMUTABLE)
    uint256 _initialRegistrationFee // Initial fee (recommend 0)
)
```

### Deployment Script

```solidity
// Deploy dependencies first
IntegraVerifierRegistry_Immutable verifierRegistry = new IntegraVerifierRegistry_Immutable(governor);
IntegraResolverRegistry_Immutable resolverRegistry = new IntegraResolverRegistry_Immutable(governor);

// Deploy document registry
IntegraDocumentRegistry_Immutable documentRegistry = new IntegraDocumentRegistry_Immutable(
    governorAddress,
    address(verifierRegistry),
    address(resolverRegistry),
    emergencyMultisigAddress,  // Gnosis Safe recommended
    feeRecipientMultisigAddress,  // Gnosis Safe recommended
    0  // Start with free registration
);
```

### Post-Deployment

1. Verify contract on block explorer
2. Approve initial tokenizers
3. Register initial resolvers
4. Approve Integra backend executor (if applicable)
5. Configure monitoring and alerting
6. Document deployment addresses

## Resources

- [Source Code](https://github.com/IntegraLedger/smart-contracts-evm-v7/blob/main/src/layer2/IntegraDocumentRegistry_Immutable.sol)
- [Resolver Registry Documentation](./resolver-registry)
- [Integration Guide](./guides/layer2-integration)
- [Security Audit](./audits/layer2)

## Support

- **Security Issues**: security@integra.io
- **Technical Support**: docs@integra.io
- **GitHub**: https://github.com/IntegraLedger/smart-contracts-evm-v7
