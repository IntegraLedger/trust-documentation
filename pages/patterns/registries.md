# Registry Patterns

Immutable registry architecture with code hash verification for secure infrastructure management.

## Overview

The Integra system uses a unified immutable registry contract to manage critical infrastructure components across the entire platform, providing a single source of truth for component discovery and validation. This registry architecture captures and verifies contract code hashes at registration time, preventing malicious upgrades and metamorphic contract attacks while enabling graceful degradation when components become unavailable. The immutable nature of the registry itself ensures that the validation logic can never be compromised, creating ultimate trust in the infrastructure lookup system.

The IntegraRegistryV7_Immutable contract supports four distinct component types through a unified interface, eliminating the need for separate registries per component category. PROVIDER components manage attestation systems including EAS, Verifiable Credentials, ZK proofs, and DIDs. VERIFIER components handle ZK proof verification for systems like Groth16, PLONK, and Poseidon hash functions. RESOLVER components extend document functionality through lifecycle management, compliance checking, and custom business logic hooks. TOKENIZER components are registered for validation and discovery, supporting all ERC standards including ERC-721, ERC-1155, and ERC-20 implementations. Each component registration includes code hash verification, active/inactive lifecycle status, human-readable metadata, and enumeration support for off-chain discovery and monitoring.

<div style="display: flex; justify-content: center; margin: 2rem 0;">
  <img src="/diagrams/registry-pattern.png" alt="Registry Patterns" style="width: 90%; height: auto;" />
</div>

## Why an Immutable Unified Registry?

### Trust Guarantees

The registry is immutable because it provides critical infrastructure that must be trustworthy:

**For All Component Types**:
- Code hash verification logic must be reliable
- Cannot be upgraded to bypass security checks
- Graceful degradation pattern must work correctly
- Users must trust that all infrastructure components are validated

**For PROVIDER Components** (Attestation Providers):
- Attestation verification must be trustworthy
- No risk of malicious provider substitution

**For VERIFIER Components** (ZK Verifiers):
- ZK verifier addresses must be trustworthy
- Proof verification is security-critical
- Must guarantee proof integrity forever

**For RESOLVER Components** (Document Resolvers):
- Resolver lookup must be reliable
- Service composition pattern depends on it
- Cannot risk DOS via compromised registry

**For TOKENIZER Components** (Token Implementations):
- Tokenizer validation must be consistent
- Code hash ensures tokenizer hasn't been compromised

### Benefits

- **Permanent**: Logic never changes after deployment
- **Trustless**: No governance can modify validation logic
- **Gas Efficient**: No proxy overhead
- **Simpler**: No upgrade complexity
- **Predictable**: Behavior guaranteed forever

## Pattern 1: Code Hash Verification

### Description

The core security pattern: capture contract code hash at registration, validate it hasn't changed on every retrieval.

### Registration with Code Hash Capture

```solidity
/**
 * @notice Register provider/verifier/resolver with code integrity tracking
 * @dev Captures code hash at registration for integrity verification
 */
function registerProvider(
    bytes32 providerId,
    address provider,
    string calldata providerType,
    string calldata description
) external onlyRole(GOVERNOR_ROLE) {
    if (provider == address(0)) revert ZeroAddress();

    // Check for duplicate registration
    if (providers[providerId].providerAddress != address(0)) {
        revert ProviderAlreadyRegistered(providerId, providers[providerId].providerAddress);
    }

    // SECURITY: Verify provider is a contract (not EOA)
    uint256 codeSize;
    assembly {
        codeSize := extcodesize(provider)
    }
    if (codeSize == 0) revert NotAContract(provider);

    // SECURITY: Capture code hash for integrity verification
    // Uses extcodehash opcode to get keccak256 of contract bytecode
    bytes32 codeHash;
    assembly {
        codeHash := extcodehash(provider)
    }

    providers[providerId] = ProviderInfo({
        providerAddress: provider,
        codeHash: codeHash,  // ✅ Store code hash
        active: true,
        registeredAt: block.timestamp,
        description: description,
        providerType: providerType
    });

    // Add to enumeration
    providerIds.push(providerId);
    providerIndex[providerId] = providerIds.length;

    emit ProviderRegistered(
        providerId,
        provider,
        codeHash,  // ✅ Event includes code hash
        providerType,
        description,
        block.timestamp
    );
}
```

### Retrieval with Code Hash Validation

```solidity
/**
 * @notice Get provider address with code integrity verification
 * @dev Returns address(0) if provider inactive or code changed
 *
 * SECURITY VALIDATION:
 * 1. ✅ Checks provider exists
 * 2. ✅ Checks provider is active
 * 3. ✅ Validates code hash matches registration
 * 4. ✅ Returns address(0) if any check fails
 */
function getProvider(bytes32 providerId) external view returns (address) {
    ProviderInfo storage info = providers[providerId];

    // CHECK 1: Provider exists
    if (info.providerAddress == address(0)) {
        return address(0);  // Not registered
    }

    // CHECK 2: Provider is active
    if (!info.active) {
        return address(0);  // Deactivated
    }

    // CHECK 3: SECURITY - Verify code hasn't changed
    address providerAddr = info.providerAddress;
    bytes32 currentHash;
    assembly {
        currentHash := extcodehash(providerAddr)
    }

    if (currentHash != info.codeHash) {
        return address(0);  // ✅ Code changed - SECURITY VIOLATION
    }

    return info.providerAddress;  // ✅ All checks passed
}
```

### Security Benefits

**Prevents Malicious Upgrades**:
```solidity
// Scenario: Attacker upgrades registered contract to malicious code
// 1. Contract registered: codeHash = 0xabc123...
// 2. Attacker upgrades contract (if upgradeable): codeHash = 0xdef456...
// 3. getProvider() called:
//    - currentHash (0xdef456...) != registeredHash (0xabc123...)
//    - Returns address(0) ✅ Attack prevented
```

**Detects SELFDESTRUCT Attacks**:
```solidity
// Scenario: Attacker destroys and redeploys contract at same address
// 1. Contract registered: codeHash = 0xabc123...
// 2. Attacker calls SELFDESTRUCT
// 3. Attacker deploys new malicious contract at same address
// 4. getProvider() called:
//    - New contract has different bytecode
//    - currentHash != registeredHash
//    - Returns address(0) ✅ Attack prevented
```

**Stops Metamorphic Contracts**:
```solidity
// Scenario: Metamorphic contract changes code via CREATE2
// 1. Metamorphic contract registered: codeHash = 0xabc123...
// 2. Contract metamorphs to new code: codeHash = 0xdef456...
// 3. getProvider() called:
//    - Code hash changed
//    - Returns address(0) ✅ Attack prevented
```

## Pattern 2: Graceful Degradation

### Description

Instead of reverting when a provider/verifier/resolver is unavailable, the registry returns `address(0)` and lets the caller decide how to handle it.

### Why Graceful Degradation?

```solidity
// ❌ BAD: Revert on unavailable provider
function getProvider(bytes32 providerId) external view returns (address) {
    ProviderInfo storage info = providers[providerId];

    if (info.providerAddress == address(0)) {
        revert ProviderNotFound(providerId);  // ❌ Reverts
    }

    if (!info.active) {
        revert ProviderInactive(providerId);  // ❌ Reverts
    }

    if (currentHash != info.codeHash) {
        revert ProviderCodeChanged(...);  // ❌ Reverts
    }

    return info.providerAddress;
}

// Problem: If provider becomes unavailable (code changed, deactivated, etc.),
// ALL operations using this provider REVERT, even if they could degrade gracefully.
// This creates a DOS vector!
```

```solidity
// ✅ GOOD: Return address(0) for unavailable provider
function getProvider(bytes32 providerId) external view returns (address) {
    ProviderInfo storage info = providers[providerId];

    if (info.providerAddress == address(0)) return address(0);  // ✅ Graceful
    if (!info.active) return address(0);  // ✅ Graceful
    if (currentHash != info.codeHash) return address(0);  // ✅ Graceful

    return info.providerAddress;
}

// Benefit: Caller decides how to handle unavailable provider:
// - Critical operations: Revert with custom error
// - Optional operations: Skip with event emission
// - Fallback operations: Use alternative provider
```

### Caller Handling Patterns

#### Pattern 1: Critical Operation (Must Revert)

```solidity
// AttestationAccessControlV7.sol - Provider is required
function _verifyCapability(...) internal {
    address provider = PROVIDER_REGISTRY.getProvider(providerId);

    if (provider == address(0)) {
        // Critical: Attestation verification cannot proceed
        revert ProviderNotFound(providerId);  // ✅ Revert with custom error
    }

    // Proceed with verification
    (bool verified, uint256 capabilities) = IAttestationProvider(provider)
        .verifyCapabilities(...);
}
```

#### Pattern 2: Optional Operation (Emit Event, Continue)

```solidity
// IntegraDocumentRegistryV7.sol - Primary resolver is best-effort
function _callPrimaryResolver(bytes32 integraHash, bytes4 selector, bytes memory data)
    internal
    returns (bool success)
{
    DocumentRecord storage doc = documents[integraHash];

    if (doc.primaryResolverId == bytes32(0)) return true;  // No resolver

    address resolver = resolverRegistry.getResolver(doc.primaryResolverId);

    if (resolver == address(0)) {
        // Optional: Emit event but don't revert
        emit PrimaryResolverUnavailable(integraHash, doc.primaryResolverId);
        return true;  // ✅ Continue with graceful degradation
    }

    // Attempt to call resolver
    (bool callSuccess,) = resolver.call{gas: gasLimit}(callData);

    if (!callSuccess) {
        revert PrimaryResolverFailed(integraHash, doc.primaryResolverId);
    }

    emit PrimaryResolverCalled(integraHash, doc.primaryResolverId, selector);
    return true;
}
```

#### Pattern 3: Fallback Operation (Use Alternative)

```solidity
// Example: Use fallback provider if primary unavailable
function _verifyCapabilityWithFallback(...) internal {
    address provider = PROVIDER_REGISTRY.getProvider(primaryProviderId);

    if (provider == address(0)) {
        // Try fallback provider
        provider = PROVIDER_REGISTRY.getProvider(fallbackProviderId);

        if (provider == address(0)) {
            // No providers available
            revert NoProvidersAvailable();
        }

        emit FallbackProviderUsed(fallbackProviderId);
    }

    // Proceed with verification using available provider
}
```

### Benefits

- **Prevents DOS**: One failed provider doesn't break entire system
- **Flexible Handling**: Caller chooses between revert/skip/fallback
- **Transparent**: Events track failures
- **Progressive Failure**: System degrades gracefully
- **User Choice**: Critical vs optional operations handled differently

## Pattern 3: Active/Inactive Status

### Description

Providers/verifiers/resolvers can be temporarily deactivated without removal, allowing for lifecycle management.

### Deactivation

```solidity
/**
 * @notice Deactivate provider (emergency stop)
 * @dev Does not remove provider, allows reactivation
 *
 * USE CASES:
 * - Provider bug discovered
 * - Provider being upgraded
 * - Temporary security concern
 * - Scheduled maintenance
 */
function deactivateProvider(bytes32 providerId, string calldata reason)
    external
    onlyRole(GOVERNOR_ROLE)
{
    ProviderInfo storage info = providers[providerId];
    if (info.providerAddress == address(0)) revert ProviderNotFound(providerId);

    info.active = false;

    emit ProviderDeactivated(providerId, info.providerAddress, block.timestamp);
    emit ProviderDeactivationReason(providerId, reason, block.timestamp);
}
```

### Reactivation with Safety Check

```solidity
/**
 * @notice Reactivate provider after deactivation
 * @dev Validates code hasn't changed before reactivating
 *
 * SECURITY: Prevents reactivation if code changed
 * - Cannot reactivate compromised provider
 * - Must register new version if code changed
 */
function reactivateProvider(bytes32 providerId) external onlyRole(GOVERNOR_ROLE) {
    ProviderInfo storage info = providers[providerId];
    if (info.providerAddress == address(0)) revert ProviderNotFound(providerId);

    // SECURITY: Verify code hasn't changed before reactivating
    address providerAddr = info.providerAddress;
    bytes32 currentHash;
    assembly {
        currentHash := extcodehash(providerAddr)
    }

    if (currentHash != info.codeHash) {
        // Code changed since registration - cannot reactivate
        revert ProviderCodeChanged(providerId, info.codeHash, currentHash);
    }

    info.active = true;

    emit ProviderReactivated(providerId, info.providerAddress, block.timestamp);
}
```

### Benefits

- **Temporary Control**: Can disable without losing registration data
- **Reversible**: Can reactivate after fixing issues
- **Safe**: Reactivation validates code integrity
- **Transparent**: Deactivation reason logged
- **Operational**: Supports maintenance and emergency response

## Pattern 4: Metadata Management

### Description

Registries store human-readable metadata for discovery, monitoring, and transparency.

### Metadata Structure

```solidity
struct ProviderInfo {
    address providerAddress;    // Contract address
    bytes32 codeHash;           // Code integrity hash
    bool active;                // Active/inactive status
    uint256 registeredAt;       // Registration timestamp
    string description;         // Human-readable description
    string providerType;        // Type categorization
}
```

### Provider Types

**Attestation Provider Types**:
- `"EAS"` - Ethereum Attestation Service
- `"VC"` - Verifiable Credentials
- `"ZK"` - Zero-Knowledge Proofs
- `"DID"` - Decentralized Identifiers
- `"JWT"` - JSON Web Tokens
- `"MULTI"` - Multiple attestation methods

**Resolver Types**:
- `"Lifecycle"` - Document expiry, renewal, archival
- `"Communication"` - Contact endpoints, messaging
- `"Compliance"` - KYC, jurisdiction checks
- `"Payment"` - Payment automation, escrow
- `"Governance"` - DAO controls, voting
- `"Multi-Purpose"` - Combination of above

**Verifier Types**:
- `"Groth16"` - Groth16 ZK proofs
- `"PLONK"` - PLONK proofs
- `"Halo2"` - Halo2 recursive proofs
- Custom types allowed

### Metadata Updates

```solidity
/**
 * @notice Update provider metadata (description and type)
 * @dev Does not change address or code hash
 *
 * USE CASES:
 * - Fix typos in description
 * - Reclassify provider type
 * - Add more details
 * - Update branding
 */
function updateProviderMetadata(
    bytes32 providerId,
    string calldata newDescription,
    string calldata newProviderType
) external onlyRole(GOVERNOR_ROLE) {
    ProviderInfo storage info = providers[providerId];
    if (info.providerAddress == address(0)) revert ProviderNotFound(providerId);

    info.description = newDescription;
    info.providerType = newProviderType;

    emit ProviderMetadataUpdated(
        providerId,
        newDescription,
        newProviderType,
        block.timestamp
    );
}
```

### Benefits

- **Discoverability**: Off-chain systems can enumerate and categorize
- **Transparency**: Clear descriptions of what each entry does
- **Flexibility**: Metadata can be updated without re-registration
- **Monitoring**: Easy to track provider ecosystem growth

## Pattern 5: Enumeration Support

### Description

Registries support enumeration for off-chain discovery and monitoring.

### Implementation

```solidity
/// @notice List of all provider IDs for enumeration
bytes32[] public providerIds;

/// @notice Index of provider ID in providerIds array (providerId => index + 1)
/// @dev 0 means not exists, 1 means index 0, etc.
mapping(bytes32 => uint256) private providerIndex;

/**
 * @notice Get total number of registered providers
 */
function getProviderCount() external view returns (uint256) {
    return providerIds.length;
}

/**
 * @notice Get provider ID by index (for enumeration)
 * @param index Index in providerIds array
 * @return Provider ID at index
 */
function getProviderIdByIndex(uint256 index) external view returns (bytes32) {
    if (index >= providerIds.length) revert IndexOutOfBounds(index);
    return providerIds[index];
}

/**
 * @notice Get all provider IDs
 * @return Array of all provider IDs
 */
function getAllProviderIds() external view returns (bytes32[] memory) {
    return providerIds;
}

/**
 * @notice Get all active providers
 * @return Array of active provider IDs
 */
function getActiveProviders() external view returns (bytes32[] memory) {
    uint256 activeCount = 0;

    // Count active providers
    for (uint256 i = 0; i < providerIds.length; i++) {
        if (providers[providerIds[i]].active) {
            activeCount++;
        }
    }

    // Build result array
    bytes32[] memory activeIds = new bytes32[](activeCount);
    uint256 index = 0;

    for (uint256 i = 0; i < providerIds.length; i++) {
        if (providers[providerIds[i]].active) {
            activeIds[index] = providerIds[i];
            index++;
        }
    }

    return activeIds;
}
```

### Off-Chain Usage

```typescript
// Enumerate all providers
const count = await providerRegistry.getProviderCount();

for (let i = 0; i < count; i++) {
  const providerId = await providerRegistry.getProviderIdByIndex(i);
  const info = await providerRegistry.getProviderInfo(providerId);

  console.log(`Provider: ${info.description}`);
  console.log(`  Type: ${info.providerType}`);
  console.log(`  Active: ${info.active}`);
  console.log(`  Address: ${info.providerAddress}`);
}

// Get only active providers
const activeIds = await providerRegistry.getActiveProviders();
console.log(`${activeIds.length} active providers`);
```

### Benefits

- **Discovery**: Off-chain systems can find all providers
- **Monitoring**: Track ecosystem growth and health
- **UI Support**: Build provider selection interfaces
- **Analytics**: Analyze provider usage patterns

## Testing Strategy

### Code Hash Tests

```typescript
describe("Code Hash Verification", () => {
  it("should capture code hash at registration", async () => {
    await registry.registerProvider(id, provider.address, "EAS", "Test Provider");

    const info = await registry.getProviderInfo(id);
    expect(info.codeHash).to.not.equal(ethers.constants.HashZero);
  });

  it("should detect code changes", async () => {
    await registry.registerProvider(id, provider.address, "EAS", "Test");

    // Upgrade provider (if upgradeable)
    await provider.upgradeTo(newImplementation.address);

    // getProvider should return address(0)
    const retrieved = await registry.getProvider(id);
    expect(retrieved).to.equal(ethers.constants.AddressZero);
  });

  it("should detect SELFDESTRUCT + redeploy", async () => {
    await registry.registerProvider(id, provider.address, "EAS", "Test");

    // SELFDESTRUCT provider
    await provider.destroy();

    // Deploy new contract at same address (if possible via CREATE2)
    const newProvider = await deployAtAddress(provider.address);

    // getProvider should return address(0) (code changed)
    const retrieved = await registry.getProvider(id);
    expect(retrieved).to.equal(ethers.constants.AddressZero);
  });
});
```

### Graceful Degradation Tests

```typescript
describe("Graceful Degradation", () => {
  it("should return address(0) for non-existent provider", async () => {
    const provider = await registry.getProvider(nonExistentId);
    expect(provider).to.equal(ethers.constants.AddressZero);
  });

  it("should return address(0) for inactive provider", async () => {
    await registry.registerProvider(id, provider.address, "EAS", "Test");
    await registry.deactivateProvider(id, "Testing");

    const retrieved = await registry.getProvider(id);
    expect(retrieved).to.equal(ethers.constants.AddressZero);
  });

  it("should allow caller to handle unavailable provider", async () => {
    // Register and deactivate
    await registry.registerProvider(id, provider.address, "EAS", "Test");
    await registry.deactivateProvider(id, "Testing");

    // Caller handles gracefully
    const provider = await registry.getProvider(id);
    if (provider === ethers.constants.AddressZero) {
      // Skip operation (no revert)
      console.log("Provider unavailable, skipping");
    }
  });
});
```

### Lifecycle Tests

```typescript
describe("Provider Lifecycle", () => {
  it("should deactivate and reactivate provider", async () => {
    await registry.registerProvider(id, provider.address, "EAS", "Test");

    await registry.deactivateProvider(id, "Maintenance");
    let retrieved = await registry.getProvider(id);
    expect(retrieved).to.equal(ethers.constants.AddressZero);

    await registry.reactivateProvider(id);
    retrieved = await registry.getProvider(id);
    expect(retrieved).to.equal(provider.address);
  });

  it("should prevent reactivation if code changed", async () => {
    await registry.registerProvider(id, provider.address, "EAS", "Test");
    await registry.deactivateProvider(id, "Maintenance");

    // Upgrade provider while deactivated
    await provider.upgradeTo(newImplementation.address);

    // Reactivation should fail
    await expect(
      registry.reactivateProvider(id)
    ).to.be.revertedWithCustomError(registry, "ProviderCodeChanged");
  });
});
```

## Integration Guidelines

### For Governance

1. **Register Providers**:
   ```typescript
   await providerRegistry.registerProvider(
     providerId,
     providerAddress,
     "EAS",
     "Ethereum Attestation Service V1"
   );
   ```

2. **Monitor Code Integrity**:
   ```typescript
   // Set up monitoring
   providerRegistry.on("ProviderRegistered", (id, address, codeHash) => {
     // Store code hash for monitoring
     monitorCodeHash(address, codeHash);
   });

   // Periodic validation
   async function validateProviders() {
     const ids = await providerRegistry.getAllProviderIds();
     for (const id of ids) {
       const provider = await providerRegistry.getProvider(id);
       if (provider === ethers.constants.AddressZero) {
         alert(`Provider ${id} unavailable!`);
       }
     }
   }
   ```

3. **Handle Deactivation**:
   ```typescript
   // Emergency deactivation
   await providerRegistry.deactivateProvider(
     providerId,
     "Security vulnerability discovered, investigating"
   );

   // After fix, reactivate
   await providerRegistry.reactivateProvider(providerId);
   ```

## See Also

- [Security Patterns](./security.md) - Code hash verification security
- [Resolver Patterns](./resolvers.md) - Resolver composition using registries
- [Foundation Documentation](./layer0/) - Attestation provider architecture
