# BaseTokenizerV7

## Overview

**Version**: 7.0.0
**Type**: Abstract Upgradeable Contract
**License**: MIT
**Inherits**: AttestationAccessControlV7, IDocumentTokenizerV7

BaseTokenizerV7 is the abstract base contract for all document tokenizers. It provides common functionality including access control, validation helpers, and integration with the document registry. All concrete tokenizers inherit from this contract.

### Purpose

- Provide single source of truth for common tokenizer logic
- Eliminate code duplication across tokenizers (~200 lines saved per tokenizer)
- Ensure consistent security model across all tokenization strategies
- Simplify tokenizer development (write unique logic only)

### Key Features

- Updated to AttestationAccessControlV7 (provider abstraction)
- Immutable document registry reference
- Per-document executor authorization with zero-trust default
- Owner sovereignty (ultimate control)
- Cross-chain replay prevention
- Validation helpers for reserve/claim/cancel operations
- Emergency pause functionality
- UUPS upgradeability

## Architecture

### Design Philosophy

**Why Abstract?**

BaseTokenizerV7 is abstract because:
1. Concrete tokenizers must implement token-specific logic (ERC-20/721/1155)
2. Storage structures vary by tokenizer type
3. Completion logic differs by use case

**Why Immutable Registry?**

```solidity
IntegraDocumentRegistryV7_Immutable public documentRegistry;
```

The document registry reference is set once during initialization and cannot change. This preserves the ownership trust model and prevents registry swapping attacks.

### Code Reduction Benefits

**Before (V6 Pattern)**:
- Each tokenizer: ~700 lines
- Access control: Duplicated 11 times
- Validation: Duplicated 11 times
- Total wasted code: ~2,200 lines

**After (V7 Pattern)**:
- BaseTokenizerV7: ~315 lines (shared)
- Each tokenizer: ~250-350 lines (unique logic only)
- Code reuse: 60-70% reduction
- Single bug fix location: All tokenizers benefit

### Integration Points

- **Inherits From**: AttestationAccessControlV7 (Layer 0)
- **References**: IntegraDocumentRegistryV7_Immutable (Layer 2)
- **Implements**: IDocumentTokenizerV7 (interface)
- **Extended By**: All concrete tokenizers

## Security Model

### Three-Path Access Control

BaseTokenizerV7 implements a zero-trust model with exactly three access paths (in priority order):

#### Path 1: Document Owner (Highest Priority)
- Owner's ephemeral wallet (Privy)
- Always has full access
- Cannot be revoked
- Owner sovereignty guaranteed

#### Path 2: Per-Document Executor (Opt-In)
- Must be explicitly authorized by owner
- Can be EOA (backend server) or contract (DAO, multi-sig, escrow)
- Owner can revoke at any time
- **DEFAULT**: `address(0)` (no executor = owner-only access)

#### Path 3: No Fallback
- No global executor role
- No legacy compatibility
- Clean, secure, simple
- Unauthorized callers rejected

### requireOwnerOrExecutor Modifier

The core security primitive for all tokenizer operations:

```solidity
modifier requireOwnerOrExecutor(bytes32 integraHash) {
    // VALIDATION: Ensure document uses this tokenizer
    address documentTokenizer = documentRegistry.getTokenizer(integraHash);

    // Check tokenizer is set (not address(0))
    if (documentTokenizer == address(0)) {
        revert TokenizerNotSet(integraHash);
    }

    // Check document uses THIS tokenizer (not a different one)
    if (documentTokenizer != address(this)) {
        revert WrongTokenizer(integraHash, documentTokenizer, address(this));
    }

    // PATH 1: Check document owner
    address owner = documentRegistry.getDocumentOwner(integraHash);
    if (msg.sender == owner) {
        _;
        return;
    }

    // PATH 2: Check per-document executor
    address authorizedExecutor = documentRegistry.getDocumentExecutor(integraHash);
    if (authorizedExecutor != address(0) && msg.sender == authorizedExecutor) {
        _;
        return;
    }

    // PATH 3: Unauthorized - revert
    revert Unauthorized(msg.sender, integraHash);
}
```

**Security Guarantees**:
- Zero-trust: No access by default
- Opt-in: Owner must explicitly authorize executor
- Revocable: Owner maintains control
- Contract executors: Enables programmable governance
- No global privilege: Each document is independent
- Tokenizer validation: Prevents cross-tokenizer attacks

### Smart Contract Executor Support

Executors can be smart contracts (not just EOAs):

**Use Cases**:
- **DAO Governance**: Token holders vote on document operations
- **Multi-Sig**: Require N-of-M signatures
- **Escrow Contracts**: Automated release based on conditions
- **Time Locks**: Operations only after delay
- **Custom Logic**: Any programmable access control

**Example**:
```solidity
// Owner authorizes DAO as executor
documentRegistry.setDocumentExecutor(integraHash, daoAddress);

// DAO contract can now reserve tokens
// (after internal vote passes)
ownershipTokenizer.reserveToken(...);
```

## Initialization

### __BaseTokenizer_init

Called by concrete tokenizer's `initialize` function:

```solidity
function __BaseTokenizer_init(
    address _documentRegistry,
    address _namespace,
    address _providerRegistry,
    bytes32 _defaultProviderId,
    address _governor
) internal onlyInitializing {
    // Validate addresses
    if (_documentRegistry == address(0)) revert ZeroAddress();
    if (_namespace == address(0)) revert ZeroAddress();
    if (_providerRegistry == address(0)) revert ZeroAddress();
    if (_governor == address(0)) revert ZeroAddress();

    // Initialize parent (AttestationAccessControlV7)
    __AttestationAccessControl_init(
        _namespace,
        _providerRegistry,
        _defaultProviderId,
        _governor
    );

    // Set document registry (source of truth for ownership)
    documentRegistry = IntegraDocumentRegistryV7_Immutable(_documentRegistry);

    // Grant roles
    _grantRole(DEFAULT_ADMIN_ROLE, _governor);
    _grantRole(GOVERNOR_ROLE, _governor);
    _grantRole(OPERATOR_ROLE, _governor);
}
```

### Usage in Concrete Tokenizer

```solidity
contract OwnershipTokenizerV7 is BaseTokenizerV7, ERC721Upgradeable {
    function initialize(...) external initializer {
        __ERC721_init(name_, symbol_);
        __ReentrancyGuard_init();

        // Initialize base
        __BaseTokenizer_init(
            _documentRegistry,
            _namespace,
            _providerRegistry,
            _defaultProviderId,
            _governor
        );

        // Tokenizer-specific initialization
        _baseTokenURI = baseURI_;
        _nextTokenId = 1;
    }
}
```

## Constants

### Capability Aliases

```solidity
// Maps to CapabilityNamespaceV7.CORE_CLAIM (1 << 1)
uint256 internal constant CAPABILITY_CLAIM_TOKEN = 1 << 1;
```

**Usage**: All tokenizers use CAPABILITY_CLAIM_TOKEN for claim operations.

### Limits

```solidity
uint256 public constant MAX_ENCRYPTED_LABEL_LENGTH = 500;
uint256 public constant MAX_TOKENS_PER_DOCUMENT = 100;
uint256 public constant MAX_BATCH_SIZE = 50;
```

**Purpose**:
- Prevent gas exhaustion attacks
- Ensure reasonable operation sizes
- Maintain predictable costs

## Validation Helpers

### _validateReservation

Common validation for all reservation functions:

```solidity
function _validateReservation(
    uint256 amount,
    bytes calldata encryptedLabel,
    bytes32 processHash
) internal pure {
    // Check amount (most likely to fail, check first)
    if (amount == 0) revert InvalidAmount(amount);

    // Check processHash requirement
    if (processHash == bytes32(0)) revert InvalidProcessHash();

    // Check label length (least likely to fail)
    if (encryptedLabel.length > MAX_ENCRYPTED_LABEL_LENGTH) {
        revert EncryptedLabelTooLarge(encryptedLabel.length, MAX_ENCRYPTED_LABEL_LENGTH);
    }
}
```

**Optimization**: Checks ordered by likelihood of failure (early exit pattern).

### _validateClaim

Validation for claim operations:

```solidity
function _validateClaim(bytes32 processHash) internal pure {
    if (processHash == bytes32(0)) revert InvalidProcessHash();
}
```

**Note**: Additional validation (attestation verification) handled by `requiresCapabilityWithUID` modifier.

### _validateCancellation

Ensures only authorized parties can cancel:

```solidity
function _validateCancellation(bytes32 integraHash, address caller) internal view {
    // Owner can always cancel
    address owner = documentRegistry.getDocumentOwner(integraHash);
    if (caller == owner) return;

    // Authorized executor can cancel
    address executor = documentRegistry.getDocumentExecutor(integraHash);
    if (executor != address(0) && caller == executor) return;

    // Neither owner nor executor
    revert OnlyIssuerCanCancel(caller, owner);
}
```

**Access**: Only document owner or authorized executor can cancel reservations.

### _validateBatchArrays

Ensures batch operation arrays have matching lengths:

```solidity
function _validateBatchArrays(
    uint256 expectedLength,
    uint256[] memory arrayLengths
) internal pure {
    for (uint256 i = 0; i < arrayLengths.length;) {
        if (arrayLengths[i] != expectedLength) {
            revert ArrayLengthMismatch();
        }
        unchecked { ++i; } // Safe: array.length < type(uint256).max
    }
}
```

**Optimization**: Unchecked loop increment (array lengths cannot overflow).

## Admin Functions

### pause / unpause

Emergency stop mechanism:

```solidity
function pause() external virtual override onlyRole(GOVERNOR_ROLE) {
    _pause();
}

function unpause() external virtual override onlyRole(GOVERNOR_ROLE) {
    _unpause();
}
```

**Effect**: When paused, all operations with `whenNotPaused` modifier are blocked.

**Use Cases**:
- Critical bug discovered
- Security incident
- Network issues
- Coordinated upgrade

### _authorizeUpgrade

UUPS upgrade authorization:

```solidity
function _authorizeUpgrade(address) internal virtual override onlyRole(GOVERNOR_ROLE) {}
```

**Security**: Only governor can upgrade tokenizer implementation.

### getVersion

Returns contract version:

```solidity
function getVersion() external pure returns (string memory) {
    return VERSION;  // "7.0.0"
}
```

**Usage**: Version tracking for monitoring and upgrades.

## Helper Functions

### _getDocumentOwner

Abstract method implemented by inherited AttestationAccessControlV7 contract:

```solidity
function _getDocumentOwner(bytes32 documentHash) internal view override returns (address) {
    return documentRegistry.getDocumentOwner(documentHash);
}
```

**Purpose**: Provides document owner lookup for capability validation.

## Errors

### Validation Errors

```solidity
error InvalidAmount(uint256 amount);
error InvalidProcessHash();
error EncryptedLabelTooLarge(uint256 length, uint256 maximum);
```

**Triggers**: Parameter validation failures.

### Access Control Errors

```solidity
error Unauthorized(address caller, bytes32 integraHash);
error OnlyIssuerCanCancel(address caller, address issuer);
error NotReservedForYou(address caller, address reservedFor);
error WrongTokenizer(bytes32 integraHash, address documentTokenizer, address calledTokenizer);
error TokenizerNotSet(bytes32 integraHash);
```

**Triggers**: Authorization failures, tokenizer mismatches.

### Token Operation Errors

```solidity
error TokenAlreadyReserved(bytes32 integraHash, uint256 tokenId);
error TokenNotReserved(bytes32 integraHash, uint256 tokenId);
error TokenAlreadyClaimed(bytes32 integraHash, uint256 tokenId);
```

**Triggers**: Invalid token lifecycle operations.

### Batch Operation Errors

```solidity
error EmptyBatch();
error BatchTooLarge(uint256 provided, uint256 maximum);
error ArrayLengthMismatch();
```

**Triggers**: Invalid batch operations.

## Gas Optimizations

### Single-Condition Checks

Validation functions use single-condition checks instead of combined conditions:

**Optimized**:
```solidity
if (amount == 0) revert InvalidAmount(amount);
if (processHash == bytes32(0)) revert InvalidProcessHash();
```

**Not This**:
```solidity
if (amount == 0 || processHash == bytes32(0)) revert InvalidParams();
```

**Benefit**: Early exit saves gas on first failure.

### Unchecked Arithmetic

Loops use unchecked increment where safe:

```solidity
for (uint256 i = 0; i < arrayLengths.length;) {
    // ... logic
    unchecked { ++i; } // Safe: array.length < type(uint256).max
}
```

**Savings**: ~200 gas per iteration.

### Storage Layout

```solidity
uint256[49] private __gap;
```

**Purpose**: Reserve storage slots for future upgrades without breaking storage layout.

**Calculation**: 50 total slots - 1 used (documentRegistry) = 49 gap.

## Best Practices

### For Tokenizer Developers

1. **Always call base init**:
   ```solidity
   __BaseTokenizer_init(...);
   ```

2. **Use provided modifiers**:
   ```solidity
   function reserveToken(...)
       external
       requireOwnerOrExecutor(integraHash)
       nonReentrant
       whenNotPaused
   ```

3. **Use validation helpers**:
   ```solidity
   _validateReservation(amount, encryptedLabel, processHash);
   ```

4. **Maintain storage gap**:
   ```solidity
   // BaseTokenizerV7: 49 slots
   // Your contract: Calculate remaining
   uint256[X] private __gap;
   ```

### For Application Developers

1. **Verify tokenizer assignment**:
   ```solidity
   address tokenizer = documentRegistry.getTokenizer(integraHash);
   require(tokenizer == expectedTokenizerAddress);
   ```

2. **Always provide processHash**:
   ```solidity
   // Good
   tokenizer.reserveToken(..., processHash);

   // Bad
   tokenizer.reserveToken(..., bytes32(0)); // Will revert
   ```

3. **Handle executor authorization**:
   ```solidity
   // For backend-automated operations
   documentRegistry.setDocumentExecutor(integraHash, backendAddress);

   // For owner-only operations
   // Don't set executor (defaults to address(0))
   ```

4. **Monitor pause state**:
   ```solidity
   bool isPaused = tokenizer.paused();
   if (isPaused) {
       // Handle gracefully
   }
   ```

## Security Considerations

### Tokenizer Validation is Critical

The `requireOwnerOrExecutor` modifier performs crucial validation:

```solidity
// Prevents cross-tokenizer attacks
if (documentTokenizer != address(this)) {
    revert WrongTokenizer(...);
}
```

**Attack Scenario Prevented**:
1. Attacker deploys malicious tokenizer
2. Tries to call legitimate tokenizer's functions with their document
3. Validation fails: Document's tokenizer != called tokenizer
4. Transaction reverts

### Immutable Registry Prevents Takeover

```solidity
IntegraDocumentRegistryV7_Immutable public documentRegistry;
```

**Attack Scenario Prevented**:
1. Attacker tries to upgrade tokenizer
2. Wants to point to malicious registry
3. Cannot: Registry reference is immutable
4. Ownership trust model preserved

### Process Hash Correlation

All operations require `processHash != bytes32(0)`:

**Benefits**:
- Links operations to specific workflows
- Enables off-chain auditing
- Prevents accidental operations
- Facilitates debugging

## Upgradeability

### UUPS Pattern

```solidity
function _authorizeUpgrade(address)
    internal
    virtual
    override
    onlyRole(GOVERNOR_ROLE)
{}
```

**Process**:
1. Governor deploys new implementation
2. Governor calls `upgradeToAndCall` on proxy
3. New logic takes effect
4. Storage preserved (via storage gap)

### Storage Gap Maintenance

**Critical**: When adding state variables:

```solidity
// Before: 49 gap
uint256[49] private __gap;

// After adding 2 variables:
NewType1 public newVariable1;
NewType2 public newVariable2;
uint256[47] private __gap;  // 49 - 2 = 47
```

**Why**: Prevents storage slot collisions with child contracts.

## Integration Examples

### Basic Tokenizer Usage

```solidity
// 1. Deploy tokenizer
OwnershipTokenizerV7 tokenizer = new OwnershipTokenizerV7();

// 2. Deploy proxy
TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
    address(tokenizer),
    proxyAdmin,
    ""
);

// 3. Initialize via proxy
OwnershipTokenizerV7(address(proxy)).initialize(
    "Property Deeds",
    "DEED",
    "ipfs://base-uri/",
    governor,
    documentRegistry,
    namespace,
    providerRegistry,
    defaultProviderId
);

// 4. Assign to document
documentRegistry.setTokenizer(integraHash, address(proxy));

// 5. Reserve token
OwnershipTokenizerV7(address(proxy)).reserveToken(
    integraHash,
    0,
    buyerAddress,
    1,
    processHash
);
```

### With Executor Authorization

```solidity
// Owner authorizes backend server as executor
documentRegistry.setDocumentExecutor(integraHash, backendAddress);

// Backend can now reserve tokens
// (msg.sender == backendAddress passes requireOwnerOrExecutor)
tokenizer.reserveToken(integraHash, 0, recipient, 1, processHash);

// Owner can revoke at any time
documentRegistry.setDocumentExecutor(integraHash, address(0));
```

## Code Location

**Repository**: `smart-contracts-evm-v7`
**Path**: `/src/layer3/base/BaseTokenizerV7.sol`
**Version**: 7.0.0
**Audited**: Yes (Layer 0-3 Security Audit 2024)

## Related Contracts

- [AttestationAccessControlV7](../layer0/AttestationAccessControlV7.md) - Parent contract
- [IntegraDocumentRegistryV7_Immutable](../layer2/IntegraDocumentRegistryV7_Immutable.md) - Referenced registry
- [TrustGraphIntegration](./TrustGraphIntegration.md) - Trust credential mixin
- [IDocumentTokenizerV7](./IDocumentTokenizerV7.md) - Interface
- [OwnershipTokenizerV7](./OwnershipTokenizerV7.md) - Example concrete implementation

## Further Reading

- [Layer 3 Overview](./overview.md) - Tokenization architecture
- [Tokenizer Comparison](./tokenizer-comparison.md) - Choose the right tokenizer
- [Layer 2 Overview](../layer2/overview.md) - Document registry integration
- [Layer 0 Overview](../layer0/overview.md) - Access control foundation
