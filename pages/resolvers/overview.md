# Resolver Composition: Extending Real World Contracts

## Overview

The Resolver Pattern is Integra's powerful extensibility system that lets you attach custom services to documents without modifying core contracts, enabling unlimited functionality while keeping the document registry immutable and secure. This architecture separates document identity from document services, allowing the core registry to remain simple and unchangeable while resolvers provide sophisticated features like workflow automation, compliance enforcement, and custom business logic. Developers can create new resolvers at any time and attach them to documents through a simple registration process, building a rich ecosystem of interoperable services.

Resolvers transform static documents into programmable, service-rich contracts that can automate workflows such as expiry notifications and renewal reminders, store encrypted metadata including contact information and compliance records, enforce complex rules like geographic restrictions and accreditation requirements, trigger actions including payments and external system integrations, and extend functionality through unlimited custom business logic. The system supports both primary resolvers that must succeed for critical operations and additional resolvers that provide optional best-effort services. Each resolver implements lifecycle hooks that execute at key moments including document registration, ownership transfers, and tokenizer association, creating powerful automation without requiring any changes to the immutable core document registry.

<div style="display: flex; justify-content: center; margin: 2rem 0;">
  <img src="/diagrams/resolvers-1.png" alt="How Resolvers Work" style="width: 90%; height: auto;" />
</div>

## How Resolvers Work

### Document-Resolver Binding

When you register a document, you can attach resolvers:

```solidity
bytes32 integraHash = documentRegistry.registerDocument(
    documentHash,
    referenceHash,
    tokenizer,
    executor,
    processHash,
    identityExtension,
    contactResolverId,      // Primary resolver
    [lifecycleResolverId, complianceResolverId]  // Additional resolvers
);
```

**What happens:**
1. Document gets permanent `integraHash` identity
2. Resolvers are registered with the document
3. Registry calls resolver hooks at lifecycle events
4. Resolvers can store data, trigger logic, enforce rules

### Resolver Lifecycle Hooks

Resolvers implement the `IDocumentResolver` interface with hooks called at key moments:

```solidity
interface IDocumentResolver {
    // Called when document first registered
    function onDocumentRegistered(
        bytes32 integraHash,
        bytes32 documentHash,
        address owner,
        bytes calldata metadata
    ) external;

    // Called when ownership transfers
    function onOwnershipTransferred(
        bytes32 integraHash,
        address oldOwner,
        address newOwner,
        string calldata reason
    ) external;

    // Called when tokenizer changes
    function onTokenizerAssociated(
        bytes32 integraHash,
        address tokenizer,
        address owner
    ) external;

    // Called on custom updates
    function onDocumentUpdated(
        bytes32 integraHash,
        bytes calldata updateData
    ) external;
}
```

## Primary vs Additional Resolvers

### Primary Resolver (Critical Services)

**Characteristics:**
- ONE per document
- Called FIRST
- Must SUCCEED (transaction reverts if fails)
- Higher gas limit (200k default)

**Use cases:**
- Compliance checks that must pass
- Required data storage
- Critical validation logic

**Example:**
```solidity
// Compliance resolver as primary
bytes32 integraHash = documentRegistry.registerDocument(
    ...,
    complianceResolverId,  // MUST succeed
    []
);

// If compliance check fails → entire registration reverts
```

### Additional Resolvers (Optional Services)

**Characteristics:**
- UP TO 10 per document
- Called AFTER primary
- Best-effort (failure logged, doesn't revert)
- Lower gas limit (100k default)

**Use cases:**
- Analytics/tracking
- Notifications
- Optional metadata
- Non-critical automation

**Example:**
```solidity
bytes32 integraHash = documentRegistry.registerDocument(
    ...,
    primaryResolverId,
    [analyticsResolver, notificationResolver, archiveResolver]
);

// If notification fails → operation still succeeds, failure logged
```

## Real-World Use Cases

### Use Case 1: Property Rental with Automation

```solidity
// Register rental agreement with multiple resolvers
bytes32 rentalHash = documentRegistry.registerDocument(
    leaseAgreementHash,
    ipfsCID,
    address(rentalTokenizer),
    address(0),
    processHash,
    bytes32(0),
    contactResolverId,           // Primary: Contact storage
    [
        lifecycleResolverId,     // Track lease expiry
        paymentResolverId,       // Automate rent requests
        complianceResolverId     // Log regulatory data
    ]
);
```

**What each resolver does:**

**Contact Resolver (Primary):**
```solidity
onDocumentRegistered() → Store landlord contact info
onOwnershipTransferred() → Update to new landlord contact
```

**Lifecycle Resolver (Additional):**
```solidity
onDocumentRegistered() → Set lease end date (12 months)
// Off-chain service monitors:
//   - 30 days before expiry → send renewal reminder
//   - On expiry → mark lease as expired
```

**Payment Resolver (Additional):**
```solidity
onDocumentRegistered() → Create monthly payment schedule
// Automatically:
//   - Generate monthly rent invoices
//   - Send payment signals to tenant
//   - Track payment history
```

**Compliance Resolver (Additional):**
```solidity
onDocumentRegistered() → Log KYC check timestamp
onOwnershipTransferred() → Verify new owner accreditation
```

### Use Case 2: Security Token with Compliance

```solidity
// Register security token with compliance enforcement
bytes32 tokenHash = documentRegistry.registerDocument(
    offeringMemorandumHash,
    ipfsCID,
    address(securityTokenTokenizer),
    address(0),
    processHash,
    bytes32(0),
    accreditationResolverId,     // Primary: Must verify accredited
    [
        jurisdictionResolverId,   // Check jurisdiction compliance
        transferRestrictionsId    // Enforce transfer limits
    ]
);
```

**Accreditation Resolver (Primary):**
```solidity
onDocumentRegistered() {
    // MUST verify owner is accredited investor
    require(isAccredited(owner), "Not accredited");
    // If fails → registration reverts
}

onOwnershipTransferred() {
    // MUST verify new owner is accredited
    require(isAccredited(newOwner), "New owner not accredited");
    // If fails → transfer reverts
}
```

### Use Case 3: Intellectual Property with Royalties

```solidity
// Register music copyright with royalty automation
bytes32 copyrightHash = documentRegistry.registerDocument(
    musicCopyrightHash,
    ipfsCID,
    address(royaltyTokenizer),
    address(0),
    processHash,
    bytes32(0),
    royaltyDistributionResolverId,  // Primary: Track distributions
    [
        usageTrackingResolverId,     // Monitor streaming plays
        paymentSplitResolverId       // Calculate splits
    ]
);
```

## Creating Custom Resolvers

### Basic Resolver Template

```solidity
import "../registry/interfaces/IDocumentResolver.sol";

contract MyCustomResolver is IDocumentResolver {
    // Your custom storage
    mapping(bytes32 => CustomData) private data;

    function onDocumentRegistered(
        bytes32 integraHash,
        bytes32 documentHash,
        address owner,
        bytes calldata metadata
    ) external override {
        // Your custom logic on registration
        data[integraHash] = decodeAndStore(metadata);
        emit CustomDataStored(integraHash, owner);
    }

    function onOwnershipTransferred(
        bytes32 integraHash,
        address oldOwner,
        address newOwner,
        string calldata reason
    ) external override {
        // Your custom logic on transfer
        data[integraHash].owner = newOwner;
        emit OwnershipUpdated(integraHash, oldOwner, newOwner);
    }

    function onTokenizerAssociated(
        bytes32 integraHash,
        address tokenizer,
        address owner
    ) external override {
        // Your custom logic on tokenizer change
    }

    function onDocumentUpdated(
        bytes32 integraHash,
        bytes calldata updateData
    ) external override {
        // Your custom logic on updates
    }

    // Add custom query functions
    function getCustomData(bytes32 integraHash)
        external view returns (CustomData memory)
    {
        return data[integraHash];
    }
}
```

### Advanced: Compliance Resolver

```solidity
contract AccreditationResolver is IDocumentResolver {
    mapping(bytes32 => bool) private verified;
    mapping(address => bool) private accreditedInvestors;

    // Only allow accredited investors
    function onDocumentRegistered(
        bytes32 integraHash,
        bytes32,
        address owner,
        bytes calldata
    ) external override {
        require(
            accreditedInvestors[owner],
            "Owner must be accredited investor"
        );

        verified[integraHash] = true;
        emit DocumentVerified(integraHash, owner);
    }

    // Block transfers to non-accredited users
    function onOwnershipTransferred(
        bytes32 integraHash,
        address,
        address newOwner,
        string calldata
    ) external override {
        require(
            accreditedInvestors[newOwner],
            "New owner must be accredited"
        );

        emit TransferVerified(integraHash, newOwner);
    }

    // Governance function to verify investors
    function addAccreditedInvestor(address investor)
        external onlyRole(GOVERNOR_ROLE)
    {
        accreditedInvestors[investor] = true;
    }
}
```

## Resolver Capabilities

### What Resolvers Can Do

1. **Store Data**
   ```solidity
   // Store document-specific metadata
   mapping(bytes32 => DocumentMetadata) private metadata;
   ```

2. **Enforce Rules**
   ```solidity
   // Revert if conditions not met
   require(meetsRequirements(owner), "Requirements not met");
   ```

3. **Emit Events**
   ```solidity
   // Trigger off-chain systems
   emit DocumentProcessed(integraHash, timestamp);
   ```

4. **Call External Contracts**
   ```solidity
   // Integrate with other systems
   externalOracle.recordEvent(integraHash);
   ```

5. **Query Document Registry**
   ```solidity
   // Access document info
   address owner = documentRegistry.getDocumentOwner(integraHash);
   ```

### What Resolvers CANNOT Do

- ❌ Modify document hash (immutable)
- ❌ Change document owner (only registry can)
- ❌ Access other documents' data (isolated)
- ❌ Exceed gas limits (enforced by registry)

## Extensibility Patterns

### Pattern 1: Modular Services

Build a library of resolvers, mix and match per document:

```solidity
// Standard resolvers available:
bytes32 CONTACT_RESOLVER = keccak256("ContactResolver");
bytes32 LIFECYCLE_RESOLVER = keccak256("LifecycleResolver");
bytes32 COMPLIANCE_RESOLVER = keccak256("ComplianceResolver");
bytes32 PAYMENT_RESOLVER = keccak256("PaymentResolver");

// Real estate document
documentRegistry.registerDocument(
    ...,
    CONTACT_RESOLVER,
    [LIFECYCLE_RESOLVER, PAYMENT_RESOLVER]
);

// Security token document
documentRegistry.registerDocument(
    ...,
    COMPLIANCE_RESOLVER,
    [LIFECYCLE_RESOLVER]
);
```

### Pattern 2: Progressive Enhancement

Start minimal, add services over time:

```solidity
// Day 1: Register with just contact info
documentRegistry.registerDocument(..., CONTACT_RESOLVER, []);

// Day 30: Add lifecycle tracking
documentRegistry.addAdditionalResolver(integraHash, LIFECYCLE_RESOLVER);

// Day 60: Add payment automation
documentRegistry.addAdditionalResolver(integraHash, PAYMENT_RESOLVER);

// Day 90: Lock configuration (no more changes)
documentRegistry.lockResolvers(integraHash);
```

### Pattern 3: Custom Business Logic

Create resolvers for your specific needs:

```solidity
// Geographic restriction resolver
contract GeographicResolver is IDocumentResolver {
    mapping(bytes32 => string[]) private allowedCountries;

    function onOwnershipTransferred(...) external override {
        string memory country = getUserCountry(newOwner);
        string[] memory allowed = allowedCountries[integraHash];

        require(isAllowed(country, allowed), "Country not allowed");
    }
}

// Environmental compliance resolver
contract CarbonOffsetResolver is IDocumentResolver {
    function onDocumentRegistered(...) external override {
        // Require carbon offset purchase
        require(hasCarbonOffset(owner), "Offset required");
    }
}
```

## Advanced Features

### Resolver Locking

Make resolver configuration permanent:

```solidity
// Owner locks resolvers (can't be changed)
documentRegistry.lockResolvers(integraHash);

// Future attempts to change resolvers will revert
documentRegistry.setPrimaryResolver(integraHash, newId);
// ❌ Reverts: ResolverConfigurationLocked
```

**Use cases:**
- Finalized documents (no more changes)
- Regulatory requirements (config must be immutable)
- Trust signal (resolver config can't be manipulated)

### Gas Limit Protection

Resolvers have configurable gas limits to prevent DOS:

```solidity
// Default limits
- Primary resolver: 200,000 gas
- Additional resolvers: 100,000 gas each

// Custom limits per resolver
documentRegistry.setResolverGasLimitOverride(
    expensiveResolverId,
    500_000  // Higher limit for complex logic
);
```

**Protection:**
- Prevents malicious/buggy resolvers from consuming all gas
- Ensures predictable transaction costs
- Allows per-resolver optimization

### Graceful Degradation

If a resolver becomes unavailable (deactivated or code changed):

```solidity
// Registry queries component registry
address resolver = integraRegistry.getComponent(resolverId);

if (resolver == address(0)) {
    // Primary: Log and continue (graceful)
    emit PrimaryResolverUnavailable(integraHash, resolverId);
    return true;
}

// Additional: Skip silently
```

**Benefits:**
- Documents don't break if resolver has issues
- Operations continue with degraded functionality
- Time to fix resolver without blocking users

## Real-World Resolver Examples

### 1. Automated Renewal Resolver

```solidity
contract RenewalResolver is IDocumentResolver {
    struct RenewalConfig {
        uint256 expiryDate;
        uint256 renewalPeriod;
        uint256 renewalFee;
        bool autoRenew;
    }

    mapping(bytes32 => RenewalConfig) private configs;

    function onDocumentRegistered(
        bytes32 integraHash,
        bytes32,
        address,
        bytes calldata metadata
    ) external {
        (uint256 period, uint256 fee, bool auto) =
            abi.decode(metadata, (uint256, uint256, bool));

        configs[integraHash] = RenewalConfig({
            expiryDate: block.timestamp + period,
            renewalPeriod: period,
            renewalFee: fee,
            autoRenew: auto
        });
    }

    // Off-chain service calls this
    function checkExpiry(bytes32 integraHash)
        external view returns (bool expired, bool canRenew)
    {
        RenewalConfig memory config = configs[integraHash];
        expired = block.timestamp > config.expiryDate;
        canRenew = config.autoRenew;
    }
}
```

**Use case:** Automatically track and notify about expiring licenses, permits, subscriptions.

### 2. Geographic Restriction Resolver

```solidity
contract GeographicComplianceResolver is IDocumentResolver {
    mapping(bytes32 => string[]) private allowedJurisdictions;

    function onDocumentRegistered(
        bytes32 integraHash,
        bytes32,
        address,
        bytes calldata metadata
    ) external {
        string[] memory jurisdictions =
            abi.decode(metadata, (string[]));

        allowedJurisdictions[integraHash] = jurisdictions;
    }

    function onOwnershipTransferred(
        bytes32 integraHash,
        address,
        address newOwner,
        string calldata
    ) external view {
        // Verify new owner's jurisdiction
        string memory ownerCountry = getCountryCode(newOwner);
        string[] memory allowed = allowedJurisdictions[integraHash];

        bool isAllowed = false;
        for (uint i = 0; i < allowed.length; i++) {
            if (keccak256(bytes(allowed[i])) == keccak256(bytes(ownerCountry))) {
                isAllowed = true;
                break;
            }
        }

        require(isAllowed, "Jurisdiction not permitted");
    }
}
```

**Use case:** Restrict security token ownership to specific countries.

### 3. Multi-Sig Approval Resolver

```solidity
contract MultiSigApprovalResolver is IDocumentResolver {
    mapping(bytes32 => address[]) private approvers;
    mapping(bytes32 => mapping(address => bool)) private hasApproved;
    mapping(bytes32 => uint256) private requiredApprovals;

    function onOwnershipTransferred(
        bytes32 integraHash,
        address,
        address newOwner,
        string calldata
    ) external {
        // Count approvals
        uint256 approvalCount = 0;
        for (uint i = 0; i < approvers[integraHash].length; i++) {
            if (hasApproved[integraHash][approvers[integraHash][i]]) {
                approvalCount++;
            }
        }

        require(
            approvalCount >= requiredApprovals[integraHash],
            "Insufficient approvals"
        );

        // Reset approvals for next transfer
        _resetApprovals(integraHash);
    }

    // Approvers call this before transfer
    function approve(bytes32 integraHash) external {
        require(_isApprover(integraHash, msg.sender), "Not approver");
        hasApproved[integraHash][msg.sender] = true;
        emit TransferApproved(integraHash, msg.sender);
    }
}
```

**Use case:** Require board approval before transferring company shares.

### 4. Audit Trail Resolver

```solidity
contract AuditTrailResolver is IDocumentResolver {
    event DocumentEvent(
        bytes32 indexed integraHash,
        string eventType,
        address actor,
        uint256 timestamp,
        bytes data
    );

    function onDocumentRegistered(
        bytes32 integraHash,
        bytes32 documentHash,
        address owner,
        bytes calldata
    ) external {
        emit DocumentEvent(
            integraHash,
            "REGISTERED",
            owner,
            block.timestamp,
            abi.encode(documentHash)
        );
    }

    function onOwnershipTransferred(
        bytes32 integraHash,
        address oldOwner,
        address newOwner,
        string calldata reason
    ) external {
        emit DocumentEvent(
            integraHash,
            "TRANSFERRED",
            newOwner,
            block.timestamp,
            abi.encode(oldOwner, newOwner, reason)
        );
    }
}
```

**Use case:** Maintain complete, immutable audit trail for compliance.

## The Power of Composition

### Unlimited Combinations

Mix and match resolvers for any use case:

```
Real Estate Sale:
  ├─ Primary: Title verification
  └─ Additional: [Escrow, Tax calculation, Deed recording]

Rental Agreement:
  ├─ Primary: Contact storage
  └─ Additional: [Rent automation, Maintenance tracking, Insurance]

Business Partnership:
  ├─ Primary: Multi-sig approval
  └─ Additional: [Profit distribution, Voting, Audit trail]

Security Token:
  ├─ Primary: Accreditation check
  └─ Additional: [Jurisdiction, Transfer limits, Reporting]

Patent License:
  ├─ Primary: Royalty tracking
  └─ Additional: [Usage monitoring, Geographic limits, Sublicensing]
```

### No Core Contract Changes

Add new capabilities without upgrading document registry:

```
Need new feature? → Create new resolver → Register in component registry → Attach to documents

NO changes to:
  ✅ IntegraDocumentRegistryV7_Immutable
  ✅ Tokenizer contracts
  ✅ Existing documents
```

## Integration Example

Complete example showing resolver power:

```solidity
contract RealEstateManager {
    IntegraDocumentRegistryV7_Immutable public documentRegistry;
    IntegraRegistryV7_Immutable public componentRegistry;

    // Resolver IDs
    bytes32 constant CONTACT_RESOLVER = keccak256("ContactResolver");
    bytes32 constant ESCROW_RESOLVER = keccak256("EscrowResolver");
    bytes32 constant TITLE_RESOLVER = keccak256("TitleVerification");

    function createPropertySale(
        bytes32 deedHash,
        bytes32 ipfsCID,
        address buyer,
        uint256 salePrice
    ) external returns (bytes32 integraHash) {
        // Register deed with comprehensive resolver suite
        integraHash = documentRegistry.registerDocument(
            deedHash,
            ipfsCID,
            address(ownershipTokenizer),
            address(0),
            bytes32(0),
            bytes32(0),
            TITLE_RESOLVER,  // Primary: Must verify title is clear
            [CONTACT_RESOLVER, ESCROW_RESOLVER]  // Additional: Contact + escrow
        );

        // Resolvers automatically:
        // - Title: Verify no liens (blocks if issues)
        // - Contact: Store seller contact info
        // - Escrow: Set up escrow account

        // Reserve token for buyer
        ownershipTokenizer.reserveToken(integraHash, 0, buyer, 1, bytes32(0));

        return integraHash;
    }
}
```

## Extensibility Benefits

### For Platform Developers

1. **Customize Behavior**: Add your business logic via resolvers
2. **No Forks Required**: Extend without modifying core contracts
3. **Maintainable**: Update resolvers independently
4. **Composable**: Combine multiple service providers
5. **Upgradeable**: Resolvers can be upgraded (via UUPS)

### For Ecosystem

1. **Resolver Marketplace**: Third parties can build resolvers
2. **Specialized Services**: Industry-specific resolvers (real estate, healthcare, etc.)
3. **Innovation**: New use cases enabled by new resolvers
4. **Interoperability**: Share resolvers across applications
5. **Competition**: Multiple implementations of same service type

### For Users

1. **Feature Rich**: Documents have extensive functionality
2. **Customizable**: Choose which services you need
3. **Future Proof**: New services added without disruption
4. **Portable**: Resolvers work across chains
5. **Transparent**: All resolver calls logged on-chain

## Summary

Integra's Resolver Composition Pattern:

1. **Extends** document functionality without modifying core contracts
2. **Separates** document identity from services (clean architecture)
3. **Enables** unlimited customization via IDocumentResolver interface
4. **Supports** both critical (primary) and optional (additional) services
5. **Protects** against DOS via gas limits and graceful degradation
6. **Allows** locking for immutability when needed
7. **Powers** real-world contract automation and compliance

This makes Integra's document registry a **programmable platform** where developers can build any document-related service imaginable while core contracts remain immutable and secure.

## Learn More

- [Document Registry](./document-registration/document-registry.md) - Core document management
- [SimpleContactResolverV7](./document-registration/simple-contact-resolver.md) - Contact resolver example
- [TokenClaimResolverV7](./document-registration/token-claim-resolver.md) - EAS resolver example
- [Extensibility Overview](./extensibility/overview.md) - System extensibility
- [Document-Token Binding](./concepts/document-token-binding.md) - How documents and tokens work together
