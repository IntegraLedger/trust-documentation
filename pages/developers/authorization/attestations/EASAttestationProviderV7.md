# EASAttestationProviderV7

## Overview

**Version**: 7.0.0
**Type**: UUPS Upgradeable Contract
**License**: MIT
**Inherits**: UUPSUpgradeable, AccessControlUpgradeable, PausableUpgradeable, IAttestationProvider

EASAttestationProviderV7 is the EAS-based implementation of IAttestationProvider with comprehensive 13-step verification. It provides robust attestation verification for the Integra V7 architecture using Ethereum Attestation Service.

### Purpose

- Implement IAttestationProvider interface for EAS attestations
- Perform comprehensive 13-step verification process
- Manage attestation issuers with owner override capabilities
- Prevent cross-chain replay attacks
- Validate attestation freshness and integrity

### Key Features

- 13-step verification with chain context validation
- Cross-chain replay prevention through chain ID validation
- EAS contract verification to prevent spoofing
- Document contract binding for security
- Issuer authorization with owner override
- Optional attestation age limits
- Batch issuer management
- Pausable for emergency stops

## Architecture

### Design Philosophy

**Why Upgradeable?**

Unlike immutable registries, the provider is upgradeable to:
1. Fix bugs in verification logic
2. Optimize gas costs
3. Add new verification features
4. Update to new EAS versions

**Security Through Layers**:
```
Defense Layer 1: Registry code hash validation (prevents malicious provider)
Defense Layer 2: 13-step verification (comprehensive attestation validation)
Defense Layer 3: Issuer authorization (prevents unauthorized attestations)
Defense Layer 4: Chain context validation (prevents replay attacks)
```

### Integration Points

- **AttestationAccessControlV7 (Foundation)**: Calls verifyCapabilities()
- **EAS Contract**: Fetches attestations
- **CapabilityNamespaceV7 (Foundation)**: References capability definitions
- **Document Contracts**: Validates contract binding

## Key Concepts

### 1. 13-Step Verification Process

Comprehensive validation ensuring attestation integrity:

```
1.  Fetch attestation from EAS
2.  Verify attestation exists
3.  Verify not revoked
4.  Verify not expired
5.  Verify schema matches
6.  Verify recipient matches (front-running protection)
7.  Verify attester is authorized issuer
8.  Verify source chain ID matches (replay prevention)
9.  Verify source EAS contract matches (spoofing prevention)
10. Verify document contract matches (contract binding)
11. Verify schema version matches (version validation)
12. Verify document hash matches
13. Verify attestation not too old (optional age validation)
```

**Why 13 Steps?**

Each step addresses a specific attack vector:
- Steps 1-5: Basic EAS attestation validation
- Step 6: Front-running protection
- Step 7: Authorization validation
- Steps 8-10: Replay and spoofing prevention
- Step 11: Schema version validation
- Step 12: Document binding
- Step 13: Freshness validation

### 2. EAS Schema Format

Uses INTEGRA_CAPABILITY schema with 14 fields:

```solidity
struct IntegraCapabilityAttestation {
    bytes32 documentHash;           // Document identifier
    uint256 tokenId;                // Token ID (if applicable)
    uint256 capabilities;           // Capability bitmask
    string verifiedIdentity;        // Verified identity info
    string verificationMethod;      // How identity was verified
    uint256 verificationDate;       // When identity was verified
    string contractRole;            // Role in contract (e.g., "Buyer", "Seller")
    string legalEntityType;         // Entity type (e.g., "Individual", "Corporation")
    string notes;                   // Additional notes
    uint256 sourceChainId;          // Chain ID (replay prevention)
    address sourceEASContract;      // EAS contract address (spoofing prevention)
    address documentContract;       // Document contract address (binding)
    uint64 issuedAt;                // Issuance timestamp (age validation)
    bytes32 attestationVersion;     // Schema version (version validation)
}
```

### 3. Issuer Management

Three-level issuer hierarchy:

1. **Default Issuer**: Set by governor for document
2. **Owner Override**: Document owner can override default
3. **Revocation**: Owner can revoke all issuers

```solidity
Priority:
1. Check if revoked → return address(0)
2. Check owner-set issuer → return if exists
3. Return default issuer
```

**Use Cases**:
- Governor sets default issuer (trusted KYC provider)
- Owner overrides for self-attestation
- Owner revokes if issuer compromised

### 4. Chain Context Validation

Prevents cross-chain replay attacks:

```solidity
// Attestation includes:
uint256 sourceChainId;      // Chain where attestation was created
address sourceEASContract;  // EAS contract address
address documentContract;   // Document contract address

// Verification checks:
require(sourceChainId == block.chainid, "Wrong chain");
require(sourceEASContract == address(eas), "Wrong EAS");
require(documentContract == msg.sender, "Wrong contract");
```

**Attack Prevention**:
- Cannot replay attestation from another chain
- Cannot use attestation on different contract
- Cannot spoof with fake EAS contract

## State Variables

### Constants

```solidity
string public constant VERSION = "7.0.0";
bytes32 public constant PROVIDER_TYPE = keccak256("EAS");
bytes32 public constant SCHEMA_VERSION = keccak256("INTEGRA_CAPABILITY_V7.0.0");
uint256 public constant MIN_ATTESTATION_AGE = 1 hours;
uint256 public constant MAX_ATTESTATION_AGE_LIMIT = 365 days;
```

### Roles

```solidity
bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
```

### Immutable References

```solidity
IEAS public eas;                                        // EAS contract instance
bytes32 public accessCapabilitySchema;                  // Capability schema UID
CapabilityNamespaceV7_Immutable public NAMESPACE;       // Capability namespace
```

Set during initialization, treated as immutable.

### Issuer State

```solidity
mapping(bytes32 => address) public documentIssuers;     // Default issuers
mapping(bytes32 => address) public ownerSetIssuers;     // Owner overrides
mapping(bytes32 => uint256) public issuerRevokedAt;     // Revocation timestamps
```

### Configuration

```solidity
uint256 public maxAttestationAge;  // Optional age limit (0 = no limit)
```

## Functions

### Initialization

```solidity
function initialize(
    address _eas,
    bytes32 _accessCapabilitySchema,
    address _namespace,
    address _governor
) external initializer
```

Initialize EAS Attestation Provider.

**Parameters**:
- `_eas`: EAS contract address
- `_accessCapabilitySchema`: Capability schema UID
- `_namespace`: CapabilityNamespaceV7_Immutable address
- `_governor`: Governor address

**Validation**:
- All addresses non-zero
- Schema UID non-zero

**Example**:
```solidity
provider.initialize(
    easAddress,
    schemaUID,
    namespaceAddress,
    governorAddress
);
```

### IAttestationProvider Implementation

#### verifyCapabilities

```solidity
function verifyCapabilities(
    bytes calldata proof,
    address recipient,
    bytes32 documentHash,
    uint256 requiredCapability
) external view override returns (bool verified, uint256 grantedCapabilities)
```

Verify capabilities using EAS attestation (13-step process).

**Parameters**:
- `proof`: EAS attestation UID (encoded as bytes)
- `recipient`: Address that should have capabilities
- `documentHash`: Document identifier
- `requiredCapability`: Required capability (for optimization)

**Proof Format**:
```solidity
bytes memory proof = abi.encode(attestationUID);
```

**Returns**:
- `verified`: Whether attestation is valid
- `grantedCapabilities`: Capabilities granted in attestation

**Verification Steps**:
1. Decode attestation UID from proof
2. Run 13-step verification (see _verifyCapabilityInternal)
3. Return verified status and capabilities

**Example**:
```solidity
bytes32 attestationUID = 0x123...;
bytes memory proof = abi.encode(attestationUID);

(bool verified, uint256 caps) = provider.verifyCapabilities(
    proof,
    userAddress,
    documentHash,
    NAMESPACE.CORE_CLAIM()
);

require(verified, "Verification failed");
require(NAMESPACE.hasCapability(caps, NAMESPACE.CORE_CLAIM()), "Insufficient caps");
```

#### getProviderInfo

```solidity
function getProviderInfo()
    external
    pure
    override
    returns (string memory name, string memory version, bytes32 providerType)
```

Get provider information.

**Returns**:
- `name`: "EAS Attestation Provider V7"
- `version`: "7.0.0"
- `providerType`: keccak256("EAS")

#### supportsMethod

```solidity
function supportsMethod(bytes32 methodId)
    external
    pure
    override
    returns (bool)
```

Check if provider supports a method.

**Parameters**:
- `methodId`: Method identifier (keccak256 of method name)

**Returns**: Whether method is supported

**Example**:
```solidity
bool supported = provider.supportsMethod(keccak256("verifyCapabilities"));
// Returns: true
```

### Issuer Management

#### setDocumentIssuer

```solidity
function setDocumentIssuer(bytes32 documentHash, address issuer)
    external
    onlyRole(GOVERNOR_ROLE)
```

Set document issuer (governor only).

**Parameters**:
- `documentHash`: Hash of the document
- `issuer`: Address authorized to issue attestations

**Validation**:
- Issuer is not zero address
- Document issuer not revoked by owner

**Events**: Emits `DocumentIssuerSet`

**Example**:
```solidity
provider.setDocumentIssuer(
    documentHash,
    kycProviderAddress
);
```

#### setDocumentIssuersBatch

```solidity
function setDocumentIssuersBatch(
    bytes32[] calldata documentHashes,
    address[] calldata issuers
) external onlyRole(GOVERNOR_ROLE)
```

Batch set document issuers (gas-efficient).

**Parameters**:
- `documentHashes`: Array of document hashes
- `issuers`: Array of issuer addresses (must match length)

**Example**:
```solidity
bytes32[] memory docs = new bytes32[](100);
address[] memory issuers = new address[](100);
// Fill arrays...

provider.setDocumentIssuersBatch(docs, issuers);
```

#### setDocumentIssuerByOwner

```solidity
function setDocumentIssuerByOwner(
    bytes32 documentHash,
    address issuer,
    address owner
) external
```

Allow document owner to set issuer (overrides default).

**Parameters**:
- `documentHash`: Hash of the document
- `issuer`: Address authorized to issue attestations
- `owner`: Address of the document owner

**Authorization**: Caller MUST be the document owner

**Effects**:
- Sets owner-specific issuer
- Clears any previous revocation

**Events**: Emits `DocumentIssuerSet`

**Example**:
```solidity
// Owner calls from document contract
documentContract.setDocumentIssuerByOwner(
    documentHash,
    selfIssuerAddress,
    msg.sender
);
```

#### revokeDocumentIssuer

```solidity
function revokeDocumentIssuer(bytes32 documentHash, address owner)
    external
```

Revoke document issuer (owner only).

**Parameters**:
- `documentHash`: Hash of the document
- `owner`: Address of the document owner

**Authorization**: Caller MUST be the document owner

**Effects**:
- Records revocation timestamp
- Deletes both default and owner-set issuers
- All attestations from this issuer become invalid

**Events**: Emits `DocumentIssuerRevoked`

**Example**:
```solidity
// Owner revokes compromised issuer
provider.revokeDocumentIssuer(documentHash, msg.sender);
```

#### restoreDocumentIssuer

```solidity
function restoreDocumentIssuer(
    bytes32 documentHash,
    address issuer,
    address owner
) external
```

Restore document issuer after revocation.

**Parameters**:
- `documentHash`: Hash of the document
- `issuer`: Address authorized to issue attestations
- `owner`: Address of the document owner

**Authorization**: Caller MUST be the document owner
**Precondition**: Issuer must have been revoked

**Effects**:
- Clears revocation
- Sets new owner-specific issuer

**Events**: Emits `DocumentIssuerSet`

**Example**:
```solidity
// After resolving security issue
provider.restoreDocumentIssuer(
    documentHash,
    trustedIssuerAddress,
    msg.sender
);
```

### Configuration

#### setMaxAttestationAge

```solidity
function setMaxAttestationAge(uint256 newMaxAge)
    external
    onlyRole(GOVERNOR_ROLE)
```

Set maximum attestation age.

**Parameters**:
- `newMaxAge`: Maximum age in seconds (0 = no limit)

**Validation**:
- If non-zero, must be >= MIN_ATTESTATION_AGE (1 hour)
- If non-zero, must be <= MAX_ATTESTATION_AGE_LIMIT (365 days)

**Events**: Emits `MaxAttestationAgeUpdated`

**Example**:
```solidity
// Require attestations less than 30 days old
provider.setMaxAttestationAge(30 days);

// Remove age limit
provider.setMaxAttestationAge(0);
```

### View Functions

#### getDocumentIssuer

```solidity
function getDocumentIssuer(bytes32 documentHash)
    external
    view
    returns (address)
```

Get active issuer for document.

**Returns**: Active issuer address (or address(0) if revoked/not set)

#### getActiveIssuer

```solidity
function getActiveIssuer(bytes32 documentHash)
    external
    view
    returns (address issuer, bool isOwnerSet, bool isRevoked)
```

Get detailed issuer information.

**Returns**:
- `issuer`: Active issuer address
- `isOwnerSet`: Whether issuer is owner-set (vs default)
- `isRevoked`: Whether issuer has been revoked

**Example**:
```solidity
(address issuer, bool ownerSet, bool revoked) = provider.getActiveIssuer(documentHash);

if (revoked) {
    console.log("Issuer revoked by owner");
} else if (ownerSet) {
    console.log("Using owner-set issuer:", issuer);
} else {
    console.log("Using default issuer:", issuer);
}
```

#### getCurrentChainId

```solidity
function getCurrentChainId() external view returns (uint256)
```

Get current chain ID.

**Returns**: block.chainid

#### getEASAddress

```solidity
function getEASAddress() external view returns (address)
```

Get EAS contract address.

**Returns**: address(eas)

### Emergency Functions

#### pause / unpause

```solidity
function pause() external onlyRole(GOVERNOR_ROLE)
function unpause() external onlyRole(GOVERNOR_ROLE)
```

Pause/unpause provider (emergency stop).

**Effects**:
- When paused, verifyCapabilities() reverts
- All capability verification stops

**Use Cases**:
- Critical bug discovered
- EAS contract compromised
- Emergency security response

## Events

### DocumentIssuerSet

```solidity
event DocumentIssuerSet(
    bytes32 indexed documentHash,
    address indexed issuer,
    address indexed setBy,
    bool isOwnerOverride,
    uint256 timestamp
)
```

Emitted when document issuer is set.

### DocumentIssuerRevoked

```solidity
event DocumentIssuerRevoked(
    bytes32 indexed documentHash,
    address indexed previousIssuer,
    address indexed revokedBy,
    uint256 timestamp
)
```

Emitted when document issuer is revoked.

### MaxAttestationAgeUpdated

```solidity
event MaxAttestationAgeUpdated(
    uint256 oldAge,
    uint256 newAge,
    uint256 timestamp
)
```

Emitted when max attestation age is updated.

## Security Considerations

### 13-Step Verification Security

Each step prevents specific attacks:

| Step | Attack Prevention |
|------|-------------------|
| 1-2 | Non-existent attestations |
| 3 | Revoked attestations |
| 4 | Expired attestations |
| 5 | Wrong schema (data format mismatch) |
| 6 | Front-running (attestation theft) |
| 7 | Unauthorized issuers |
| 8 | Cross-chain replay attacks |
| 9 | EAS contract spoofing |
| 10 | Contract spoofing/misuse |
| 11 | Schema version mismatch |
| 12 | Document mismatching |
| 13 | Stale attestations |

### Issuer Security

**Authorization Model**:
```
1. Governor sets default issuer (trusted KYC provider)
2. Owner can override (self-attestation)
3. Owner can revoke (emergency response)
```

**Attack Scenarios**:

**Scenario 1: Compromised Default Issuer**
- Owner calls revokeDocumentIssuer()
- All attestations from issuer become invalid
- Owner sets new trusted issuer

**Scenario 2: Malicious Owner Override**
- Owner overrides with malicious issuer
- Only affects their documents
- Governor can still manage default issuer

**Best Practices**:
1. Vet default issuers carefully
2. Monitor issuer changes via events
3. Have issuer rotation plan
4. Support multiple issuers for redundancy

### Cross-Chain Replay Prevention

**Chain Context Validation**:

```solidity
// Attestation created on Chain A (e.g., Ethereum)
sourceChainId = 1
sourceEASContract = 0xEAS_Ethereum
documentContract = 0xDoc_Ethereum

// Attack: Try to replay on Chain B (e.g., Polygon)
// Verification will fail:
require(sourceChainId == block.chainid)  // 1 != 137 (Polygon)
```

**Additional Protection**:
- EAS contract address differs per chain
- Document contract address differs per chain
- All three must match for verification to succeed

### Attestation Freshness

**Age Limit Configuration**:

```solidity
// No age limit (default)
maxAttestationAge = 0

// 30-day limit
maxAttestationAge = 30 days

// Verification:
if (maxAttestationAge > 0) {
    require(block.timestamp - issuedAt <= maxAttestationAge)
}
```

**Use Cases**:
- KYC attestations (require recent verification)
- Temporary permissions (expire after period)
- Security-sensitive operations (require fresh attestations)

**Trade-offs**:
- Stricter age limits → more secure but higher maintenance
- No age limits → convenient but potentially stale data

## Usage Examples

### Basic Verification

```solidity
// 1. User gets EAS attestation off-chain
// 2. User calls function with attestation UID

function claimToken(bytes32 documentHash, bytes32 easUID)
    external
    requiresCapabilityWithUID(documentHash, NAMESPACE.CORE_CLAIM(), easUID)
    nonReentrant
{
    // attestationProof is automatically encoded as abi.encode(easUID)
    // Provider verifies:
    // - Attestation exists and valid
    // - User is recipient
    // - Capabilities are sufficient
    // - All 13 steps pass

    _mint(msg.sender, tokenId);
}
```

### Issuer Management Flow

```solidity
// 1. Governor sets default issuer (KYC provider)
provider.setDocumentIssuer(documentHash, kycProviderAddress);

// 2. KYC provider creates attestation for user
// (Off-chain process)

// 3. User uses attestation
contract.claimToken(documentHash, easUID);

// 4. Later: Owner wants self-attestation
provider.setDocumentIssuerByOwner(documentHash, ownerAddress, ownerAddress);

// 5. Emergency: Issuer compromised
provider.revokeDocumentIssuer(documentHash, ownerAddress);

// 6. Recovery: Set new issuer
provider.restoreDocumentIssuer(documentHash, newIssuerAddress, ownerAddress);
```

### Batch Issuer Setup

```solidity
// Setup issuers for 100 documents efficiently
bytes32[] memory docs = new bytes32[](100);
address[] memory issuers = new address[](100);

for (uint i = 0; i < 100; i++) {
    docs[i] = documentHashes[i];
    issuers[i] = kycProviderAddress;
}

provider.setDocumentIssuersBatch(docs, issuers);
// Gas savings: ~50% vs individual calls
```

### Age-Limited Attestations

```solidity
// Require KYC attestations less than 90 days old
provider.setMaxAttestationAge(90 days);

// User's attestation
issuedAt = attestation.issuedAt;  // Timestamp when attestation was created
age = block.timestamp - issuedAt;

// Verification will fail if:
if (age > 90 days) {
    revert AttestationTooOld(issuedAt, 90 days);
}

// User must get new attestation from issuer
```

## Integration Guide

### Deployment

```solidity
// 1. Deploy EAS (or use existing)
EAS eas = EAS(easAddress);

// 2. Register schema
SchemaRegistry registry = SchemaRegistry(schemaRegistryAddress);
bytes32 schemaUID = registry.register(SCHEMA_DEFINITION, resolver, true);

// 3. Deploy provider
EASAttestationProviderV7 provider = new EASAttestationProviderV7();

// 4. Initialize provider
provider.initialize(
    address(eas),
    schemaUID,
    namespaceAddress,
    governorAddress
);

// 5. Register in provider registry
providerRegistry.registerProvider(
    keccak256("EAS_V1"),
    address(provider),
    "EAS",
    "EAS Attestation Provider V1"
);
```

### Creating Attestations

```javascript
// Off-chain: Create attestation
const attestation = {
    schema: schemaUID,
    data: {
        recipient: userAddress,
        expirationTime: 0, // No expiration
        revocable: true,
        refUID: ethers.constants.HashZero,
        data: ethers.utils.defaultAbiCoder.encode(
            [
                "bytes32", "uint256", "uint256", "string", "string",
                "uint256", "string", "string", "string", "uint256",
                "address", "address", "uint64", "bytes32"
            ],
            [
                documentHash,
                tokenId,
                capabilities,
                "John Doe",
                "Government ID",
                Date.now(),
                "Buyer",
                "Individual",
                "KYC verified",
                chainId,
                easAddress,
                documentContractAddress,
                Math.floor(Date.now(./ 1000),
                schemaVersion
            ]
        )
    }
};

// Issuer creates attestation
const tx = await eas.connect(issuer).attest(attestation);
const receipt = await tx.wait();
const easUID = receipt.events[0].args.uid;

// User can now use easUID in contract calls
```

### Testing

```javascript
const provider = await ethers.getContractAt("EASAttestationProviderV7", providerAddress);

// Set issuer
await provider.connect(governor).setDocumentIssuer(documentHash, issuer.address);

// Create test attestation
const easUID = await createTestAttestation(documentHash, user.address, capabilities);

// Verify capabilities
const proof = ethers.utils.defaultAbiCoder.encode(["bytes32"], [easUID]);
const [verified, grantedCaps] = await provider.verifyCapabilities(
    proof,
    user.address,
    documentHash,
    requiredCapability
);

expect(verified).to.be.true;
expect(grantedCaps).to.equal(capabilities);
```

## References

- [Foundation Overview](./overview.md)
- [CapabilityNamespaceV7_Immutable](./CapabilityNamespaceV7_Immutable.md)
- [EAS Documentation](https://docs.attest.sh/)
