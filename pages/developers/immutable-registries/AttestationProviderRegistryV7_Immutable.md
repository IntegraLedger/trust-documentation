# AttestationProviderRegistryV7_Immutable

## Overview

**Version**: 7.0.0
**Type**: Immutable Contract (Deploy Once, Never Upgrade)
**License**: MIT
**Inherits**: AccessControl

AttestationProviderRegistryV7_Immutable is an immutable registry for attestation providers (EAS, VC, ZK, DIDs) with code integrity verification. It prevents malicious provider upgrades through code hash validation.

### Purpose

- Maintain registry of attestation providers (EAS, Verifiable Credentials, Zero-Knowledge, DIDs)
- Validate provider code integrity through hash checking
- Enable/disable providers without removing them
- Provide enumeration for discovery
- Ensure provider references remain valid forever

### Key Features

- Code hash validation prevents malicious provider upgrades
- Active/inactive status tracking for emergency stops
- Provider type categorization for organization
- Code integrity verification on every retrieval
- Graceful degradation (returns address(0) if compromised)
- Enumeration support with pagination

## Architecture

### Design Philosophy

**Why Immutable?**

The provider registry MUST be immutable because:
1. Provider references must remain valid forever
2. Code hash validation logic cannot be manipulated
3. Contracts across chains must use consistent provider IDs
4. Historical integrations must continue working

**Security Model**

```
Registration:
1. Provider contract address provided
2. Verify address is a contract (not EOA)
3. Capture code hash at registration
4. Store provider info with code hash
5. Emit event with transparency data

Retrieval:
1. Lookup provider info
2. Check if active
3. Read current code hash from chain
4. Compare with stored hash
5. Return address if valid, address(0) if changed
```

### Integration Points

- **AttestationAccessControlV7**: Uses getProvider() to lookup providers
- **EASAttestationProviderV7**: Registered as a provider
- **Future Providers**: VC, ZK, DID providers register here

## Key Concepts

### 1. Code Hash Validation

When a provider is registered, the registry captures the bytecode hash:

```solidity
bytes32 codeHash;
assembly {
    codeHash := extcodehash(providerAddress)
}
```

On retrieval, the current hash is checked:

```solidity
bytes32 currentHash;
assembly {
    currentHash := extcodehash(providerAddress)
}

if (currentHash != storedHash) {
    return address(0); // Code changed - provider compromised
}
```

**Why This Matters**:
- Prevents malicious upgrades of provider contracts
- Detects if provider code changed (via DELEGATECALL or CREATE2 replacement)
- Enables automatic security response (graceful degradation)

### 2. Provider Types

Provider types are documentation standards (not enforced):

| Type | Description | Use Case |
|------|-------------|----------|
| EAS | Ethereum Attestation Service | On-chain attestations |
| VC | Verifiable Credentials | W3C credentials |
| ZK | Zero-Knowledge Proofs | Privacy-preserving proofs |
| DID | Decentralized Identifiers | Identity verification |
| JWT | JSON Web Tokens | Off-chain signed tokens |
| MULTI | Multiple Methods | Hybrid approaches |

### 3. Graceful Degradation

Instead of reverting, getProvider() returns address(0) if:
- Provider doesn't exist
- Provider is deactivated
- Provider code changed

**Caller Pattern**:
```solidity
address provider = registry.getProvider(providerId);
if (provider == address(0)) {
    // Handle missing/invalid provider
    emit ProviderUnavailable(providerId);
    revert("Provider not available");
}
// Use provider...
```

**Benefits**:
- Prevents DOS attacks
- Allows fallback logic
- Enables progressive failure handling

### 4. Provider Lifecycle

```
Registration → Active → [Deactivated] → [Reactivated] → Active
                  ↓
              Code Change → Returns address(0) (automatic)
```

## State Variables

### Version

```solidity
string public constant VERSION = "7.0.0"
```

### Roles

```solidity
bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE")
```

Only governor can register/deactivate providers.

### Provider Info Struct

```solidity
struct ProviderInfo {
    address providerAddress;  // Provider contract address
    bytes32 codeHash;         // Code hash at registration (integrity check)
    bool active;              // Can be deactivated without removal
    uint256 registeredAt;     // Registration timestamp
    string description;       // Human-readable description
    string providerType;      // Provider type (e.g., "EAS", "VC", "ZK")
}
```

### Storage Mappings

```solidity
mapping(bytes32 => ProviderInfo) public providers;
```

Main registry mapping provider ID to provider info.

```solidity
bytes32[] public providerIds;
```

Array of all provider IDs for enumeration.

```solidity
mapping(bytes32 => uint256) private providerIndex;
```

Index of provider ID in providerIds array (index + 1, 0 = not exists).

## Functions

### registerProvider

```solidity
function registerProvider(
    bytes32 providerId,
    address provider,
    string calldata providerType,
    string calldata description
) external onlyRole(GOVERNOR_ROLE)
```

Register attestation provider with code integrity tracking.

**Parameters**:
- `providerId`: Unique identifier (e.g., keccak256("EAS_V1"))
- `provider`: Contract address of provider
- `providerType`: Type of provider ("EAS", "VC", "ZK", etc.)
- `description`: Human-readable description

**Validation**:
1. Provider address is not zero
2. Provider ID not already registered
3. Provider address is a contract (not EOA)
4. Code hash can be captured

**Events**: Emits `ProviderRegistered`

**Errors**:
- `ZeroAddress()`: Provider address is zero
- `ProviderAlreadyRegistered(providerId, existingProvider)`: Duplicate registration
- `NotAContract(provider)`: Address is not a contract

**Example**:
```solidity
bytes32 providerId = keccak256("EAS_V1");
address easProvider = 0x123...;

providerRegistry.registerProvider(
    providerId,
    easProvider,
    "EAS",
    "Ethereum Attestation Service V1"
);
```

**Gas Cost**: ~100,000 gas (one-time cost)

### getProvider

```solidity
function getProvider(bytes32 providerId)
    external
    view
    returns (address)
```

Get provider address with code integrity verification.

**Parameters**:
- `providerId`: Provider identifier

**Returns**:
- Provider address (or address(0) if invalid/inactive)

**Validation Steps**:
1. Check provider exists
2. Check provider is active
3. Validate code hash matches registration
4. Return address or address(0)

**Security**:
This function performs comprehensive validation:
- Provider exists in registry
- Provider is active (not deactivated)
- Code hash matches registration (not compromised)

Returns address(0) if any check fails, allowing graceful degradation.

**Example**:
```solidity
address provider = providerRegistry.getProvider(providerId);
if (provider == address(0)) {
    revert ProviderNotFound(providerId);
}

// Safe to use provider
IAttestationProvider(provider).verifyCapabilities(...);
```

**Gas Cost**: ~5,000 gas (storage reads + code hash check)

### getProviderInfo

```solidity
function getProviderInfo(bytes32 providerId)
    external
    view
    returns (ProviderInfo memory)
```

Get provider info without integrity check.

**Parameters**:
- `providerId`: Provider identifier

**Returns**:
- `ProviderInfo` struct with all provider details

**Use Case**: Querying provider details for display/debugging (not for verification).

**Example**:
```solidity
ProviderInfo memory info = providerRegistry.getProviderInfo(providerId);
console.log("Provider:", info.description);
console.log("Type:", info.providerType);
console.log("Registered:", info.registeredAt);
```

### deactivateProvider

```solidity
function deactivateProvider(bytes32 providerId, string calldata reason)
    external
    onlyRole(GOVERNOR_ROLE)
```

Deactivate provider (emergency stop).

**Parameters**:
- `providerId`: Provider to deactivate
- `reason`: Human-readable reason for transparency

**Effects**:
- Sets `active = false`
- getProvider() will return address(0)
- Provider can be reactivated later

**Use Cases**:
- Provider bug discovered
- Provider being upgraded
- Temporary security concern
- Attestation method deprecation

**Events**:
- Emits `ProviderDeactivated`
- Emits `ProviderDeactivationReason` if reason provided

**Errors**:
- `ProviderNotFound(providerId)`: Provider doesn't exist

**Example**:
```solidity
providerRegistry.deactivateProvider(
    providerId,
    "Security vulnerability discovered in provider"
);
```

### reactivateProvider

```solidity
function reactivateProvider(bytes32 providerId)
    external
    onlyRole(GOVERNOR_ROLE)
```

Reactivate previously deactivated provider.

**Parameters**:
- `providerId`: Provider to reactivate

**Security**: Verifies code hasn't changed before reactivating.

**Effects**:
- Sets `active = true`
- getProvider() will return address again

**Events**: Emits `ProviderReactivated`

**Errors**:
- `ProviderNotFound(providerId)`: Provider doesn't exist
- `ProviderCodeChanged(providerId, expectedHash, currentHash)`: Code changed since registration

**Example**:
```solidity
// After fixing provider bug
providerRegistry.reactivateProvider(providerId);
```

### Enumeration Functions

```solidity
function getProviderCount() external view returns (uint256)
```

Get total number of registered providers.

```solidity
function getProviderIdAt(uint256 index) external view returns (bytes32)
```

Get provider ID at specific index.

```solidity
function getAllProviderIds() external view returns (bytes32[] memory)
```

Get all provider IDs. **Warning**: Gas-intensive for large registries.

```solidity
function getProviderIdsPaginated(uint256 offset, uint256 limit)
    external
    view
    returns (bytes32[] memory)
```

Get paginated list of provider IDs.

**Parameters**:
- `offset`: Starting index
- `limit`: Maximum number of results

**Example**:
```solidity
// Get providers 0-9
bytes32[] memory page1 = providerRegistry.getProviderIdsPaginated(0, 10);

// Get providers 10-19
bytes32[] memory page2 = providerRegistry.getProviderIdsPaginated(10, 10);
```

### getVersion

```solidity
function getVersion() external pure returns (string memory)
```

Get contract version.

**Returns**: "7.0.0"

## Events

### ProviderRegistered

```solidity
event ProviderRegistered(
    bytes32 indexed providerId,
    address indexed provider,
    bytes32 codeHash,
    string providerType,
    string description,
    uint256 timestamp
)
```

Emitted when a provider is registered.

**Indexed Fields**: providerId, provider
**Data Fields**: codeHash, providerType, description, timestamp

### ProviderDeactivated

```solidity
event ProviderDeactivated(
    bytes32 indexed providerId,
    address indexed provider,
    uint256 timestamp
)
```

Emitted when a provider is deactivated.

### ProviderReactivated

```solidity
event ProviderReactivated(
    bytes32 indexed providerId,
    address indexed provider,
    uint256 timestamp
)
```

Emitted when a provider is reactivated.

### ProviderDeactivationReason

```solidity
event ProviderDeactivationReason(
    bytes32 indexed providerId,
    string reason,
    uint256 timestamp
)
```

Emitted when a provider is deactivated with a reason.

## Security Considerations

### Code Hash Validation

**How It Works**:
```solidity
// At registration
bytes32 codeHash = extcodehash(provider);
store(providerId, codeHash);

// At retrieval
bytes32 currentHash = extcodehash(provider);
if (currentHash != storedHash) {
    return address(0); // Changed!
}
```

**What It Detects**:
- Provider contract upgraded via proxy
- Provider address replaced via CREATE2 with different code
- Malicious code injection

**What It Doesn't Detect**:
- Storage changes in provider (only code hash checked)
- Off-chain changes (signing keys, external dependencies)

**Best Practices**:
1. Use immutable providers when possible
2. If upgradeable, coordinate upgrades with registry update
3. Monitor ProviderDeactivated events
4. Have fallback providers ready

### Graceful Degradation Pattern

**Why address(0) Instead of Revert?**

Traditional approach:
```solidity
// Bad: Reverts, prevents fallback logic
function getProvider(bytes32 id) external view returns (address) {
    require(providers[id].active, "Provider inactive");
    require(codeHashValid(id), "Code changed");
    return providers[id].providerAddress;
}
```

V7 approach:
```solidity
// Good: Returns address(0), allows fallback
function getProvider(bytes32 id) external view returns (address) {
    if (!providers[id].active) return address(0);
    if (!codeHashValid(id)) return address(0);
    return providers[id].providerAddress;
}
```

**Benefits**:
1. Caller decides whether to revert or use fallback
2. Prevents DOS if provider changes
3. Enables progressive failure handling
4. Allows alternative providers

### Governor Role Security

**Governor Capabilities**:
- Register new providers
- Deactivate providers
- Reactivate providers

**Risks**:
- Malicious governor could register malicious providers
- Governor could deactivate all providers (DOS)

**Mitigations**:
1. Use multisig for governor role
2. Transition to DAO governance
3. Monitor all governance actions
4. Time-lock governance changes
5. Have emergency pause mechanism

### Provider Registration Security

**Validation Checklist**:
- [ ] Provider address is not zero
- [ ] Provider is actually a contract
- [ ] Provider implements IAttestationProvider
- [ ] Provider has been audited
- [ ] Provider deployment is verified
- [ ] Code hash captured correctly

**Example Secure Registration**:
```solidity
// 1. Deploy provider
EASAttestationProviderV7 provider = new EASAttestationProviderV7();
provider.initialize(...);

// 2. Verify provider
require(provider.supportsInterface(type(IAttestationProvider).interfaceId));

// 3. Audit provider
// (Manual process)

// 4. Register provider
bytes32 id = keccak256("EAS_V1_AUDITED");
providerRegistry.registerProvider(
    id,
    address(provider),
    "EAS",
    "Audited EAS Provider V1"
);
```

## Usage Examples

### Basic Registration

```solidity
// Deploy registry
AttestationProviderRegistryV7_Immutable registry =
    new AttestationProviderRegistryV7_Immutable(governorAddress);

// Register EAS provider
bytes32 easId = keccak256("EAS_V1");
registry.registerProvider(
    easId,
    address(easProvider),
    "EAS",
    "Ethereum Attestation Service V1"
);

// Register VC provider
bytes32 vcId = keccak256("VC_V1");
registry.registerProvider(
    vcId,
    address(vcProvider),
    "VC",
    "Verifiable Credentials Provider V1"
);
```

### Provider Lookup with Fallback

```solidity
function verifyWithFallback(
    bytes32 primaryProviderId,
    bytes32 fallbackProviderId,
    bytes calldata proof,
    address user,
    bytes32 documentHash
) external returns (bool, uint256) {
    // Try primary provider
    address provider = providerRegistry.getProvider(primaryProviderId);

    if (provider == address(0)) {
        // Primary unavailable, try fallback
        provider = providerRegistry.getProvider(fallbackProviderId);

        if (provider == address(0)) {
            revert("No providers available");
        }

        emit FallbackProviderUsed(primaryProviderId, fallbackProviderId);
    }

    // Verify with available provider
    return IAttestationProvider(provider).verifyCapabilities(
        proof,
        user,
        documentHash,
        0
    );
}
```

### Emergency Deactivation

```solidity
// Security team discovers vulnerability
providerRegistry.deactivateProvider(
    compromisedProviderId,
    "CVE-2024-XXXX: Critical vulnerability in verification logic"
);

// All contracts using this provider will now get address(0)
// and should handle gracefully or revert
```

### Provider Discovery

```solidity
function listActiveProviders() external view returns (ProviderInfo[] memory) {
    uint256 count = providerRegistry.getProviderCount();
    ProviderInfo[] memory active = new ProviderInfo[](count);
    uint256 activeCount = 0;

    for (uint256 i = 0; i < count; i++) {
        bytes32 id = providerRegistry.getProviderIdAt(i);
        ProviderInfo memory info = providerRegistry.getProviderInfo(id);

        if (info.active) {
            active[activeCount] = info;
            activeCount++;
        }
    }

    // Trim array
    assembly {
        mstore(active, activeCount)
    }

    return active;
}
```

## Integration Guide

### Deployment

```solidity
// 1. Deploy registry
AttestationProviderRegistryV7_Immutable registry =
    new AttestationProviderRegistryV7_Immutable(governorAddress);

// 2. Verify deployment
require(
    keccak256(bytes(registry.getVersion())) == keccak256(bytes("7.0.0")),
    "Invalid version"
);

// 3. Grant governor role (if needed)
registry.grantRole(registry.GOVERNOR_ROLE(), additionalGovernor);

// 4. Save address
saveDeployment("AttestationProviderRegistry", address(registry));
```

### Integration in Access Control

```solidity
import "./AttestationProviderRegistryV7_Immutable.sol";

contract MyAccessControl {
    AttestationProviderRegistryV7_Immutable public immutable PROVIDER_REGISTRY;

    constructor(address _providerRegistry) {
        PROVIDER_REGISTRY = AttestationProviderRegistryV7_Immutable(_providerRegistry);
    }

    function verifyCapability(
        bytes32 providerId,
        bytes calldata proof,
        address user,
        bytes32 documentHash
    ) internal view returns (uint256) {
        address provider = PROVIDER_REGISTRY.getProvider(providerId);

        if (provider == address(0)) {
            revert ProviderNotAvailable(providerId);
        }

        (bool verified, uint256 caps) = IAttestationProvider(provider)
            .verifyCapabilities(proof, user, documentHash, 0);

        require(verified, "Verification failed");
        return caps;
    }
}
```

### Testing

```javascript
const Registry = await ethers.getContractFactory("AttestationProviderRegistryV7_Immutable");
const registry = await Registry.deploy(governor.address);

// Register provider
const providerId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TEST_PROVIDER"));
await registry.connect(governor).registerProvider(
    providerId,
    providerAddress,
    "TEST",
    "Test Provider"
);

// Verify registration
const provider = await registry.getProvider(providerId);
expect(provider).to.equal(providerAddress);

// Test code hash validation
// (Deploy new contract at same address - requires CREATE2)
// Provider should return address(0) after code change
```

## References

- [Foundation Overview](./overview.md)
- [EASAttestationProviderV7](./EASAttestationProviderV7.md)
