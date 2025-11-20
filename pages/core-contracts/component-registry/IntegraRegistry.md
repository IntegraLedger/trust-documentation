# IntegraRegistry_Immutable

## Overview

The **IntegraRegistry_Immutable** is Integra's unified infrastructure registry that manages all core components you'll interact with. This single contract provides addresses for:

- **Attestation Providers** (EAS and future providers)
- **ZK Proof Verifiers** (Groth16, PLONK, etc.)
- **Document Resolvers** (contact info, lifecycle hooks, compliance)
- **Token Implementations** (all available tokenizers)

### What You Need to Know

As a developer using Integra contracts, you'll query this registry to:
- **Look up component addresses** when you need to interact with providers, verifiers, or resolvers
- **Validate tokenizers** before using them with your documents
- **Discover available components** for your application

The registry is **immutable** (never upgrades), ensuring that component lookups work consistently forever.

## Registry Types

The registry organizes components into four categories:

```solidity
enum RegistryType {
    PROVIDER,    // Attestation providers (EAS, VC, ZK, DID)
    VERIFIER,    // ZK proof verifiers (Groth16, PLONK, Poseidon)
    RESOLVER,    // Document resolvers (lifecycle, compliance, custom)
    TOKENIZER    // Token implementations (ERC-721, ERC-1155, ERC-20)
}
```

### Available Component Types

#### PROVIDER Components
| Type | Description | Purpose |
|------|-------------|---------|
| EAS | Ethereum Attestation Service | On-chain attestations for permissions |
| VC | Verifiable Credentials | W3C-compliant credentials (future) |
| ZK | Zero-Knowledge Proofs | Privacy-preserving attestations (future) |

#### VERIFIER Components
| Type | Description | Purpose |
|------|-------------|---------|
| Groth16 | Groth16 ZK-SNARK verifier | General-purpose ZK proofs |
| PLONK | PLONK universal verifier | Universal ZK proof system |
| Poseidon | Poseidon hash verifier | Hash-based proof validation |

#### RESOLVER Components
| Type | Description | Purpose |
|------|-------------|---------|
| Communication | Contact endpoint storage | Store/retrieve contact info |
| Lifecycle | Document lifecycle management | Expiry, renewal, archival hooks |
| Compliance | Regulatory requirements | KYC/AML checks |
| Payment | Payment automation | Escrow, invoices |

#### TOKENIZER Components
| Type | Base ERC | Specific Standards | Purpose |
|------|----------|-------------------|---------|
| OWNERSHIP | ERC-721 | - | Real estate, copyrights |
| MULTIPARTY | ERC-1155 | ERC-7743 (Multi-Owner), ERC-8001 (Coordination) | Complex governance |
| MULTIPARTY_LITE | ERC-6909 | ERC-6909 (Minimal Multi-Token) | Gas-efficient multi-party |
| SHARES | ERC-20 | ERC-4626 (Tokenized Vaults) | Company equity |
| BADGE | ERC-1155 | ERC-4671 (Non-Tradable), ERC-5114 (Soulbound Badge) | Achievements |
| ROYALTY | ERC-1155 | ERC-2981 (NFT Royalty), ERC-4910 (Royalty Bearing) | Music, art royalties |
| RENTAL | ERC-1155 | ERC-4907 (Rental NFT), ERC-5187 (Rentable Rights) | Time-based access |
| SOULBOUND | ERC-721 | ERC-5192 (Minimal Soulbound), ERC-5484 (Consensual SBT) | Credentials |
| VAULT | ERC-721 | ERC-4626 (Tokenized Vaults) | Custody/escrow |
| SECURITY_TOKEN | ERC-20 | ERC-1462 (Base Security), ERC-3643 (T-REX) | Regulated securities |
| SEMI_FUNGIBLE | ERC-1155 | ERC-3525 (Semi-Fungible Token) | Mixed fungible/unique |

## How the Registry Works

When you query the registry for a component, it:

1. **Validates the component still exists and is active**
2. **Verifies the component's code hasn't changed** (security check)
3. **Returns the component address** (or `address(0)` if unavailable)

This ensures you only get addresses for verified, approved components.

## Key Functions

### getComponent

Retrieve a component's address by its identifier.

```solidity
function getComponent(bytes32 componentId) external view returns (address)
```

**Parameters**:
- `componentId`: Component identifier (e.g., `keccak256("EAS_V1")`)

**Returns**:
- Component address, or `address(0)` if component doesn't exist, is inactive, or has been compromised

**Example**:
```solidity
// Get the EAS attestation provider
bytes32 easId = keccak256("EAS_V1");
address easProvider = registry.getComponent(easId);

if (easProvider == address(0)) {
    revert("EAS provider not available");
}

// Use the provider
IAttestationProvider(easProvider).verifyCapabilities(...);
```

**Gas Cost**: ~5,000 gas

### getComponentInfo

Get detailed information about a component.

```solidity
function getComponentInfo(bytes32 componentId)
    external view returns (ComponentInfo memory)
```

**Returns**:
```solidity
struct ComponentInfo {
    address componentAddress;    // Component's deployed address
    RegistryType registryType;  // PROVIDER, VERIFIER, RESOLVER, or TOKENIZER
    bool active;                // Whether currently available
    uint256 registeredAt;       // Registration timestamp
    string description;         // Human-readable description
    string componentType;       // Specific type (e.g., "EAS", "Groth16")
}
```

**Example**:
```solidity
ComponentInfo memory info = registry.getComponentInfo(componentId);

console.log("Component:", info.description);
console.log("Type:", info.componentType);
console.log("Active:", info.active);
```

### isComponentApproved

Quick check if a component address is approved and active.

```solidity
function isComponentApproved(address component) external view returns (bool)
```

**Use Case**: Validate a tokenizer address before using it.

**Example**:
```solidity
if (!registry.isComponentApproved(tokenizerAddress)) {
    revert("Tokenizer not approved");
}
```

### Discovery Functions

Query available components by type:

```solidity
// Get total count
function getComponentCount() external view returns (uint256)

// Get count by type
function getComponentCountByType(RegistryType registryType)
    external view returns (uint256)

// Get all component IDs by type
function getComponentIdsByType(RegistryType registryType)
    external view returns (bytes32[] memory)

// Get paginated component IDs
function getComponentIdsPaginated(uint256 offset, uint256 limit)
    external view returns (bytes32[] memory)

// Get paginated component IDs by type
function getComponentIdsByTypePaginated(
    RegistryType registryType,
    uint256 offset,
    uint256 limit
) external view returns (bytes32[] memory)
```

**Example - Discover all tokenizers**:
```solidity
// Get all tokenizer IDs
bytes32[] memory tokenizerIds = registry.getComponentIdsByType(
    RegistryType.TOKENIZER
);

// Get details for each
for (uint256 i = 0; i < tokenizerIds.length; i++) {
    ComponentInfo memory info = registry.getComponentInfo(tokenizerIds[i]);
    console.log("Tokenizer:", info.description);
}
```

**Example - Paginated discovery**:
```solidity
// Get first 10 resolvers
bytes32[] memory resolverIds = registry.getComponentIdsByTypePaginated(
    RegistryType.RESOLVER,
    0,      // offset
    10      // limit
);
```

## Usage Patterns

### Pattern 1: Lookup Provider for Attestation

```solidity
// Get the EAS provider
bytes32 easId = keccak256("EAS_V1");
address provider = registry.getComponent(easId);

if (provider == address(0)) {
    revert("Provider not available");
}

// Verify user's attestation
IAttestationProvider(provider).verifyCapabilities(
    attestationProof,
    userAddress,
    documentHash,
    requiredCapability
);
```

### Pattern 2: Lookup Resolver for Document

```solidity
// Get contact resolver
bytes32 resolverId = keccak256("SimpleContactResolver");
address resolver = registry.getComponent(resolverId);

if (resolver == address(0)) {
    // Handle missing resolver gracefully
    return;
}

// Get contact information
bytes memory contactData = IDocumentResolver(resolver).resolve(integraHash);
```

### Pattern 3: Validate Tokenizer

```solidity
// Before using a tokenizer with your document
address tokenizer = 0x123...; // Tokenizer address

if (!registry.isComponentApproved(tokenizer)) {
    revert("Tokenizer not approved by governance");
}

// Safe to use tokenizer
documentRegistry.registerDocument(
    documentHash,
    referenceHash,
    tokenizer,  // Verified tokenizer
    ...
);
```

### Pattern 4: Discover Available Components

```solidity
// Find all available attestation providers
bytes32[] memory providerIds = registry.getComponentIdsByType(
    RegistryType.PROVIDER
);

// Show user options
for (uint256 i = 0; i < providerIds.length; i++) {
    ComponentInfo memory info = registry.getComponentInfo(providerIds[i]);

    if (info.active) {
        console.log("Available provider:", info.description);
    }
}
```

### Pattern 5: Fallback to Alternative Component

```solidity
function getProviderWithFallback(
    bytes32 primaryId,
    bytes32 fallbackId
) internal view returns (address) {
    // Try primary
    address provider = registry.getComponent(primaryId);

    if (provider != address(0)) {
        return provider;
    }

    // Try fallback
    provider = registry.getComponent(fallbackId);

    if (provider != address(0)) {
        emit UsingFallbackProvider(fallbackId);
        return provider;
    }

    revert("No providers available");
}
```

## Error Handling

The registry returns `address(0)` instead of reverting when a component is unavailable. This allows you to implement graceful degradation or fallback logic.

**Always check for `address(0)`**:
```solidity
address component = registry.getComponent(componentId);

if (component == address(0)) {
    // Component not found, inactive, or compromised
    // Implement your fallback logic here
    revert ComponentUnavailable(componentId);
}
```

## Security Considerations

### Code Hash Verification

The registry validates that component code hasn't changed since registration. If a component's code changes (due to upgrade, replacement, or compromise), `getComponent()` returns `address(0)`.

**What this means for you**:
- Components you get from the registry are verified
- If a component is compromised, it becomes unavailable
- Your application should handle `address(0)` gracefully

### Component Deactivation

Governance can temporarily deactivate components (for security issues, maintenance, etc.). Deactivated components return `address(0)` from `getComponent()`.

**Best practice**: Always have fallback logic for critical components.

## Common Component IDs

These are the standard component IDs used across Integra deployments:

```solidity
// Attestation Providers
bytes32 EAS_V1 = keccak256("EAS_V1");

// Document Resolvers
bytes32 CONTACT_RESOLVER = keccak256("SimpleContactResolver");

// Tokenizers
bytes32 OWNERSHIP_TOKENIZER = keccak256("OwnershipTokenizer");
bytes32 SHARES_TOKENIZER = keccak256("SharesTokenizer");
bytes32 MULTIPARTY_TOKENIZER = keccak256("MultiPartyTokenizer");
bytes32 ROYALTY_TOKENIZER = keccak256("RoyaltyTokenizer");
bytes32 RENTAL_TOKENIZER = keccak256("RentalTokenizer");
bytes32 BADGE_TOKENIZER = keccak256("BadgeTokenizer");
bytes32 SOULBOUND_TOKENIZER = keccak256("SoulboundTokenizer");
bytes32 VAULT_TOKENIZER = keccak256("VaultTokenizer");
bytes32 SECURITY_TOKEN_TOKENIZER = keccak256("SecurityTokenTokenizer");
bytes32 SEMIFUNGIBLE_TOKENIZER = keccak256("SemiFungibleTokenizer");
```

Check the latest component IDs in your deployment's configuration or by querying the registry directly.

## Integration Example

Here's a complete example of using the registry in your contract:

```solidity
import "./IntegraRegistry_Immutable.sol";

contract MyApplication {
    IntegraRegistry_Immutable public immutable registry;

    constructor(address _registry) {
        registry = IntegraRegistry_Immutable(_registry);
    }

    function processDocument(
        bytes32 documentHash,
        bytes32 attestationUID
    ) external {
        // 1. Get EAS provider from registry
        bytes32 easId = keccak256("EAS_V1");
        address provider = registry.getComponent(easId);

        require(provider != address(0), "EAS provider unavailable");

        // 2. Verify user's permissions via provider
        (bool verified, uint256 caps) = IAttestationProvider(provider)
            .verifyCapabilities(
                abi.encode(attestationUID),
                msg.sender,
                documentHash,
                REQUIRED_CAPABILITY
            );

        require(verified, "User not authorized");

        // 3. Proceed with document processing
        _processDocument(documentHash, caps);
    }

    function getAvailableTokenizers()
        external
        view
        returns (bytes32[] memory)
    {
        // Return all registered tokenizer IDs
        return registry.getComponentIdsByType(
            IntegraRegistry_Immutable.RegistryType.TOKENIZER
        );
    }
}
```

## References

- [Foundation Overview](./overview.md) - Architecture overview
- [EASAttestationProvider](./EASAttestationProvider.md) - EAS provider details
- [Document Registry](./document-registration/document-registry.md) - How documents use components
