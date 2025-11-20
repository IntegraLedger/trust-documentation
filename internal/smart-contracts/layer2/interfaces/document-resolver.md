# IDocumentResolver Interface

## Overview

IDocumentResolver is the standard interface for document resolver contracts. Resolvers provide optional services for documents beyond basic tokenization, including lifecycle management, communication endpoints, compliance checks, payment automation, and governance controls.

**Version**: 7.0.0
**Solidity**: 0.8.28
**License**: MIT

## Purpose

Resolvers enable smart contracts to govern document behavior beyond tokenization:

- **Tokenizer** answers: "How is economic value represented?" (ERC-721, ERC-1155, etc.)
- **Resolver** answers: "What rules govern this contract?" (expiry, conditions, automation)

## Philosophy

Resolvers are **OPTIONAL** - most documents won't need them. Resolvers **CANNOT** override owner sovereignty. Resolvers are for automation, not for restricting owners.

## Resolver Types

### Lifecycle
Document expiry, renewal, and archival management.

**Use Cases**:
- Lease agreements with auto-expiry
- Subscription documents with renewal logic
- Time-limited permits
- Version management

**Example Implementation**: `LeaseExpiryResolverV7`

### Communication
Contact endpoints and messaging services.

**Use Cases**:
- Email for lease documents
- Phone for emergency contacts
- URL for API endpoints
- Encrypted contact information

**Example Implementation**: `SimpleContactResolver`

### Compliance
Regulatory requirements and KYC/AML checks.

**Use Cases**:
- Accredited investor verification
- Jurisdictional restrictions
- KYC/AML compliance
- Transfer whitelist enforcement

**Example Implementation**: `KYCComplianceResolverV7`

### Payment
Payment automation and escrow management.

**Use Cases**:
- Automated payment requests
- Escrow with conditional release
- Invoice generation
- Subscription billing

**Example Implementation**: `EscrowPaymentResolverV7`

### Governance
DAO controls and multi-party governance.

**Use Cases**:
- DAO-controlled documents
- Multi-sig requirements
- Proposal voting
- Time-lock delays

**Example Implementation**: `DAOGovernanceResolverV7`

### Multi-Purpose
Combination of multiple resolver types.

**Use Cases**:
- Lifecycle + Compliance
- Communication + Payment
- Governance + Compliance

**Example Implementation**: `EnterpriseResolverV7`

## Interface Methods

### Lifecycle Hooks

#### onDocumentRegistered

```solidity
function onDocumentRegistered(
    bytes32 integraHash,
    bytes32 documentHash,
    address owner,
    bytes calldata data
) external
```

Called when a document is registered.

**Use Cases**:
- Initialization logic
- Cross-contract coordination
- Event logging
- Setting initial state

**Security**: Can revert to prevent registration

**Parameters**:
- `integraHash`: Document identifier
- `documentHash`: Content hash
- `owner`: Document owner
- `data`: Additional registration data (abi.encode of arbitrary data)

**Example Implementation**:
```solidity
function onDocumentRegistered(
    bytes32 integraHash,
    bytes32 documentHash,
    address owner,
    bytes calldata data
) external override {
    // Parse additional data
    (address tokenizer, address executor, bytes32 processHash) =
        abi.decode(data, (address, address, bytes32));

    // Initialize resolver state
    documentExpiry[integraHash] = block.timestamp + 365 days;
    documentOwners[integraHash] = owner;

    emit DocumentInitialized(integraHash, owner, documentExpiry[integraHash]);
}
```

#### onDocumentTransferred

```solidity
function onDocumentTransferred(
    bytes32 integraHash,
    address from,
    address to
) external
```

Called when document ownership transfers.

**Use Cases**:
- Access control updates
- Notification systems
- Transfer history tracking
- Permission migration

**Security**: Can revert to prevent transfer (e.g., whitelist enforcement)

**Parameters**:
- `integraHash`: Document identifier
- `from`: Previous owner
- `to`: New owner

**Example Implementation**:
```solidity
function onDocumentTransferred(
    bytes32 integraHash,
    address from,
    address to
) external override {
    // Update internal state
    documentOwners[integraHash] = to;

    // Notify external systems
    notificationService.sendTransferNotification(integraHash, from, to);

    emit OwnershipUpdated(integraHash, from, to);
}
```

#### onTokenizerAssociated

```solidity
function onTokenizerAssociated(
    bytes32 integraHash,
    address tokenizer
) external
```

Called when a tokenizer is associated with a document.

**Use Cases**:
- Tokenizer validation
- Token initialization
- Coordination between resolver and tokenizer

**Parameters**:
- `integraHash`: Document identifier
- `tokenizer`: Tokenizer being associated

**Example Implementation**:
```solidity
function onTokenizerAssociated(
    bytes32 integraHash,
    address tokenizer
) external override {
    // Validate tokenizer is approved
    require(approvedTokenizers[tokenizer], "Tokenizer not approved");

    // Store association
    documentTokenizers[integraHash] = tokenizer;

    emit TokenizerLinked(integraHash, tokenizer);
}
```

### Validation

#### canOwnDocument

```solidity
function canOwnDocument(
    bytes32 integraHash,
    address newOwner
) external view returns (bool allowed, string memory reason)
```

Validate if an address can own a document.

**Use Cases**:
- KYC/AML checks
- Accreditation verification
- Jurisdictional restrictions
- Whitelist enforcement

**Security**: Return `false` to prevent ownership transfer

**Parameters**:
- `integraHash`: Document identifier
- `newOwner`: Proposed new owner

**Returns**:
- `allowed`: Whether ownership transfer is allowed
- `reason`: Human-readable reason if denied

**Example Implementation**:
```solidity
function canOwnDocument(
    bytes32 integraHash,
    address newOwner
) external view override returns (bool allowed, string memory reason) {
    // Check KYC status
    if (!kycRegistry.isVerified(newOwner)) {
        return (false, "KYC verification required");
    }

    // Check accreditation
    if (requiresAccreditation[integraHash] && !isAccredited(newOwner)) {
        return (false, "Accredited investor status required");
    }

    // Check jurisdiction
    if (isRestrictedJurisdiction(newOwner)) {
        return (false, "Jurisdiction not permitted");
    }

    return (true, "");
}
```

#### isDocumentExpired

```solidity
function isDocumentExpired(
    bytes32 integraHash
) external view returns (bool expired, uint256 expiryTime)
```

Check if a document has expired.

**Use Cases**:
- Lease agreements
- Subscription documents
- Temporary permits
- Time-limited contracts

**Parameters**:
- `integraHash`: Document identifier

**Returns**:
- `expired`: Whether document is expired
- `expiryTime`: When document expires (0 = no expiry)

**Example Implementation**:
```solidity
function isDocumentExpired(
    bytes32 integraHash
) external view override returns (bool expired, uint256 expiryTime) {
    uint256 expiry = documentExpiry[integraHash];

    if (expiry == 0) {
        return (false, 0); // No expiry set
    }

    return (block.timestamp >= expiry, expiry);
}
```

### Metadata

#### getDocumentMetadata

```solidity
function getDocumentMetadata(
    bytes32 integraHash
) external view returns (string memory metadata)
```

Get additional document metadata.

**Use Cases**:
- IPFS links
- Tags and categories
- Version information
- Custom attributes

**Parameters**:
- `integraHash`: Document identifier

**Returns**:
- `metadata`: Arbitrary metadata (JSON, IPFS hash, etc.)

**Example Implementation**:
```solidity
function getDocumentMetadata(
    bytes32 integraHash
) external view override returns (string memory metadata) {
    // Return JSON metadata
    return string(abi.encodePacked(
        '{"ipfs":"', documentIPFS[integraHash], '",',
        '"category":"', documentCategory[integraHash], '",',
        '"version":"', documentVersion[integraHash], '"}'
    ));
}
```

### Communication (NEW in V7)

#### getContactEndpoint

```solidity
function getContactEndpoint(
    bytes32 integraHash,
    address caller,
    string calldata method
) external view returns (string memory endpoint)
```

Get contact endpoint for a document.

**Use Cases**:
- Email for lease documents
- Phone for emergency contacts
- URL for API endpoints
- Encrypted contact information

**Security**:
- Can return encrypted data (caller must decrypt)
- Can implement access control (e.g., only parties can view)
- Can return different endpoints based on caller

**Method Parameter**:
- `"email"`: Email address
- `"phone"`: Phone number
- `"url"`: Web URL or API endpoint
- `"encrypted"`: Encrypted contact data
- Custom methods supported

**Parameters**:
- `integraHash`: Document identifier
- `caller`: Address requesting endpoint (for access control)
- `method`: Contact method

**Returns**:
- `endpoint`: Contact endpoint (may be encrypted)

**Example Implementation (SimpleContactResolver)**:
```solidity
function getContactEndpoint(
    bytes32 integraHash,
    address caller,
    string calldata method
) external view override returns (string memory endpoint) {
    // Only "url" method supported
    if (keccak256(bytes(method)) == keccak256("url")) {
        return encryptedContactURLs[integraHash];
    }

    return "";
}
```

**Advanced Example (Access Control)**:
```solidity
function getContactEndpoint(
    bytes32 integraHash,
    address caller,
    string calldata method
) external view override returns (string memory endpoint) {
    // Verify caller is authorized
    require(
        caller == documentOwner[integraHash] ||
        isAuthorizedParty[integraHash][caller],
        "Not authorized"
    );

    // Return appropriate endpoint
    if (keccak256(bytes(method)) == keccak256("email")) {
        return documentEmails[integraHash];
    } else if (keccak256(bytes(method)) == keccak256("phone")) {
        return documentPhones[integraHash];
    } else if (keccak256(bytes(method)) == keccak256("url")) {
        return documentURLs[integraHash];
    }

    return "";
}
```

### Automation

#### executeDocumentAction

```solidity
function executeDocumentAction(
    bytes32 integraHash,
    string calldata action,
    bytes calldata data
) external returns (bool success, bytes memory result)
```

Execute automated action on a document.

**Use Cases**:
- Lease expiry: Revoke tenant token, return deposit
- Insurance claim: Verify conditions, trigger payout
- Escrow release: Check conditions, transfer funds
- Renewal: Extend expiry, charge fee

**Security**: Should validate caller and conditions

**Parameters**:
- `integraHash`: Document identifier
- `action`: Action identifier (e.g., "expire", "renew", "claim")
- `data`: Action-specific data

**Returns**:
- `success`: Whether action succeeded
- `result`: Action result data

**Example Implementation (Lease Expiry)**:
```solidity
function executeDocumentAction(
    bytes32 integraHash,
    string calldata action,
    bytes calldata data
) external override returns (bool success, bytes memory result) {
    if (keccak256(bytes(action)) == keccak256("expire")) {
        // Verify document is expired
        (bool expired, ) = isDocumentExpired(integraHash);
        require(expired, "Document not expired");

        // Revoke tenant tokens
        address tokenizer = documentTokenizers[integraHash];
        LeaseTokenizer(tokenizer).revokeAllTokens(integraHash);

        // Return deposit to landlord
        address landlord = documentOwner[integraHash];
        uint256 deposit = documentDeposits[integraHash];
        payable(landlord).transfer(deposit);

        emit LeaseExpired(integraHash, landlord, deposit);

        return (true, abi.encode(landlord, deposit));
    }

    return (false, "");
}
```

**Example Implementation (Insurance Claim)**:
```solidity
function executeDocumentAction(
    bytes32 integraHash,
    string calldata action,
    bytes calldata data
) external override returns (bool success, bytes memory result) {
    if (keccak256(bytes(action)) == keccak256("claim")) {
        // Parse claim data
        (address claimant, uint256 claimAmount, bytes memory proof) =
            abi.decode(data, (address, uint256, bytes));

        // Verify claimant is policyholder
        require(claimant == documentOwner[integraHash], "Not policyholder");

        // Verify claim conditions
        bool valid = verifyClaimConditions(integraHash, claimAmount, proof);
        require(valid, "Claim conditions not met");

        // Process payout
        InsurancePool(insurancePool).payout(claimant, claimAmount);

        emit ClaimProcessed(integraHash, claimant, claimAmount);

        return (true, abi.encode(claimAmount));
    }

    return (false, "");
}
```

### Compliance

#### resolverType

```solidity
function resolverType() external view returns (string memory)
```

Identify resolver type/version for UI display and integration.

**Returns**: Resolver type string (e.g., "Lifecycle", "Communication", "Compliance")

**Example Implementation**:
```solidity
function resolverType() external pure override returns (string memory) {
    return "Communication";
}
```

#### isLegitimateResolver

```solidity
function isLegitimateResolver() external view returns (bool)
```

Check if resolver is legitimate (similar to IIntegraExecutor pattern).

**Returns**: `false` if resolver is malicious/deprecated

**Example Implementation**:
```solidity
function isLegitimateResolver() external pure override returns (bool) {
    return true;
}
```

## Implementation Guide

### Basic Resolver Template

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "../interfaces/IDocumentResolver.sol";

contract MyResolverV7 is IDocumentResolver {
    // ============ STATE VARIABLES ============

    address public documentRegistry;
    mapping(bytes32 => /* custom state */) public documentState;

    // ============ INITIALIZATION ============

    constructor(address _documentRegistry) {
        documentRegistry = _documentRegistry;
    }

    // ============ LIFECYCLE HOOKS ============

    function onDocumentRegistered(
        bytes32 integraHash,
        bytes32 documentHash,
        address owner,
        bytes calldata data
    ) external override {
        // Initialize state
        // emit events
    }

    function onDocumentTransferred(
        bytes32 integraHash,
        address from,
        address to
    ) external override {
        // Update state
        // emit events
    }

    function onTokenizerAssociated(
        bytes32 integraHash,
        address tokenizer
    ) external override {
        // Validate tokenizer
        // emit events
    }

    // ============ VALIDATION ============

    function canOwnDocument(
        bytes32 integraHash,
        address newOwner
    ) external view override returns (bool allowed, string memory reason) {
        // Implement validation logic
        return (true, "");
    }

    function isDocumentExpired(
        bytes32 integraHash
    ) external view override returns (bool expired, uint256 expiryTime) {
        // Implement expiry logic
        return (false, 0);
    }

    // ============ METADATA ============

    function getDocumentMetadata(
        bytes32 integraHash
    ) external view override returns (string memory metadata) {
        // Return JSON metadata
        return "";
    }

    // ============ COMMUNICATION ============

    function getContactEndpoint(
        bytes32 integraHash,
        address caller,
        string calldata method
    ) external view override returns (string memory endpoint) {
        // Return contact endpoint
        return "";
    }

    // ============ AUTOMATION ============

    function executeDocumentAction(
        bytes32 integraHash,
        string calldata action,
        bytes calldata data
    ) external override returns (bool success, bytes memory result) {
        // Execute action
        return (false, "");
    }

    // ============ COMPLIANCE ============

    function resolverType() external pure override returns (string memory) {
        return "Custom";
    }

    function isLegitimateResolver() external pure override returns (bool) {
        return true;
    }
}
```

### UUPS Upgradeable Resolver Template

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "../interfaces/IDocumentResolver.sol";

contract MyResolverV7 is
    UUPSUpgradeable,
    AccessControlUpgradeable,
    IDocumentResolver
{
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    address public documentRegistry;

    function initialize(
        address _documentRegistry,
        address _governor
    ) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        documentRegistry = _documentRegistry;

        _grantRole(DEFAULT_ADMIN_ROLE, _governor);
        _grantRole(GOVERNOR_ROLE, _governor);
    }

    // Implement IDocumentResolver methods...

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(GOVERNOR_ROLE)
    {}

    uint256[50] private __gap; // Storage gap for future upgrades
}
```

## Best Practices

### For Resolver Developers

1. **Interface Compliance**: Implement all methods, even if as no-ops
2. **Gas Efficiency**: Keep resolver logic lightweight
3. **Graceful Failures**: Handle errors gracefully, especially in additional resolvers
4. **Documentation**: Provide clear documentation for resolver functionality
5. **Testing**: Thorough unit and integration tests
6. **Security**: Audit before deployment

### For Document Owners

1. **Resolver Selection**: Choose resolvers carefully, verify code before using
2. **Testing**: Test resolver behavior on testnet first
3. **Lock Consideration**: Only lock resolvers if truly permanent

### For Governance

1. **Resolver Approval**: Audit resolvers before registration
2. **Code Hash Verification**: Monitor for code changes
3. **Deactivation**: Deactivate compromised resolvers immediately

## Common Patterns

### Owner Validation

```solidity
modifier onlyDocumentOwner(bytes32 integraHash) {
    (bool success, bytes memory data) = documentRegistry.staticcall(
        abi.encodeWithSignature("getDocumentOwner(bytes32)", integraHash)
    );
    require(success, "Registry call failed");

    address owner = abi.decode(data, (address));
    require(msg.sender == owner, "Not document owner");
    _;
}
```

### Graceful No-Op

```solidity
function onDocumentRegistered(...) external override {
    // No action needed - this resolver doesn't use registration hooks
}
```

### Permissive Validation

```solidity
function canOwnDocument(...)
    external view override returns (bool, string memory)
{
    // This resolver doesn't restrict ownership
    return (true, "");
}
```

## Example Implementations

See the following resolver implementations for reference:

- [SimpleContactResolver](../simple-contact-resolver) - Communication resolver
- LeaseExpiryResolverV7 - Lifecycle resolver (coming soon)
- KYCComplianceResolverV7 - Compliance resolver (coming soon)

## Resources

- [Source Code](https://github.com/IntegraLedger/smart-contracts-evm-v7/blob/main/src/layer2/interfaces/IDocumentResolver.sol)
- [Document Registry Documentation](../document-registry)
- [Resolver Development Guide](../../guides/resolver-development)
- [Layer 2 Overview](../overview)

## Support

- **Security Issues**: security@integra.io
- **Technical Support**: docs@integra.io
- **GitHub**: https://github.com/IntegraLedger/smart-contracts-evm-v7
