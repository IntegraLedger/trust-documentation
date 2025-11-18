# IntegraResolverRegistryV7_Immutable

## Overview

The IntegraResolverRegistryV7_Immutable contract is an immutable registry for document resolver contracts with comprehensive code integrity verification. It enables service composition for documents while preventing malicious resolver upgrades through code hash validation.

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

### Code Integrity Verification

The registry captures and validates code hashes to prevent resolver replacement attacks:

1. **At Registration**: Captures `extcodehash` of resolver contract
2. **At Retrieval**: Validates current code hash matches registration
3. **On Mismatch**: Returns `address(0)` for graceful degradation
4. **Security**: Prevents malicious resolver code changes

### Active/Inactive Status

Resolvers can be temporarily deactivated without removal:

- **Deactivation**: Governance can disable a resolver
- **Reactivation**: Governance can re-enable (with code hash validation)
- **Use Cases**: Bug fixes, maintenance, security concerns

### Resolver Metadata

Each resolver includes descriptive metadata:

- **Description**: Human-readable description
- **Resolver Type**: Category (Lifecycle, Communication, Compliance, etc.)
- **Registered At**: Timestamp for audit trail

## Key Features

### 1. Resolver Registration

Register a new resolver contract with code integrity tracking.

```solidity
function registerResolver(
    bytes32 resolverId,
    address resolver,
    string calldata resolverType,
    string calldata description
) external onlyRole(GOVERNOR_ROLE)
```

**Parameters**:
- `resolverId`: Unique identifier (e.g., `keccak256("SimpleContactResolverV7")`)
- `resolver`: Contract address of resolver
- `resolverType`: Type of resolver (see Resolver Types below)
- `description`: Human-readable description

**Security**:
- Verifies resolver is a contract (not EOA)
- Stores code hash for future validation
- Prevents duplicate registration
- Emits event with code hash for transparency

**Example**:
```solidity
bytes32 resolverId = keccak256("SimpleContactResolverV7");

resolverRegistry.registerResolver(
    resolverId,
    contactResolverAddress,
    "Communication",
    "Simple Contact Resolver V7 - Encrypted URL storage"
);
```

### 2. Get Resolver Address

Retrieve resolver address with code integrity verification.

```solidity
function getResolver(bytes32 resolverId) external view returns (address)
```

**Returns**: Resolver address, or `address(0)` if:
- Resolver doesn't exist
- Resolver is inactive
- Code hash has changed (security violation)

**Security Validation**:
1. Checks resolver exists
2. Checks resolver is active
3. Validates code hash matches registration
4. Returns `address(0)` if any check fails

**Why address(0) Instead of Revert**:
- Allows graceful degradation in calling contracts
- Caller can decide whether to revert or use fallback
- Prevents DOS if resolver code changes
- Enables progressive failure handling

**Usage in Calling Contracts**:
```solidity
address resolver = resolverRegistry.getResolver(resolverId);
if (resolver == address(0)) {
    // Handle missing resolver
    emit ResolverUnavailable(resolverId);
    return; // Graceful degradation
}
// Use resolver...
```

### 3. Get Resolver Info

Retrieve full resolver information without integrity check.

```solidity
function getResolverInfo(bytes32 resolverId) external view returns (ResolverInfo memory)
```

**Returns**: `ResolverInfo` struct containing:
- `resolverAddress`: Address of resolver contract
- `codeHash`: Code hash at registration
- `active`: Current active status
- `registeredAt`: Registration timestamp
- `description`: Human-readable description
- `resolverType`: Resolver type category

**Use Cases**:
- Off-chain indexing
- Dashboard display
- Metadata queries
- Audit trail examination

**Example**:
```solidity
ResolverInfo memory info = resolverRegistry.getResolverInfo(resolverId);

console.log("Resolver Type:", info.resolverType);
console.log("Description:", info.description);
console.log("Active:", info.active);
console.log("Registered:", info.registeredAt);
```

### 4. Deactivate Resolver

Temporarily disable a resolver without removing it.

```solidity
function deactivateResolver(bytes32 resolverId) external onlyRole(GOVERNOR_ROLE)
```

**Access**: Governance only

**Use Cases**:
- Resolver bug discovered
- Resolver being upgraded
- Temporary security concern
- Service maintenance

**Effect**:
- `getResolver()` returns `address(0)`
- Documents using this resolver gracefully degrade
- Resolver can be reactivated later

**Example**:
```solidity
// Bug discovered in contact resolver
resolverRegistry.deactivateResolver(contactResolverId);

// Deploy and test new version
// ...

// Reactivate after fix
resolverRegistry.reactivateResolver(contactResolverId);
```

### 5. Reactivate Resolver

Re-enable a previously deactivated resolver.

```solidity
function reactivateResolver(bytes32 resolverId) external onlyRole(GOVERNOR_ROLE)
```

**Access**: Governance only

**Security**: Verifies code hasn't changed before reactivating. This prevents reactivating a compromised resolver.

**Validation**:
- Checks resolver exists
- Validates current code hash matches registration
- Reverts if code has changed

**Example**:
```solidity
// This will succeed if code hash matches
resolverRegistry.reactivateResolver(contactResolverId);

// This will revert if resolver was replaced
try resolverRegistry.reactivateResolver(contactResolverId) {
    console.log("Reactivated successfully");
} catch {
    console.log("Code hash mismatch - resolver may be compromised");
}
```

### 6. Update Resolver Metadata

Update resolver description and type without affecting address or code hash.

```solidity
function updateResolverMetadata(
    bytes32 resolverId,
    string calldata newDescription,
    string calldata newResolverType
) external onlyRole(GOVERNOR_ROLE)
```

**Access**: Governance only

**Restrictions**:
- Description cannot be empty
- Resolver type cannot be empty

**Use Cases**:
- Clarify resolver purpose
- Update documentation
- Recategorize resolver type

**Example**:
```solidity
resolverRegistry.updateResolverMetadata(
    contactResolverId,
    "Enhanced Contact Resolver V7 - Supports email, phone, URL",
    "Communication"
);
```

### 7. Enumeration Functions

Query registered resolvers for off-chain indexing and exploration.

#### Get Total Resolver Count

```solidity
function getResolverCount() external view returns (uint256)
```

Returns the total number of registered resolvers.

#### Get Resolver ID at Index

```solidity
function getResolverIdAt(uint256 index) external view returns (bytes32)
```

Returns the resolver ID at a specific index.

#### Get All Resolver IDs

```solidity
function getAllResolverIds() external view returns (bytes32[] memory)
```

Returns all resolver IDs. **Warning**: Can be gas-intensive for large registries.

#### Get Paginated Resolver IDs

```solidity
function getResolverIdsPaginated(uint256 offset, uint256 limit)
    external view returns (bytes32[] memory)
```

Returns a paginated list of resolver IDs for efficient querying.

**Example**:
```solidity
// Get first 20 resolvers
bytes32[] memory firstPage = resolverRegistry.getResolverIdsPaginated(0, 20);

// Get next 20 resolvers
bytes32[] memory secondPage = resolverRegistry.getResolverIdsPaginated(20, 20);
```

## ResolverInfo Structure

```solidity
struct ResolverInfo {
    address resolverAddress;    // Address of resolver contract
    bytes32 codeHash;          // Code hash at registration (integrity check)
    bool active;               // Can be deactivated without removal
    uint256 registeredAt;      // Registration timestamp
    string description;        // Human-readable description
    string resolverType;       // Resolver type (e.g., "Lifecycle", "Communication")
}
```

## Resolver Types

Standard resolver type categories (documentation standard, not enforced):

### Lifecycle
Manages document lifecycle events:
- Document expiry
- Renewal logic
- Archival processes
- Version management

**Example**: `LeaseExpiryResolverV7`

### Communication
Provides contact endpoints:
- Email addresses
- Phone numbers
- URL endpoints
- Encrypted contact data

**Example**: `SimpleContactResolverV7`

### Compliance
Enforces regulatory requirements:
- KYC/AML checks
- Jurisdiction validation
- Accreditation verification
- Transfer restrictions

**Example**: `KYCComplianceResolverV7`

### Payment
Handles payment automation:
- Payment requests
- Escrow management
- Invoice generation
- Subscription billing

**Example**: `EscrowPaymentResolverV7`

### Governance
Enables DAO control:
- Proposal voting
- Multi-sig requirements
- Time-lock delays
- Role-based permissions

**Example**: `DAOGovernanceResolverV7`

### Multi-Purpose
Combines multiple resolver types:
- Lifecycle + Compliance
- Communication + Payment
- Governance + Compliance

**Example**: `EnterpriseResolverV7`

### Custom Types

Resolver types are flexible strings - custom types are allowed for future use cases.

## Events

### ResolverRegistered

```solidity
event ResolverRegistered(
    bytes32 indexed resolverId,
    address indexed resolver,
    bytes32 codeHash,
    string resolverType,
    string description,
    uint256 timestamp
)
```

Emitted when a new resolver is registered.

**Usage**:
- Index resolver deployments
- Audit trail for governance actions
- Monitor new resolver availability

### ResolverDeactivated

```solidity
event ResolverDeactivated(
    bytes32 indexed resolverId,
    address indexed resolver,
    uint256 timestamp
)
```

Emitted when a resolver is deactivated.

### ResolverReactivated

```solidity
event ResolverReactivated(
    bytes32 indexed resolverId,
    address indexed resolver,
    uint256 timestamp
)
```

Emitted when a resolver is reactivated.

### ResolverMetadataUpdated

```solidity
event ResolverMetadataUpdated(
    bytes32 indexed resolverId,
    string newDescription,
    string newResolverType,
    uint256 timestamp
)
```

Emitted when resolver metadata is updated.

## Errors

### ZeroAddress

```solidity
error ZeroAddress()
```

Thrown when resolver address is zero address.

### ResolverNotFound

```solidity
error ResolverNotFound(bytes32 resolverId)
```

Thrown when a resolver with the given ID does not exist.

### NotAContract

```solidity
error NotAContract(address resolver)
```

Thrown when the provided address is not a contract (EOA or non-existent).

### ResolverCodeChanged

```solidity
error ResolverCodeChanged(
    bytes32 resolverId,
    bytes32 expectedHash,
    bytes32 currentHash
)
```

Thrown when resolver code has changed since registration (security violation).

### ResolverInactive

```solidity
error ResolverInactive(bytes32 resolverId)
```

Thrown when attempting to use an inactive resolver.

### ResolverAlreadyRegistered

```solidity
error ResolverAlreadyRegistered(
    bytes32 resolverId,
    address existingResolver
)
```

Thrown when attempting to register a resolver ID that already exists.

### EmptyDescription

```solidity
error EmptyDescription()
```

Thrown when attempting to update metadata with an empty description.

### EmptyResolverType

```solidity
error EmptyResolverType()
```

Thrown when attempting to update metadata with an empty resolver type.

## Security Considerations

### Code Hash Verification

The core security feature of this registry:

```solidity
// At registration
bytes32 codeHash;
assembly {
    codeHash := extcodehash(resolver)
}
resolvers[resolverId].codeHash = codeHash;

// At retrieval
bytes32 currentHash;
assembly {
    currentHash := extcodehash(resolverAddr)
}
if (currentHash != info.codeHash) {
    return address(0); // Code changed - resolver may be compromised
}
```

**Protection Against**:
- Malicious resolver upgrades
- Proxy contract replacement
- Selfdestruct + redeploy attacks

**Limitations**:
- Doesn't prevent initial registration of malicious code (governance responsibility)
- Doesn't validate resolver logic (auditing required)
- Code hash changes trigger graceful degradation, not alerts

### Immutability

The registry is immutable and cannot be upgraded:

**Benefits**:
- No governance attacks on registry itself
- Permanent resolver reference infrastructure
- Predictable behavior

**Considerations**:
- Resolver addresses are permanent once registered
- Bugs handled via deactivation, not registry upgrade
- New resolvers must be deployed with new IDs

### Governance Control

All state-changing functions require `GOVERNOR_ROLE`:

**Actions Requiring Governance**:
- Register resolver
- Deactivate resolver
- Reactivate resolver
- Update resolver metadata

**Best Practices**:
- Use multisig for governor (Gnosis Safe recommended)
- Audit resolvers before registration
- Document governance decisions
- Monitor governance events

## Integration Guide

### Basic Integration

```solidity
import "@integra/contracts/layer2/IntegraResolverRegistryV7_Immutable.sol";

contract MyContract {
    IntegraResolverRegistryV7_Immutable public resolverRegistry;

    constructor(address _resolverRegistry) {
        resolverRegistry = IntegraResolverRegistryV7_Immutable(_resolverRegistry);
    }

    function useResolver(bytes32 resolverId, bytes32 integraHash) external {
        // Get resolver with code integrity check
        address resolver = resolverRegistry.getResolver(resolverId);

        // Handle missing/inactive/compromised resolver
        if (resolver == address(0)) {
            emit ResolverUnavailable(resolverId);
            return; // Graceful degradation
        }

        // Use resolver
        IDocumentResolver(resolver).getContactEndpoint(
            integraHash,
            msg.sender,
            "url"
        );
    }
}
```

### Listening to Events

```typescript
const resolverRegistry = new ethers.Contract(
    resolverRegistryAddress,
    resolverRegistryABI,
    provider
);

// Listen for new resolver registrations
resolverRegistry.on("ResolverRegistered", (
    resolverId,
    resolver,
    codeHash,
    resolverType,
    description,
    timestamp,
    event
) => {
    console.log("New resolver registered:", {
        resolverId: resolverId,
        type: resolverType,
        description: description,
        address: resolver
    });
});

// Listen for resolver deactivations
resolverRegistry.on("ResolverDeactivated", (
    resolverId,
    resolver,
    timestamp,
    event
) => {
    console.log("Resolver deactivated:", resolverId);
    // Update off-chain cache, notify users, etc.
});
```

### Querying Resolvers

```typescript
// Get resolver address
const resolverAddress = await resolverRegistry.getResolver(resolverId);

if (resolverAddress === ethers.constants.AddressZero) {
    console.log("Resolver unavailable (inactive, not found, or code changed)");
} else {
    console.log("Resolver available at:", resolverAddress);
}

// Get full resolver info
const resolverInfo = await resolverRegistry.getResolverInfo(resolverId);

console.log("Resolver Info:", {
    address: resolverInfo.resolverAddress,
    type: resolverInfo.resolverType,
    description: resolverInfo.description,
    active: resolverInfo.active,
    registeredAt: new Date(resolverInfo.registeredAt * 1000)
});

// List all resolvers
const count = await resolverRegistry.getResolverCount();
for (let i = 0; i < count; i++) {
    const resolverId = await resolverRegistry.getResolverIdAt(i);
    const info = await resolverRegistry.getResolverInfo(resolverId);
    console.log(`[${i}] ${info.resolverType}: ${info.description}`);
}
```

### Resolver Discovery

```typescript
// Paginated resolver listing for explorers/dashboards
async function listResolvers(page = 0, pageSize = 20) {
    const offset = page * pageSize;
    const resolverIds = await resolverRegistry.getResolverIdsPaginated(
        offset,
        pageSize
    );

    const resolvers = await Promise.all(
        resolverIds.map(async (id) => {
            const info = await resolverRegistry.getResolverInfo(id);
            return {
                id,
                ...info
            };
        })
    );

    return resolvers;
}

// Get all communication resolvers
async function getCommunicationResolvers() {
    const allIds = await resolverRegistry.getAllResolverIds();

    const communicationResolvers = [];
    for (const id of allIds) {
        const info = await resolverRegistry.getResolverInfo(id);
        if (info.resolverType === "Communication" && info.active) {
            communicationResolvers.push({ id, ...info });
        }
    }

    return communicationResolvers;
}
```

## Best Practices

### For Governance

1. **Audit Before Registration**
   - Review resolver source code
   - Verify resolver follows IDocumentResolver interface
   - Check for security vulnerabilities
   - Test on testnet first

2. **Naming Conventions**
   - Use descriptive resolver IDs
   - Include version in ID: `keccak256("SimpleContactResolverV7")`
   - Document resolver purpose clearly

3. **Metadata Quality**
   - Provide clear, concise descriptions
   - Categorize resolvers accurately
   - Update metadata when resolver purpose evolves

4. **Deactivation Strategy**
   - Deactivate immediately if security issue found
   - Communicate deactivation to users
   - Document reason for deactivation
   - Test thoroughly before reactivation

### For Developers

1. **Graceful Degradation**
   ```solidity
   address resolver = resolverRegistry.getResolver(resolverId);
   if (resolver == address(0)) {
       // Handle missing resolver gracefully
       emit ResolverUnavailable(resolverId);
       return; // Don't revert, use fallback
   }
   ```

2. **Cache with Caution**
   - Monitor deactivation events
   - Invalidate cache on deactivation
   - Consider code hash changes

3. **Error Handling**
   - Always check for `address(0)`
   - Implement fallback behavior
   - Log resolver failures

### For Resolver Developers

1. **Interface Compliance**
   - Implement all IDocumentResolver methods
   - Return appropriate values for unsupported features
   - Document supported features clearly

2. **Immutability Consideration**
   - Use UUPS proxy pattern for upgradeability
   - Test upgrades thoroughly
   - Consider code hash implications

3. **Gas Efficiency**
   - Keep resolver logic lightweight
   - Optimize for common cases
   - Document gas consumption

## Testing

### Unit Tests

```solidity
contract ResolverRegistryTest is Test {
    IntegraResolverRegistryV7_Immutable registry;
    address mockResolver;

    function setUp() public {
        registry = new IntegraResolverRegistryV7_Immutable(governor);

        // Deploy mock resolver
        mockResolver = address(new MockResolver());
    }

    function testRegisterResolver() public {
        bytes32 resolverId = keccak256("TestResolver");

        vm.prank(governor);
        registry.registerResolver(
            resolverId,
            mockResolver,
            "Communication",
            "Test Resolver"
        );

        address retrieved = registry.getResolver(resolverId);
        assertEq(retrieved, mockResolver);
    }

    function testCodeHashValidation() public {
        bytes32 resolverId = keccak256("TestResolver");

        vm.prank(governor);
        registry.registerResolver(
            resolverId,
            mockResolver,
            "Communication",
            "Test Resolver"
        );

        // Simulate code change by deploying different contract at same address
        // (This is not possible in practice, but demonstrates the check)

        // Verify getResolver returns address(0) if code changed
        // (In real test, would need to test with proxy pattern)
    }

    function testDeactivateReactivate() public {
        bytes32 resolverId = keccak256("TestResolver");

        vm.prank(governor);
        registry.registerResolver(
            resolverId,
            mockResolver,
            "Communication",
            "Test Resolver"
        );

        // Deactivate
        vm.prank(governor);
        registry.deactivateResolver(resolverId);
        assertEq(registry.getResolver(resolverId), address(0));

        // Reactivate
        vm.prank(governor);
        registry.reactivateResolver(resolverId);
        assertEq(registry.getResolver(resolverId), mockResolver);
    }
}
```

### Integration Tests

Test resolver registry with document registry and actual resolver contracts.

## Formal Verification

The contract should undergo formal verification to prove:

1. **Code Hash Immutability**: Registered code hash never changes
2. **Deactivation Logic**: Deactivated resolvers always return address(0)
3. **Reactivation Safety**: Reactivation fails if code hash changed
4. **Registration Uniqueness**: Resolver IDs are unique

## Deployment

### Constructor Parameters

```solidity
constructor(address _governor)
```

**Parameters**:
- `_governor`: Address that will have GOVERNOR_ROLE

### Deployment Script

```solidity
// Deploy resolver registry
IntegraResolverRegistryV7_Immutable resolverRegistry =
    new IntegraResolverRegistryV7_Immutable(governorAddress);

// Verify on block explorer
// ...

// Register initial resolvers
bytes32 contactResolverId = keccak256("SimpleContactResolverV7");
resolverRegistry.registerResolver(
    contactResolverId,
    contactResolverAddress,
    "Communication",
    "Simple Contact Resolver V7 - Encrypted URL storage"
);
```

### Post-Deployment

1. Verify contract on block explorer
2. Register initial resolvers
3. Configure monitoring and alerting
4. Document deployment addresses
5. Grant additional governance roles if using multisig

## Resources

- [Source Code](https://github.com/IntegraLedger/smart-contracts-evm-v7/blob/main/src/layer2/IntegraResolverRegistryV7_Immutable.sol)
- [Document Registry Documentation](./document-registry)
- [IDocumentResolver Interface](./interfaces/document-resolver)
- [Resolver Development Guide](../guides/resolver-development)

## Support

- **Security Issues**: security@integra.io
- **Technical Support**: docs@integra.io
- **GitHub**: https://github.com/IntegraLedger/smart-contracts-evm-v7
