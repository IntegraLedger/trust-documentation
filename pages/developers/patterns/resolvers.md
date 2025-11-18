# Resolver Composition Pattern

Service composition architecture for document lifecycle management and extensibility.

## Overview

The Integra V7 resolver pattern enables flexible, composable services attached to documents:

- **Primary Resolver**: Critical services (blocking, must succeed)
- **Additional Resolvers**: Optional services (non-blocking, best-effort)
- **Lifecycle Hooks**: Called on document registration, updates, transfers
- **Gas Limit Configuration**: Per-resolver and default limits
- **Resolver Locking**: Owner can make resolver configuration immutable
- **Emergency Unlock**: Time-limited governance override (6 months)
- **Code Hash Verification**: Registry validates resolver integrity

## Pattern: Primary vs Additional Resolvers

### Document Structure

```solidity
struct DocumentRecord {
    // Identity Core
    address owner;
    address tokenizer;
    bytes32 documentHash;
    bytes32 referenceHash;
    uint64 registeredAt;
    bool exists;
    bytes32 identityExtension;

    // Service Layer (via Resolvers)
    bytes32 primaryResolverId;          // Primary resolver (critical)
    bytes32[] additionalResolvers;      // Additional resolvers (optional)
    bool resolversLocked;               // Configuration lock
}
```

### Primary Resolver (Blocking)

**Purpose**: Critical services that must succeed for operation to complete.

**Example Use Cases**:
- Communication resolver (must update contact info)
- Lifecycle resolver (must record expiry date)
- Compliance resolver (must log regulatory data)

**Failure Behavior**: Transaction reverts if primary resolver fails.

```solidity
/**
 * @notice Call primary resolver (blocking)
 * @dev Reverts if resolver fails
 */
function _callPrimaryResolver(
    bytes32 integraHash,
    bytes4 selector,
    bytes memory data
) internal returns (bool success) {
    DocumentRecord storage doc = documents[integraHash];

    // No primary resolver = skip
    if (doc.primaryResolverId == bytes32(0)) return true;

    // Get resolver address (with code hash verification)
    address resolver = resolverRegistry.getResolver(doc.primaryResolverId);

    if (resolver == address(0)) {
        emit PrimaryResolverUnavailable(integraHash, doc.primaryResolverId);
        return true;  // ✅ Graceful degradation
    }

    // Call resolver with gas limit
    bytes memory callData = abi.encodePacked(selector, data);
    uint256 gasLimit = _getResolverGasLimit(doc.primaryResolverId, true);

    (bool callSuccess, bytes memory result) = resolver.call{gas: gasLimit}(callData);

    if (!callSuccess) {
        // Bubble up revert reason if available
        if (result.length > 0 && result.length <= 2048) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        revert PrimaryResolverFailed(integraHash, doc.primaryResolverId);  // ✅ REVERT
    }

    emit PrimaryResolverCalled(integraHash, doc.primaryResolverId, selector);
    return true;
}
```

### Additional Resolvers (Non-Blocking)

**Purpose**: Optional services that enhance functionality but aren't critical.

**Example Use Cases**:
- Analytics resolver (nice to have stats)
- Notification resolver (best-effort alerts)
- Archive resolver (optional backup)

**Failure Behavior**: Failure logged but doesn't revert transaction.

```solidity
/**
 * @notice Call additional resolvers (non-blocking)
 * @dev Failures logged but don't revert
 */
function _callAdditionalResolvers(
    bytes32 integraHash,
    bytes4 selector,
    bytes memory data
) internal {
    DocumentRecord storage doc = documents[integraHash];

    if (doc.additionalResolvers.length == 0) return;

    bytes memory callData = abi.encodePacked(selector, data);

    for (uint256 i = 0; i < doc.additionalResolvers.length; i++) {
        bytes32 resolverId = doc.additionalResolvers[i];
        address resolver = resolverRegistry.getResolver(resolverId);

        if (resolver == address(0)) continue;  // ✅ Skip if unavailable

        uint256 gasLimit = _getResolverGasLimit(resolverId, false);

        // Try/catch prevents one failure from affecting others
        try this._safeResolverCall{gas: gasLimit}(resolver, callData) {
            emit AdditionalResolverCalled(integraHash, resolverId, selector);  // ✅ Success
        } catch Error(string memory reason) {
            emit AdditionalResolverFailed(integraHash, resolverId, reason);  // ✅ Logged, not reverted
        } catch {
            emit AdditionalResolverFailed(integraHash, resolverId, "Unknown error");
        }
    }
}

/**
 * @dev Safe resolver call wrapper (prevents reentrancy)
 */
function _safeResolverCall(address resolver, bytes memory callData)
    external
    returns (bool)
{
    if (msg.sender != address(this)) revert OnlyInternalCall();
    (bool success,) = resolver.call(callData);
    if (!success) revert ResolverCallFailed();
    return true;
}
```

## Pattern: Lifecycle Hooks

### Hook Points

Resolvers can be called at key lifecycle events:

```solidity
// 1. Document Registration
function registerDocument(...) external {
    // ... register document

    if (primaryResolverId != bytes32(0)) {
        _callPrimaryResolver(
            integraHash,
            IDocumentResolver.onDocumentRegistered.selector,
            abi.encode(integraHash, documentHash, msg.sender, metadata)
        );
    }

    _callAdditionalResolvers(
        integraHash,
        IDocumentResolver.onDocumentRegistered.selector,
        abi.encode(integraHash, documentHash, msg.sender, metadata)
    );
}

// 2. Ownership Transfer
function transferDocumentOwnership(...) external {
    // ... transfer ownership

    _callPrimaryResolver(
        integraHash,
        IDocumentResolver.onOwnershipTransferred.selector,
        abi.encode(integraHash, oldOwner, newOwner, reason)
    );

    _callAdditionalResolvers(
        integraHash,
        IDocumentResolver.onOwnershipTransferred.selector,
        abi.encode(integraHash, oldOwner, newOwner, reason)
    );
}

// 3. Tokenizer Association
function associateTokenizer(...) external {
    // ... associate tokenizer

    _callPrimaryResolver(
        integraHash,
        IDocumentResolver.onTokenizerAssociated.selector,
        abi.encode(integraHash, tokenizer, msg.sender)
    );
}
```

### Resolver Interface

```solidity
interface IDocumentResolver {
    /// @notice Called when document is registered
    function onDocumentRegistered(
        bytes32 integraHash,
        bytes32 documentHash,
        address owner,
        bytes calldata metadata
    ) external;

    /// @notice Called when ownership is transferred
    function onOwnershipTransferred(
        bytes32 integraHash,
        address oldOwner,
        address newOwner,
        string calldata reason
    ) external;

    /// @notice Called when tokenizer is associated
    function onTokenizerAssociated(
        bytes32 integraHash,
        address tokenizer,
        address owner
    ) external;

    /// @notice Called when document is updated
    function onDocumentUpdated(
        bytes32 integraHash,
        bytes calldata updateData
    ) external;
}
```

## Pattern: Gas Limit Configuration

### Gas Limit Management

```solidity
/// @notice Default gas limit for primary resolver calls
uint256 public defaultPrimaryResolverGasLimit = 200_000;

/// @notice Default gas limit for additional resolver calls
uint256 public defaultAdditionalResolverGasLimit = 100_000;

/// @notice Per-resolver gas limit overrides (resolverId => gasLimit, 0 = use default)
mapping(bytes32 => uint256) public resolverGasLimitOverride;

/// @notice Maximum reasonable gas limit (chain-specific)
uint256 public maxReasonableGasLimit = 30_000_000;

/**
 * @notice Get effective gas limit for a resolver
 * @param resolverId Resolver identifier
 * @param isPrimary Whether this is a primary resolver call
 * @return Effective gas limit to use
 */
function _getResolverGasLimit(bytes32 resolverId, bool isPrimary)
    internal
    view
    returns (uint256)
{
    // Check for per-resolver override
    uint256 override_ = resolverGasLimitOverride[resolverId];
    if (override_ > 0) {
        return override_;
    }

    // Use default based on resolver type
    return isPrimary ? defaultPrimaryResolverGasLimit : defaultAdditionalResolverGasLimit;
}
```

### Configuration Functions

```solidity
/**
 * @notice Set default primary resolver gas limit
 */
function setDefaultPrimaryResolverGasLimit(uint256 newLimit)
    external
    onlyRole(GOVERNOR_ROLE)
{
    if (newLimit == 0) revert ZeroGasLimit();
    if (newLimit > maxReasonableGasLimit) {
        revert GasLimitTooHigh(newLimit, maxReasonableGasLimit);
    }

    uint256 oldLimit = defaultPrimaryResolverGasLimit;
    defaultPrimaryResolverGasLimit = newLimit;

    emit DefaultPrimaryResolverGasLimitUpdated(oldLimit, newLimit);
}

/**
 * @notice Set per-resolver gas limit override
 */
function setResolverGasLimitOverride(bytes32 resolverId, uint256 gasLimit)
    external
    onlyRole(GOVERNOR_ROLE)
{
    if (gasLimit > maxReasonableGasLimit) {
        revert GasLimitTooHigh(gasLimit, maxReasonableGasLimit);
    }

    resolverGasLimitOverride[resolverId] = gasLimit;

    emit ResolverGasLimitOverrideSet(resolverId, gasLimit, block.timestamp);
}
```

## Pattern: Resolver Locking

### Locking Mechanism

```solidity
/**
 * @notice Lock resolver configuration (immutable)
 * @dev Owner can lock to prevent future changes
 */
function lockResolvers(bytes32 integraHash) external nonReentrant {
    DocumentRecord storage doc = documents[integraHash];

    if (!doc.exists) revert DocumentNotRegistered(integraHash);
    if (msg.sender != doc.owner) {
        revert OnlyDocumentOwner(msg.sender, doc.owner, integraHash);
    }
    if (doc.resolversLocked) revert ResolverConfigurationLocked(integraHash);

    doc.resolversLocked = true;

    emit ResolversLocked(integraHash, msg.sender, block.timestamp);
}
```

### Emergency Unlock

```solidity
/**
 * @notice Emergency unlock resolvers (time-limited)
 * @param integraHash Document to unlock
 * @param justification Reason for unlock
 */
function emergencyUnlockResolvers(bytes32 integraHash, string calldata justification)
    external
    nonReentrant
{
    DocumentRecord storage doc = documents[integraHash];

    if (!doc.exists) revert DocumentNotRegistered(integraHash);
    if (!doc.resolversLocked) revert ResolversNotLocked(integraHash);

    // TIME-GATED EMERGENCY AUTHORIZATION
    if (block.timestamp < emergencyExpiry) {
        // First 6 months: Emergency address OR governance
        if (msg.sender != emergencyAddress && !hasRole(GOVERNOR_ROLE, msg.sender)) {
            revert UnauthorizedEmergencyUnlock(msg.sender);
        }
    } else {
        // After 6 months: Only governance
        if (!hasRole(GOVERNOR_ROLE, msg.sender)) {
            revert EmergencyPowersExpired();
        }
    }

    doc.resolversLocked = false;

    emit ResolversEmergencyUnlocked(
        integraHash,
        msg.sender,
        justification,
        block.timestamp,
        msg.sender == emergencyAddress,
        block.timestamp < emergencyExpiry
    );
}
```

## Resolver Types and Use Cases

### Communication Resolver

**Purpose**: Store and update contact information.

**Hooks**:
- `onDocumentRegistered`: Store initial contact info
- `onOwnershipTransferred`: Update contact owner

**Example**:
```solidity
contract SimpleContactResolverV7 {
    struct ContactInfo {
        string email;
        string phone;
        string url;
        uint256 updatedAt;
    }

    mapping(bytes32 => ContactInfo) public contacts;

    function onDocumentRegistered(
        bytes32 integraHash,
        bytes32,
        address,
        bytes calldata metadata
    ) external {
        (string memory email, string memory phone, string memory url) =
            abi.decode(metadata, (string, string, string));

        contacts[integraHash] = ContactInfo({
            email: email,
            phone: phone,
            url: url,
            updatedAt: block.timestamp
        });
    }
}
```

### Lifecycle Resolver

**Purpose**: Track document expiry, renewal, archival.

**Hooks**:
- `onDocumentRegistered`: Set initial expiry date
- `onDocumentUpdated`: Update expiry after renewal

### Compliance Resolver

**Purpose**: Log regulatory compliance events.

**Hooks**:
- `onDocumentRegistered`: Record KYC check
- `onOwnershipTransferred`: Verify new owner compliance

### Payment Resolver

**Purpose**: Automate payment requests and escrow.

**Hooks**:
- `onDocumentRegistered`: Create payment schedule
- `onTokenizerAssociated`: Set up token-based payments

## Testing Strategy

```typescript
describe("Resolver Composition", () => {
  it("should call primary resolver on registration", async () => {
    await expect(
      registry.registerDocument(
        integraHash,
        documentHash,
        ...,
        primaryResolverId,
        ...
      )
    ).to.emit(primaryResolver, "onDocumentRegistered");
  });

  it("should call additional resolvers (non-blocking)", async () => {
    await registry.addAdditionalResolver(integraHash, additionalResolverId);

    // Even if additional resolver reverts, operation succeeds
    await additionalResolver.setShouldRevert(true);

    await expect(
      registry.transferDocumentOwnership(integraHash, newOwner, "Transfer")
    ).to.emit(registry, "AdditionalResolverFailed");  // Logged, not reverted
  });

  it("should respect gas limits", async () => {
    await registry.setResolverGasLimitOverride(resolverId, 50_000);

    // Resolver that uses >50k gas should fail
    await expect(
      registry.registerDocument(..., resolverId, ...)
    ).to.emit(registry, "PrimaryResolverFailed");
  });

  it("should allow locking resolvers", async () => {
    await registry.lockResolvers(integraHash);

    await expect(
      registry.setPrimaryResolver(integraHash, newResolverId)
    ).to.be.revertedWithCustomError(registry, "ResolverConfigurationLocked");
  });
});
```

## Benefits

- **Composable**: Mix and match resolvers for different use cases
- **Non-Blocking**: Additional resolvers don't block operations
- **Gas Controlled**: Prevents resolver DOS via gas limits
- **Lockable**: Owner can make configuration immutable
- **Graceful Degradation**: Unavailable resolvers handled safely
- **Emergency Override**: Time-limited governance unlock

## See Also

- [Registry Patterns](./registries.md) - Resolver registry implementation
- [Security Patterns](./security.md) - Gas limits and emergency controls
- [Document Documentation](../layer2/) - Document registry architecture
