# Security Patterns

Comprehensive security patterns implemented across all Integra V7 smart contracts.

## Overview

The Integra V7 smart contract system implements defense-in-depth security with multiple layers of protection:

- **Reentrancy Protection**: `nonReentrant` modifier on all state-changing functions
- **Access Control**: Role-based, attestation-based, and document-level authorization
- **Pausability**: Emergency circuit breakers for all contracts
- **Checks-Effects-Interactions**: State updates before external calls
- **Front-running Protection**: Attestation recipient validation
- **Code Hash Verification**: Registry pattern prevents malicious upgrades
- **Graceful Degradation**: Safe failure modes instead of DOS
- **Emergency Controls**: Time-limited multisig powers with progressive expiry

## Pattern 1: Reentrancy Protection

### Description

All state-changing functions use OpenZeppelin's `ReentrancyGuard` to prevent reentrancy attacks. The `nonReentrant` modifier ensures no function can be called recursively, protecting against malicious contracts attempting to re-enter during external calls.

### Implementation

```solidity
// All contracts inherit ReentrancyGuard
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

abstract contract AttestationAccessControlV7 is
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,  // ✅ Reentrancy protection
    PausableUpgradeable
{
    // Standard pattern for all state-changing functions
    function _verifyCapability(
        address user,
        bytes32 documentHash,
        uint256 requiredCapability,
        bytes calldata attestationProof
    ) internal nonReentrant whenNotPaused {  // ✅ nonReentrant modifier
        // ... state changes

        // SECURITY: External calls to attestation providers
        (bool verified, uint256 grantedCapabilities) = IAttestationProvider(provider)
            .verifyCapabilities(attestationProof, user, documentHash, requiredCapability);

        // ... validation
    }
}
```

### Benefits

- **Complete Protection**: Prevents all reentrancy attack vectors
- **Zero Trust**: No assumptions about external contract behavior
- **Gas Efficient**: Minimal overhead (~2,600 gas)
- **Battle Tested**: OpenZeppelin's proven implementation

### Contracts Using Pattern

- `AttestationAccessControlV7` (Layer 0) - All verification functions
- `IntegraDocumentRegistryV7` (Layer 2) - Registration, transfers, executor authorization
- `BaseTokenizerV7` (Layer 3) - Token reserve, claim, cancel operations
- `IntegraMessageV7` (Layer 4) - Message sending
- `IntegraSignalV7` (Layer 4) - Payment request operations
- `IntegraExecutorV7` (Layer 6) - Meta-transaction execution

### Testing Strategy

1. **Reentrancy Attack Tests**:
   - Deploy malicious contract that attempts reentrancy
   - Verify all state-changing functions revert with "ReentrancyGuard: reentrant call"
   - Test both direct and cross-contract reentrancy

2. **Gas Cost Analysis**:
   - Measure gas overhead of `nonReentrant` modifier
   - Verify acceptable performance impact

## Pattern 2: Checks-Effects-Interactions

### Description

The Checks-Effects-Interactions pattern ensures state changes occur before external calls, preventing reentrancy and race conditions. Even with `nonReentrant` protection, this pattern provides defense-in-depth.

### Implementation

```solidity
// TrustGraphIntegration.sol - Example from trust credential issuance
function _issueCredentialsToAllParties(bytes32 integraHash) internal {
    // CHECKS: Validate preconditions
    if (credentialsIssued[integraHash]) {
        return; // Already issued
    }

    // EFFECTS: Update state BEFORE external calls
    credentialsIssued[integraHash] = true;  // ✅ State update first

    // INTERACTIONS: External calls last (wrapped in try/catch)
    address[] memory parties = _getDocumentParties(integraHash);

    for (uint256 i = 0; i < parties.length;) {
        // Try/catch prevents one failure from blocking others
        try this._issueCredentialToParty(parties[i], integraHash) {
            emit TrustCredentialIssued(integraHash, parties[i]);
        } catch Error(string memory reason) {
            emit TrustCredentialFailed(integraHash, parties[i], reason);
        } catch {
            emit TrustCredentialFailed(integraHash, parties[i], "Unknown error");
        }

        unchecked { ++i; }
    }
}
```

### Benefits

- **Reentrancy Safe**: State updated before external calls
- **Non-blocking**: Try/catch prevents cascade failures
- **Transparent**: Events track both success and failure
- **Idempotent**: Double-issuance prevented by state flag

### Critical Locations

1. **Trust Credential Issuance** (`TrustGraphIntegration.sol:182-198`)
2. **Resolver Calls** (`IntegraDocumentRegistryV7.sol:1004-1071`)
3. **Fee Collection** (`IntegraDocumentRegistryV7.sol`)

## Pattern 3: Access Control Layers

### Description

Multi-layer access control with three security levels:

1. **Layer 0**: Attestation-based capabilities (fine-grained permissions)
2. **Layer 2**: Document ownership (coarse-grained permissions)
3. **Layer 3**: Per-document executor authorization (delegated permissions)

### Layer 0: Attestation-Based Access Control

```solidity
/**
 * @notice Verify caller has required capability via attestation
 * @dev 13-step verification process with front-running protection
 */
modifier requiresCapability(
    bytes32 documentHash,
    uint256 requiredCapability,
    bytes calldata attestationProof
) {
    _verifyCapability(msg.sender, documentHash, requiredCapability, attestationProof);
    _;
}

// 13-Step Verification (EASAttestationProviderV7.sol:279-402)
function verifyCapabilities(...) external view returns (bool, uint256) {
    // 1. ✅ Fetch attestation from EAS
    // 2. ✅ Verify attestation exists
    // 3. ✅ Verify not revoked
    // 4. ✅ Verify not expired
    // 5. ✅ Verify schema matches
    // 6. ✅ Verify recipient matches (FRONT-RUNNING PROTECTION)
    // 7. ✅ Verify attester is authorized issuer
    // 8. ✅ Verify source chain ID (cross-chain replay prevention)
    // 9. ✅ Verify source EAS contract (EAS spoofing prevention)
    // 10. ✅ Verify document contract (contract spoofing prevention)
    // 11. ✅ Verify schema version
    // 12. ✅ Verify document hash matches
    // 13. ✅ Verify attestation age (optional time limits)
}
```

### Layer 2: Document Ownership

```solidity
// IntegraDocumentRegistryV7.sol - Three access paths
function getDocumentOwner(bytes32 integraHash) public view returns (address) {
    DocumentRecord storage doc = documents[integraHash];
    if (!doc.exists) revert DocumentNotRegistered(integraHash);
    return doc.owner;
}

// Owner validation in critical operations
function transferDocumentOwnership(
    bytes32 integraHash,
    address newOwner,
    string calldata reason
) external nonReentrant whenNotPaused {
    DocumentRecord storage doc = documents[integraHash];

    // Only current owner can transfer
    if (msg.sender != doc.owner) {
        revert Unauthorized(msg.sender, integraHash);
    }

    // ... transfer logic
}
```

### Layer 3: Per-Document Executor Authorization

```solidity
// BaseTokenizerV7.sol - Zero-trust executor model
modifier requireOwnerOrExecutor(bytes32 integraHash) {
    // VALIDATION: Ensure document uses THIS tokenizer
    address documentTokenizer = documentRegistry.getTokenizer(integraHash);
    if (documentTokenizer == address(0)) {
        revert TokenizerNotSet(integraHash);
    }
    if (documentTokenizer != address(this)) {
        revert WrongTokenizer(integraHash, documentTokenizer, address(this));
    }

    // PATH 1: Document owner (highest priority)
    address owner = documentRegistry.getDocumentOwner(integraHash);
    if (msg.sender == owner) {
        _;
        return;
    }

    // PATH 2: Per-document authorized executor (opt-in)
    address authorizedExecutor = documentRegistry.getDocumentExecutor(integraHash);
    if (authorizedExecutor != address(0) && msg.sender == authorizedExecutor) {
        _;
        return;
    }

    // PATH 3: Unauthorized - revert
    revert Unauthorized(msg.sender, integraHash);
}
```

### Security Benefits

- **Defense in Depth**: Multiple independent validation layers
- **Zero Trust**: No global privileges, all access explicit
- **Front-Running Protection**: Recipient validation in attestations
- **Owner Sovereignty**: Document owner always maintains control
- **Flexible Delegation**: Opt-in executor authorization

### Testing Strategy

1. **Attestation Tests**:
   - Test all 13 verification steps individually
   - Test front-running scenarios (wrong recipient)
   - Test expired/revoked attestations
   - Test cross-chain replay attacks

2. **Ownership Tests**:
   - Test ownership transfer scenarios
   - Test unauthorized access attempts
   - Test edge cases (zero address, self-transfer)

3. **Executor Tests**:
   - Test opt-in authorization
   - Test revocation
   - Test wrong tokenizer attacks
   - Test EOA vs contract executors

## Pattern 4: Pausability

### Description

Emergency circuit breaker pattern using OpenZeppelin's `Pausable`. All state-changing functions can be paused by governance in case of security issues.

### Implementation

```solidity
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

abstract contract AttestationAccessControlV7 is
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable  // ✅ Pausability
{
    // Pause functions (governance only)
    function pause() external onlyRole(GOVERNOR_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(GOVERNOR_ROLE) {
        _unpause();
    }

    // All state-changing functions use whenNotPaused
    function criticalFunction(...)
        external
        nonReentrant
        whenNotPaused  // ✅ Can be paused
        onlyRole(GOVERNOR_ROLE)
    {
        // ... implementation
    }
}
```

### Benefits

- **Emergency Stop**: Immediately halt all operations
- **Incident Response**: Time to investigate and fix issues
- **Reversible**: Can be unpaused after resolution
- **Governance Controlled**: Only authorized roles can pause

### Contracts with Pausability

All contracts support pausability:
- Layer 0: `AttestationAccessControlV7`, `EASAttestationProviderV7`
- Layer 2: `IntegraDocumentRegistryV7_Immutable`
- Layer 3: All tokenizers (via `BaseTokenizerV7`)
- Layer 4: `IntegraMessageV7`, `IntegraSignalV7`
- Layer 6: `IntegraExecutorV7`

## Pattern 5: Code Hash Verification

### Description

Registry pattern that captures and validates contract code hashes, preventing malicious contract upgrades and metamorphic contract attacks.

### Implementation

```solidity
// AttestationProviderRegistryV7_Immutable.sol
function registerProvider(
    bytes32 providerId,
    address provider,
    string calldata providerType,
    string calldata description
) external onlyRole(GOVERNOR_ROLE) {
    // Verify provider is a contract
    uint256 codeSize;
    assembly { codeSize := extcodesize(provider) }
    if (codeSize == 0) revert NotAContract(provider);

    // SECURITY: Capture code hash at registration
    bytes32 codeHash;
    assembly { codeHash := extcodehash(provider) }

    providers[providerId] = ProviderInfo({
        providerAddress: provider,
        codeHash: codeHash,  // ✅ Store code hash
        active: true,
        registeredAt: block.timestamp,
        description: description,
        providerType: providerType
    });
}

// Retrieval with integrity verification
function getProvider(bytes32 providerId) external view returns (address) {
    ProviderInfo storage info = providers[providerId];

    // Check provider exists and is active
    if (info.providerAddress == address(0)) return address(0);
    if (!info.active) return address(0);

    // SECURITY: Verify code hasn't changed
    address providerAddr = info.providerAddress;
    bytes32 currentHash;
    assembly { currentHash := extcodehash(providerAddr) }

    if (currentHash != info.codeHash) {
        return address(0);  // ✅ Code changed - graceful degradation
    }

    return info.providerAddress;
}
```

### Security Benefits

- **Prevents Malicious Upgrades**: Detects contract code changes
- **Blocks SELFDESTRUCT Attacks**: Detects destroy + redeploy
- **Stops Metamorphic Contracts**: Code hash validation catches metamorphism
- **Graceful Degradation**: Returns `address(0)` instead of reverting (prevents DOS)

### Registries Using Pattern

1. `AttestationProviderRegistryV7_Immutable` - Attestation system providers
2. `IntegraVerifierRegistryV7_Immutable` - ZK proof verifiers
3. `IntegraResolverRegistryV7_Immutable` - Document resolvers

### Testing Strategy

1. **Code Change Detection**:
   - Register contract with initial code
   - Upgrade contract (if upgradeable)
   - Verify `getProvider()` returns `address(0)`

2. **SELFDESTRUCT Attack**:
   - Register contract
   - SELFDESTRUCT contract
   - Deploy new contract at same address
   - Verify code hash mismatch detected

3. **Graceful Degradation**:
   - Test calling contracts handle `address(0)` properly
   - Verify events emitted for unavailable providers
   - Test fallback logic

## Pattern 6: Front-Running Protection

### Description

Attestation-based access control includes recipient validation to prevent front-running attacks where an attacker intercepts and uses someone else's attestation proof.

### Implementation

```solidity
// EASAttestationProviderV7.sol - Step 6 of 13-step verification
function verifyCapabilities(
    bytes calldata proof,
    address recipient,
    bytes32 documentHash,
    uint256 requiredCapability
) external view returns (bool verified, uint256 grantedCapabilities) {
    // ... previous steps

    // STEP 6: FRONT-RUNNING PROTECTION
    // Verify attestation recipient matches the caller
    if (attestation.recipient != recipient) {
        return (false, 0);  // Wrong recipient - proof stolen or front-run
    }

    // ... remaining steps
}
```

### Attack Scenario Prevented

```solidity
// WITHOUT recipient validation:
// 1. Alice generates attestation for herself
// 2. Bob observes Alice's transaction in mempool
// 3. Bob copies Alice's attestation proof
// 4. Bob front-runs with higher gas, using Alice's proof
// 5. Bob gains Alice's capabilities ❌

// WITH recipient validation:
// 1. Alice generates attestation for herself (recipient = Alice)
// 2. Bob observes Alice's transaction
// 3. Bob copies Alice's proof
// 4. Bob front-runs with higher gas
// 5. Verification fails: attestation.recipient (Alice) != Bob ✅
```

### Benefits

- **Prevents Proof Theft**: Attestations bound to specific recipient
- **Mempool Safety**: Safe to broadcast transactions with proofs
- **No Replay Attacks**: Proofs can't be reused by different addresses

## Pattern 7: Graceful Degradation

### Description

Instead of reverting when external dependencies fail, the system returns safe default values (`address(0)`, `false`) and allows callers to decide how to handle failures.

### Implementation

```solidity
// Registry returns address(0) instead of reverting
function getProvider(bytes32 providerId) external view returns (address) {
    ProviderInfo storage info = providers[providerId];

    if (info.providerAddress == address(0)) return address(0);  // Not found
    if (!info.active) return address(0);  // Inactive
    if (currentHash != info.codeHash) return address(0);  // Code changed

    return info.providerAddress;
}

// Caller decides how to handle
function _verifyCapability(...) internal {
    address provider = PROVIDER_REGISTRY.getProvider(providerId);

    if (provider == address(0)) {
        // Option 1: Revert (critical operation)
        revert ProviderNotFound(providerId);

        // Option 2: Emit event and skip (optional operation)
        emit ProviderUnavailable(providerId);
        return;

        // Option 3: Use fallback provider
        provider = fallbackProvider;
    }
}
```

### Benefits

- **Prevents DOS**: One failed dependency doesn't break entire system
- **Flexible Handling**: Callers choose between revert/skip/fallback
- **Transparent**: Events emitted for failures
- **Progressive Failure**: System degrades gracefully instead of hard failure

## Pattern 8: Emergency Controls

### Description

Time-limited emergency powers with progressive expiry, allowing rapid response while ensuring decentralization.

### Implementation

```solidity
// IntegraDocumentRegistryV7_Immutable.sol
address public immutable emergencyAddress;  // IMMUTABLE
uint256 public immutable emergencyExpiry;   // Set at deployment

constructor(..., address _emergencyAddress) {
    emergencyAddress = _emergencyAddress;
    emergencyExpiry = block.timestamp + 180 days;  // 6 months
}

function emergencyUnlockResolvers(
    bytes32 integraHash,
    string calldata justification
) external nonReentrant {
    // TIME-GATED AUTHORIZATION
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
        justification,  // ✅ Transparent justification
        block.timestamp,
        msg.sender == emergencyAddress,
        block.timestamp < emergencyExpiry
    );
}
```

### Security Features

- **Time-Limited**: Emergency powers expire after 6 months
- **Immutable Address**: Cannot be changed after deployment
- **Dual Authorization**: Emergency OR governance during active period
- **Transparent**: Requires justification string in event
- **Progressive Decentralization**: Auto-expires to governance-only
- **Trackable**: Events include all context for monitoring

### Recommended Configuration

- **Emergency Address**: Use Gnosis Safe multisig (3-of-5 or 5-of-9)
- **Monitoring**: Alert on all `ResolversEmergencyUnlocked` events
- **Public Reporting**: Monthly transparency reports of emergency usage
- **Documentation**: Clear procedures for emergency scenarios

## Testing Strategy

### Security Test Suite

1. **Reentrancy Tests**:
   ```typescript
   describe("Reentrancy Protection", () => {
     it("should prevent reentrancy on verifyCapability", async () => {
       const maliciousProvider = await deployMaliciousProvider();
       // Attempt reentrancy attack
       await expect(
         contract.verifyCapability(..., maliciousProvider)
       ).to.be.revertedWith("ReentrancyGuard: reentrant call");
     });
   });
   ```

2. **Access Control Tests**:
   ```typescript
   describe("Multi-Layer Access Control", () => {
     it("should enforce attestation capabilities", async () => {
       // Test without valid attestation
       await expect(
         tokenizer.claimToken(integraHash, invalidProof)
       ).to.be.revertedWith("NoCapability");
     });

     it("should enforce document ownership", async () => {
       // Test non-owner attempting transfer
       await expect(
         registry.connect(attacker).transferOwnership(integraHash, newOwner)
       ).to.be.revertedWith("Unauthorized");
     });
   });
   ```

3. **Pausability Tests**:
   ```typescript
   describe("Emergency Controls", () => {
     it("should pause all operations", async () => {
       await contract.pause();
       await expect(
         contract.registerDocument(...)
       ).to.be.revertedWith("Pausable: paused");
     });
   });
   ```

4. **Code Hash Tests**:
   ```typescript
   describe("Code Integrity", () => {
     it("should detect code changes", async () => {
       await registry.registerProvider(id, provider, ...);
       await provider.upgrade(newImplementation);
       const retrieved = await registry.getProvider(id);
       expect(retrieved).to.equal(ethers.ZeroAddress);
     });
   });
   ```

## Integration Guidelines

### For Integrators

1. **Always Use Modifiers**:
   ```solidity
   function yourFunction(...)
       external
       nonReentrant       // ✅ Always include
       whenNotPaused      // ✅ Always include
       requireOwnerOrExecutor(integraHash)  // ✅ Access control
   {
       // ... implementation
   }
   ```

2. **Handle Graceful Degradation**:
   ```solidity
   address provider = PROVIDER_REGISTRY.getProvider(providerId);
   if (provider == address(0)) {
       emit ProviderUnavailable(providerId);
       return;  // Or use fallback logic
   }
   ```

3. **Monitor Emergency Events**:
   ```typescript
   contract.on("ResolversEmergencyUnlocked", (hash, unlocker, justification) => {
       logAlert(`Emergency unlock: ${justification}`);
   });
   ```

## References

- **OpenZeppelin Security**: https://docs.openzeppelin.com/contracts/4.x/api/security
- **Ethereum Attestation Service**: https://docs.attest.sh/
- **Smart Contract Security Best Practices**: https://consensys.github.io/smart-contract-best-practices/

## See Also

- [Access Control Patterns](./access-control.md) - Detailed access control architecture
- [Registry Patterns](./registries.md) - Code hash verification deep dive
- [Emergency Controls](../guides/emergency-procedures.md) - Operational procedures
