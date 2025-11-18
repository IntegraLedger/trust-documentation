# Access Control Patterns

Multi-layer access control architecture implementing zero-trust security across all Integra V7 smart contracts.

## Overview

The Integra V7 access control system implements a sophisticated multi-layer security model:

**Foundation: Attestation-Based Capabilities**
- Fine-grained permissions via attestation proofs
- 256-bit capability bitmask with organized namespace
- Provider abstraction (EAS, VCs, ZK proofs, DIDs)
- Front-running protection via recipient validation

**Document Ownership: Document Ownership Model**
- Coarse-grained permissions based on document ownership
- Immutable after deployment (trust model preservation)
- Owner sovereignty guaranteed

**Per-Document Authorization: Per-Document Executor Authorization**
- Delegated permissions with opt-in model
- Zero-trust default (no global privileges)
- Contract executor support (DAOs, multisigs, escrows)
- Owner maintains ultimate control

## Foundation: Attestation-Based Capabilities

### Capability Namespace Architecture

The `CapabilityNamespaceV7_Immutable` contract defines a permanent 256-bit capability namespace organized into tiers:

```solidity
/**
 * CAPABILITY NAMESPACE:
 * Bits 0-7:    Core capabilities (view, claim, transfer, update, delegate, revoke, admin)
 * Bits 8-15:   Document operations (sign, witness, notarize, verify, amend, archive)
 * Bits 16-23:  Financial operations (request, approve, execute, cancel, withdraw, deposit)
 * Bits 24-31:  Governance operations (propose, vote, execute, veto, delegate)
 * Bits 32-255: Reserved for future protocol extensions
 */

// TIER 0: Core Capabilities (Bits 0-7)
uint256 public constant CORE_VIEW = 1 << 0;      // Read-only access
uint256 public constant CORE_CLAIM = 1 << 1;     // Claim reserved tokens
uint256 public constant CORE_TRANSFER = 1 << 2;  // Transfer token ownership
uint256 public constant CORE_UPDATE = 1 << 3;    // Update metadata
uint256 public constant CORE_DELEGATE = 1 << 4;  // Delegate capabilities
uint256 public constant CORE_REVOKE = 1 << 5;    // Revoke access
uint256 public constant CORE_ADMIN = 1 << 7;     // Full admin (implies all)

// TIER 1: Document Operations (Bits 8-15)
uint256 public constant DOC_SIGN = 1 << 8;       // Sign documents
uint256 public constant DOC_WITNESS = 1 << 9;    // Witness signatures
uint256 public constant DOC_NOTARIZE = 1 << 10;  // Notarize documents
uint256 public constant DOC_VERIFY = 1 << 11;    // Verify authenticity
uint256 public constant DOC_AMEND = 1 << 12;     // Amend content
uint256 public constant DOC_ARCHIVE = 1 << 13;   // Archive documents

// TIER 2: Financial Operations (Bits 16-23)
uint256 public constant FIN_REQUEST_PAYMENT = 1 << 16;  // Request payments
uint256 public constant FIN_APPROVE_PAYMENT = 1 << 17;  // Approve payments
uint256 public constant FIN_EXECUTE_PAYMENT = 1 << 18;  // Execute payments
uint256 public constant FIN_CANCEL_PAYMENT = 1 << 19;   // Cancel payments
uint256 public constant FIN_WITHDRAW = 1 << 20;         // Withdraw funds
uint256 public constant FIN_DEPOSIT = 1 << 21;          // Deposit funds

// TIER 3: Governance Operations (Bits 24-31)
uint256 public constant GOV_PROPOSE = 1 << 24;          // Propose actions
uint256 public constant GOV_VOTE = 1 << 25;             // Vote on proposals
uint256 public constant GOV_EXECUTE = 1 << 26;          // Execute proposals
uint256 public constant GOV_VETO = 1 << 27;             // Veto proposals
uint256 public constant GOV_DELEGATE_VOTE = 1 << 28;    // Delegate voting
```

### Role Templates

Pre-defined capability compositions for common roles:

```solidity
// Viewer: Read-only access
uint256 public constant ROLE_VIEWER = CORE_VIEW;

// Participant: Basic document interaction
// Can view, claim tokens, transfer, request payments
uint256 public constant ROLE_PARTICIPANT =
    CORE_VIEW | CORE_CLAIM | CORE_TRANSFER | FIN_REQUEST_PAYMENT;

// Manager: Operational management
// Participant + update, approve payments, sign, witness
uint256 public constant ROLE_MANAGER =
    ROLE_PARTICIPANT | CORE_UPDATE | FIN_APPROVE_PAYMENT | DOC_SIGN | DOC_WITNESS;

// Admin: Full capabilities (all bits 0-127)
// Upper 128 bits reserved for future protocol extensions
uint256 public constant ROLE_ADMIN = (1 << 128) - 1;
```

### Capability Checking

The namespace provides utility functions for capability operations:

```solidity
/**
 * @notice Check if granted capabilities include required capability
 * @dev CORE_ADMIN grants all capabilities automatically
 */
function hasCapability(uint256 granted, uint256 required) external pure returns (bool) {
    // Admin has all capabilities OR all required bits are set
    return ((granted & CORE_ADMIN) != 0) || ((granted & required) == required);
}

/**
 * @notice Compose multiple capabilities into single bitmask
 */
function composeCapabilities(uint256[] calldata capabilities)
    external
    pure
    returns (uint256)
{
    uint256 composed = 0;
    for (uint256 i = 0; i < capabilities.length; i++) {
        composed |= capabilities[i];
    }
    return composed;
}

/**
 * @notice Add capability to existing set
 */
function addCapability(uint256 current, uint256 toAdd) external pure returns (uint256) {
    return current | toAdd;
}

/**
 * @notice Remove capability from existing set
 */
function removeCapability(uint256 current, uint256 toRemove)
    external
    pure
    returns (uint256)
{
    return current & ~toRemove;
}
```

### Provider Abstraction Pattern

The attestation system uses a provider abstraction layer to support multiple attestation systems:

```solidity
// AttestationAccessControlV7.sol - Provider selection
/// @notice Default provider for all documents
bytes32 public defaultProviderId;

/// @notice Per-document provider override
mapping(bytes32 => bytes32) public documentProvider;

function _verifyCapability(
    address user,
    bytes32 documentHash,
    uint256 requiredCapability,
    bytes calldata attestationProof
) internal nonReentrant whenNotPaused {
    // STEP 1: Get provider ID (document-specific or default)
    bytes32 providerId = documentProvider[documentHash];
    if (providerId == bytes32(0)) {
        providerId = defaultProviderId;
    }

    // STEP 2: Get provider address (with code hash verification)
    address provider = PROVIDER_REGISTRY.getProvider(providerId);
    if (provider == address(0)) {
        revert ProviderNotFound(providerId);
    }

    // STEP 3: Delegate to provider (standard interface)
    (bool verified, uint256 grantedCapabilities) = IAttestationProvider(provider)
        .verifyCapabilities(attestationProof, user, documentHash, requiredCapability);

    if (!verified) {
        revert ProviderVerificationFailed(providerId, "Provider verification failed");
    }

    // STEP 4: Check capabilities using namespace
    if (!NAMESPACE.hasCapability(grantedCapabilities, requiredCapability)) {
        revert NoCapability(user, documentHash, requiredCapability);
    }

    emit CapabilityVerified(user, documentHash, grantedCapabilities, providerId, attestationProof);
}
```

### 13-Step Verification Process (EAS Provider)

The `EASAttestationProviderV7` implements comprehensive verification:

```solidity
/**
 * VERIFICATION STEPS (13 total):
 * 1. ✅ Fetch attestation from EAS contract
 * 2. ✅ Verify attestation exists (UID != 0)
 * 3. ✅ Verify not revoked (revocationTime == 0)
 * 4. ✅ Verify not expired (expirationTime == 0 or > now)
 * 5. ✅ Verify schema matches expected schema
 * 6. ✅ Verify recipient matches caller (FRONT-RUNNING PROTECTION)
 * 7. ✅ Verify attester is authorized issuer
 * 8. ✅ Verify source chain ID matches (cross-chain replay prevention)
 * 9. ✅ Verify source EAS contract matches (EAS spoofing prevention)
 * 10. ✅ Verify document contract matches (contract spoofing prevention)
 * 11. ✅ Verify schema version (schema version validation)
 * 12. ✅ Verify document hash matches
 * 13. ✅ Verify attestation age (optional time limits)
 */
function verifyCapabilities(
    bytes calldata proof,
    address recipient,
    bytes32 documentHash,
    uint256 requiredCapability
) external view returns (bool verified, uint256 grantedCapabilities) {
    // Decode proof
    (bytes32 uid, bytes32 expectedDocHash, address expectedIssuer) =
        abi.decode(proof, (bytes32, bytes32, address));

    // STEP 1: Fetch attestation
    Attestation memory attestation = eas.getAttestation(uid);

    // STEP 2: Verify exists
    if (attestation.uid != uid) return (false, 0);

    // STEP 3: Verify not revoked
    if (attestation.revocationTime != 0) return (false, 0);

    // STEP 4: Verify not expired
    if (attestation.expirationTime != 0 && block.timestamp > attestation.expirationTime) {
        return (false, 0);
    }

    // STEP 5: Verify schema
    if (attestation.schema != capabilitySchema) return (false, 0);

    // STEP 6: FRONT-RUNNING PROTECTION - Verify recipient
    if (attestation.recipient != recipient) return (false, 0);

    // STEP 7: Verify attester is authorized
    if (!authorizedIssuers[attestation.attester]) return (false, 0);

    // STEP 8-12: Decode and verify attestation data
    (
        uint256 capabilities,
        bytes32 docHash,
        uint256 chainId,
        address easContract,
        address docContract,
        uint256 schemaVersion
    ) = abi.decode(attestation.data, (uint256, bytes32, uint256, address, address, uint256));

    if (chainId != block.chainid) return (false, 0);  // STEP 8
    if (easContract != address(eas)) return (false, 0);  // STEP 9
    if (docHash != documentHash) return (false, 0);  // STEP 12

    // STEP 13: Optional time limit
    if (maxAttestationAge > 0) {
        if (block.timestamp - attestation.time > maxAttestationAge) {
            return (false, 0);
        }
    }

    return (true, capabilities);
}
```

### Benefits of Attestation-Based Capabilities

- **Fine-Grained Control**: 256 capability bits allow precise permissions
- **Composable**: Combine capabilities using bitwise OR
- **Extensible**: Upper 128 bits reserved for protocol extensions
- **Provider Agnostic**: Works with any attestation system (EAS, VCs, ZK, DIDs)
- **Front-Running Safe**: Recipient validation prevents proof theft
- **Cross-Chain Safe**: Chain ID validation prevents replay attacks

### Integration Example

```solidity
// Using capability-based access control in a tokenizer
function claimToken(
    bytes32 integraHash,
    uint256 tokenId,
    bytes calldata attestationProof
) external
    requiresCapability(
        integraHash,
        CAPABILITY_CLAIM_TOKEN,  // = CORE_CLAIM
        attestationProof
    )
    nonReentrant
    whenNotPaused
{
    // Caller has proven they have CORE_CLAIM capability
    // ... claim token logic
}
```

## Document Ownership Model

### Pure Ownership Pattern

The document registry implements a pure ownership model with immutable trust guarantees:

```solidity
// IntegraDocumentRegistryV7_Immutable.sol
struct DocumentRecord {
    address owner;                      // Document owner
    address tokenizer;                  // Associated tokenizer
    bytes32 documentHash;               // Content hash
    bytes32 referenceHash;              // Parent document
    uint64 registeredAt;                // Registration timestamp
    bool exists;                        // Existence flag
    bytes32 identityExtension;          // Protocol extension hook

    // Service Layer (via Resolvers)
    bytes32 primaryResolverId;          // Primary resolver ID
    bytes32[] additionalResolvers;      // Additional resolver IDs
    bool resolversLocked;               // Resolver lock
}

mapping(bytes32 => DocumentRecord) public documents;
```

### Owner-Only Operations

```solidity
/**
 * @notice Transfer document ownership
 * @dev Only current owner can transfer
 */
function transferDocumentOwnership(
    bytes32 integraHash,
    address newOwner,
    string calldata reason
) external nonReentrant whenNotPaused {
    DocumentRecord storage doc = documents[integraHash];

    // Ownership validation
    if (msg.sender != doc.owner) {
        revert Unauthorized(msg.sender, integraHash);
    }

    if (newOwner == address(0)) revert ZeroAddress();
    if (newOwner == doc.owner) revert AlreadyOwner(newOwner, integraHash);

    address oldOwner = doc.owner;
    doc.owner = newOwner;

    emit DocumentOwnershipTransferred(
        integraHash,
        oldOwner,
        newOwner,
        reason,
        block.timestamp
    );
}
```

### Ownership Queries

```solidity
/**
 * @notice Get document owner
 * @dev Reverts if document doesn't exist
 */
function getDocumentOwner(bytes32 integraHash) public view returns (address) {
    DocumentRecord storage doc = documents[integraHash];
    if (!doc.exists) revert DocumentNotRegistered(integraHash);
    return doc.owner;
}

/**
 * @notice Check if address is document owner
 */
function isDocumentOwner(bytes32 integraHash, address account)
    external
    view
    returns (bool)
{
    DocumentRecord storage doc = documents[integraHash];
    if (!doc.exists) return false;
    return doc.owner == account;
}
```

### Benefits of Document Ownership

- **Simplicity**: Clear owner → document mapping
- **Immutable Trust**: Cannot be upgraded (preserves ownership guarantees)
- **Owner Sovereignty**: Owner always has ultimate control
- **Gas Efficient**: Single storage slot lookup
- **Transparent**: Clear audit trail via events

## Per-Document Executor Authorization

### Zero-Trust Executor Model

Per-document authorization implements opt-in executor authorization with zero-trust defaults:

```solidity
/**
 * @notice V7 SECURE ACCESS CONTROL: Per-document executor authorization
 * @dev Implements zero-trust model with opt-in executor
 *
 * ACCESS PATHS (in priority order):
 *
 * 1. DOCUMENT OWNER (highest priority)
 *    - Owner's ephemeral wallet (Privy)
 *    - Always has full access (cannot be revoked)
 *    - Owner sovereignty guaranteed
 *
 * 2. PER-DOCUMENT EXECUTOR (opt-in)
 *    - Must be explicitly authorized by owner
 *    - Can be EOA (backend server) or contract (DAO, multi-sig, escrow)
 *    - Owner can revoke at any time
 *    - DEFAULT: address(0) (no executor = owner-only access)
 *
 * 3. NO FALLBACK
 *    - No global executor role
 *    - No legacy compatibility
 *    - Clean, secure, simple
 */
modifier requireOwnerOrExecutor(bytes32 integraHash) {
    // VALIDATION: Ensure document uses THIS tokenizer
    address documentTokenizer = documentRegistry.getTokenizer(integraHash);

    // Check tokenizer is set (not address(0))
    if (documentTokenizer == address(0)) {
        revert TokenizerNotSet(integraHash);
    }

    // Check document uses THIS tokenizer (not a different one)
    if (documentTokenizer != address(this)) {
        revert WrongTokenizer(integraHash, documentTokenizer, address(this));
    }

    // PATH 1: Check document owner (highest priority, most common)
    address owner = documentRegistry.getDocumentOwner(integraHash);
    if (msg.sender == owner) {
        _;
        return;
    }

    // PATH 2: Check per-document authorized executor (opt-in)
    address authorizedExecutor = documentRegistry.getDocumentExecutor(integraHash);
    if (authorizedExecutor != address(0) && msg.sender == authorizedExecutor) {
        _;
        return;
    }

    // PATH 3: Unauthorized - revert
    revert Unauthorized(msg.sender, integraHash);
}
```

### Executor Authorization

```solidity
/**
 * @notice Authorize executor for specific document
 * @dev Owner can authorize backend server, DAO, multisig, or escrow
 */
function authorizeDocumentExecutor(
    bytes32 integraHash,
    address executor
) external nonReentrant whenNotPaused {
    DocumentRecord storage doc = documents[integraHash];

    // Only owner can authorize
    if (msg.sender != doc.owner) {
        revert Unauthorized(msg.sender, integraHash);
    }

    // Cannot authorize self
    if (executor == msg.sender) {
        revert CannotAuthorizeSelf(msg.sender);
    }

    // Validate executor
    if (executor != address(0)) {
        _validateExecutor(executor);
    }

    documentExecutor[integraHash] = executor;
    executorAuthorizedAt[integraHash] = block.timestamp;

    emit DocumentExecutorAuthorized(
        integraHash,
        executor,
        msg.sender,
        _isContract(executor),
        block.timestamp
    );
}

/**
 * @notice Revoke executor authorization
 */
function revokeDocumentExecutor(bytes32 integraHash)
    external
    nonReentrant
    whenNotPaused
{
    DocumentRecord storage doc = documents[integraHash];

    if (msg.sender != doc.owner) {
        revert Unauthorized(msg.sender, integraHash);
    }

    address oldExecutor = documentExecutor[integraHash];
    delete documentExecutor[integraHash];
    delete executorAuthorizedAt[integraHash];

    emit DocumentExecutorRevoked(
        integraHash,
        oldExecutor,
        msg.sender,
        block.timestamp
    );
}
```

### Executor Validation

The system supports three types of executors with different validation paths:

```solidity
/**
 * @dev Validate executor authorization
 *
 * THREE EXECUTOR TYPES:
 * 1. Whitelisted executor (fast path, 85%+ of cases)
 * 2. Contract executor with IIntegraExecutor interface
 * 3. Non-whitelisted EOA (self-hosted instances)
 */
function _validateExecutor(address executor) internal view {
    // PATH 1: Whitelisted executor (governance-approved)
    // Fast path for known good executors (IntegraExecutorV7, DAOs, etc.)
    if (approvedExecutors[executor]) return;

    // PATH 2: Contract executor with interface validation
    if (_isContract(executor)) {
        try IIntegraExecutor(executor).isLegitimateExecutor() returns (bool isLegit) {
            if (!isLegit) revert InvalidExecutorContract(executor, "Not legitimate");
            return;
        } catch {
            revert InvalidExecutorContract(executor, "Interface check failed");
        }
    }

    // PATH 3: Non-whitelisted EOA
    // Allows self-hosted instances (user's own backend server)
    // No validation needed - owner chose to trust this EOA
}
```

### Executor Whitelisting

Governance can approve common executors for gas optimization:

```solidity
/**
 * @notice Approve executor contract (governance only)
 * @dev Whitelisted executors skip interface validation (gas optimization)
 */
function approveExecutor(
    address executor,
    bool approved,
    string calldata name
) external onlyRole(GOVERNOR_ROLE) {
    if (executor == address(0)) revert ZeroAddress();

    approvedExecutors[executor] = approved;

    emit ExecutorApproved(executor, approved, name, block.timestamp);
}
```

### Benefits of Per-Document Authorization

- **Zero Trust**: No global privileges, all access opt-in
- **Owner Sovereignty**: Owner maintains ultimate control
- **Flexible**: Supports EOAs, DAOs, multisigs, escrows, custom contracts
- **Revocable**: Owner can revoke at any time
- **Tokenizer-Specific**: Each document explicitly bound to tokenizer
- **Gas Optimized**: Whitelisting for common executors

## Multi-Layer Security in Practice

### Example: Token Claim Operation

```solidity
/**
 * Token claim requires ALL THREE ACCESS CONTROL LAYERS to pass:
 *
 * Attestation-Based Capabilities: Caller must have CORE_CLAIM capability (attestation proof)
 * Document Ownership: Document must exist and have valid owner
 * Per-Document Authorization: Caller must be owner OR authorized executor
 */
function claimToken(
    bytes32 integraHash,
    uint256 tokenId,
    bytes calldata attestationProof
) external
    // Attestation-Based Capabilities: Verify capability via attestation
    requiresCapability(integraHash, CAPABILITY_CLAIM_TOKEN, attestationProof)
    // Per-Document Authorization: Verify owner or executor
    requireOwnerOrExecutor(integraHash)
    // Security modifiers
    nonReentrant
    whenNotPaused
{
    // Document Ownership: Implicit in requireOwnerOrExecutor (checks document exists)

    // ... claim token logic
}
```

### Example: Payment Request

```solidity
/**
 * Payment request requires capability and document validation:
 */
function sendPaymentRequest(
    bytes32 integraHash,
    address payer,
    uint256 amount,
    bytes calldata attestationProof
) external
    requiresCapability(integraHash, FIN_REQUEST_PAYMENT, attestationProof)
    nonReentrant
    whenNotPaused
{
    // Document must exist (implicit validation)
    if (!documentRegistry.exists(integraHash)) {
        revert DocumentNotRegistered(integraHash);
    }

    // ... payment request logic
}
```

## Testing Strategy

### Attestation-Based Capability Tests

```typescript
describe("Attestation-Based Capabilities", () => {
  it("should verify valid attestation with correct capabilities", async () => {
    const attestation = await issueAttestation(
      user.address,
      integraHash,
      ROLE_PARTICIPANT
    );

    await expect(
      tokenizer.claimToken(integraHash, tokenId, attestation)
    ).to.not.be.reverted;
  });

  it("should reject attestation with insufficient capabilities", async () => {
    const attestation = await issueAttestation(
      user.address,
      integraHash,
      CORE_VIEW  // Only view, not claim
    );

    await expect(
      tokenizer.claimToken(integraHash, tokenId, attestation)
    ).to.be.revertedWithCustomError(tokenizer, "NoCapability");
  });

  it("should prevent front-running with wrong recipient", async () => {
    const attestation = await issueAttestation(
      alice.address,  // Issued to Alice
      integraHash,
      ROLE_PARTICIPANT
    );

    // Bob tries to use Alice's attestation
    await expect(
      tokenizer.connect(bob).claimToken(integraHash, tokenId, attestation)
    ).to.be.revertedWithCustomError(provider, "RecipientMismatch");
  });
});
```

### Document Ownership Tests

```typescript
describe("Document Ownership", () => {
  it("should allow owner to transfer ownership", async () => {
    await expect(
      registry.connect(owner).transferDocumentOwnership(
        integraHash,
        newOwner.address,
        "Transfer to new owner"
      )
    ).to.emit(registry, "DocumentOwnershipTransferred");
  });

  it("should prevent non-owner from transferring", async () => {
    await expect(
      registry.connect(attacker).transferDocumentOwnership(
        integraHash,
        attacker.address,
        "Malicious transfer"
      )
    ).to.be.revertedWithCustomError(registry, "Unauthorized");
  });
});
```

### Per-Document Executor Tests

```typescript
describe("Per-Document Executor", () => {
  it("should allow owner to authorize executor", async () => {
    await expect(
      registry.connect(owner).authorizeDocumentExecutor(
        integraHash,
        executor.address
      )
    ).to.emit(registry, "DocumentExecutorAuthorized");
  });

  it("should allow authorized executor to claim token", async () => {
    await registry.connect(owner).authorizeDocumentExecutor(
      integraHash,
      executor.address
    );

    await expect(
      tokenizer.connect(executor).claimToken(
        integraHash,
        tokenId,
        attestationProof
      )
    ).to.not.be.reverted;
  });

  it("should prevent unauthorized executor from claiming", async () => {
    await expect(
      tokenizer.connect(unauthorized).claimToken(
        integraHash,
        tokenId,
        attestationProof
      )
    ).to.be.revertedWithCustomError(tokenizer, "Unauthorized");
  });

  it("should allow owner to revoke executor", async () => {
    await registry.connect(owner).authorizeDocumentExecutor(
      integraHash,
      executor.address
    );

    await registry.connect(owner).revokeDocumentExecutor(integraHash);

    await expect(
      tokenizer.connect(executor).claimToken(
        integraHash,
        tokenId,
        attestationProof
      )
    ).to.be.revertedWithCustomError(tokenizer, "Unauthorized");
  });
});
```

## Security Considerations

### Defense in Depth

Multiple independent security layers provide defense in depth:

1. **Attestation-Based Capabilities Compromise**: Even if attestation system compromised, still need document ownership/authorization
2. **Document Ownership Compromise**: Even if owner key compromised, attestations limit damage scope
3. **Per-Document Authorization Compromise**: Even if executor compromised, owner can immediately revoke

### Zero-Trust Principles

- **No Global Privileges**: No roles can access all documents
- **Explicit Authorization**: All access must be explicitly granted
- **Least Privilege**: Grant minimum capabilities needed
- **Revocable**: All permissions can be revoked by document owner

### Front-Running Protection

- **Recipient Validation**: Attestations bound to specific address
- **Mempool Safety**: Safe to broadcast transactions with proofs
- **No Proof Theft**: Stolen proofs can't be used by attacker

## Integration Guidelines

### For dApp Developers

1. **Issue Attestations with Proper Recipients**:
   ```typescript
   const attestation = await issueAttestation({
     recipient: user.address,  // ✅ Must match caller
     documentHash,
     capabilities: ROLE_PARTICIPANT,
     // ... other fields
   });
   ```

2. **Use Appropriate Capability Checks**:
   ```solidity
   // For token claims
   requiresCapability(integraHash, CORE_CLAIM, proof)

   // For payment requests
   requiresCapability(integraHash, FIN_REQUEST_PAYMENT, proof)

   // For document updates
   requiresCapability(integraHash, CORE_UPDATE, proof)
   ```

3. **Implement Executor Authorization UI**:
   ```typescript
   // Allow users to authorize backend server
   await registry.authorizeDocumentExecutor(integraHash, backendAddress);

   // Display current executor
   const executor = await registry.getDocumentExecutor(integraHash);

   // Allow revocation
   await registry.revokeDocumentExecutor(integraHash);
   ```

## See Also

- [Security Patterns](./security.md) - Comprehensive security architecture
- [Upgradeability Patterns](./upgradeability.md) - Progressive ossification
- [Registry Patterns](./registries.md) - Code hash verification
- [Foundation Documentation](../layer0/) - Attestation system details
