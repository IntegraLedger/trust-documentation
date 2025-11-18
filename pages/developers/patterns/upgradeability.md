# Upgradeability Patterns

Progressive decentralization and upgrade patterns in Integra V7 smart contracts.

## Overview

The Integra V7 system uses a hybrid upgradeability model combining:

- **UUPS Proxy Pattern**: Upgradeable contracts with storage gaps
- **Progressive Ossification**: Time-gated governance evolution (BOOTSTRAP → MULTISIG → DAO → OSSIFIED)
- **Immutable Registries**: Non-upgradeable infrastructure contracts
- **Storage Gap Management**: Reserved storage slots for future upgrades
- **Upgrade Authorization**: Stage-gated upgrade permissions

This approach balances **flexibility during early stages** with **immutability at maturity**.

## Pattern 1: UUPS Proxy Pattern

### Description

UUPS (Universal Upgradeable Proxy Standard) stores upgrade logic in the implementation contract, not the proxy. This is more gas-efficient than transparent proxies and prevents accidental upgrade calls.

### Implementation

```solidity
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

abstract contract AttestationAccessControlV7 is
    UUPSUpgradeable,  // ✅ UUPS upgradeable
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    /// @notice Initialize contract (replaces constructor for proxies)
    function __AttestationAccessControl_init(
        address _namespace,
        address _providerRegistry,
        bytes32 _defaultProviderId,
        address _governor
    ) internal onlyInitializing {
        // Initialize parent contracts
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        // Set immutable references (via storage, not true immutability)
        NAMESPACE = CapabilityNamespaceV7_Immutable(_namespace);
        PROVIDER_REGISTRY = AttestationProviderRegistryV7_Immutable(_providerRegistry);

        // Initialize governance
        currentStage = GovernanceStage.BOOTSTRAP;
        bootstrapGovernor = _governor;

        _grantRole(DEFAULT_ADMIN_ROLE, _governor);
        _grantRole(GOVERNOR_ROLE, _governor);

        defaultProviderId = _defaultProviderId;
    }

    /**
     * @notice Authorize upgrade (UUPS pattern)
     * @dev Only governor can upgrade, and only if not ossified
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(GOVERNOR_ROLE)
    {
        if (currentStage == GovernanceStage.OSSIFIED) {
            revert ContractIsOssified();
        }
    }

    /**
     * @dev Storage gap for future upgrades
     * State variables: 9 slots
     * Gap: 50 - 9 = 41 slots
     */
    uint256[41] private __gap;
}
```

### Upgrade Process

```typescript
// 1. Deploy new implementation
const NewImplementation = await ethers.getContractFactory(
  "AttestationAccessControlV7_V2"
);
const newImpl = await NewImplementation.deploy();

// 2. Upgrade proxy to new implementation
const proxy = await ethers.getContractAt(
  "AttestationAccessControlV7",
  proxyAddress
);
await proxy.upgradeTo(newImpl.address);

// 3. Verify upgrade
const implAddress = await upgrades.erc1967.getImplementationAddress(
  proxyAddress
);
console.log(`Upgraded to: ${implAddress}`);
```

### Benefits

- **Gas Efficient**: No delegate call overhead for admin operations
- **Cleaner**: No admin collision complexity
- **Flexible**: Can add new features without data migration
- **Safe**: Requires explicit authorization function

### Contracts Using UUPS

- Foundation Contracts: `AttestationAccessControlV7` (abstract), `EASAttestationProviderV7`
- Tokenization Contracts: All tokenizers (via `BaseTokenizerV7`)
- Communication Contracts: `IntegraMessageV7`, `IntegraSignalV7`
- Execution Contracts: `IntegraExecutorV7`

## Pattern 2: Progressive Ossification

### Description

Progressive ossification is a time-gated governance evolution that transitions control from:
1. **BOOTSTRAP** (0-6 months): Team control for rapid iteration
2. **MULTISIG** (6-12 months): Guardian multisig for stability
3. **DAO** (12-24 months): Community governance for decentralization
4. **OSSIFIED** (24+ months): Frozen forever for immutability

### Governance Stages

```solidity
/**
 * @notice Governance stages for progressive ossification
 */
enum GovernanceStage {
    BOOTSTRAP,  // Team control (months 0-6)
    MULTISIG,   // Guardian multisig (months 6-12)
    DAO,        // Community DAO (months 12-24)
    OSSIFIED    // Frozen forever (month 24+)
}

/// @notice Current governance stage
GovernanceStage public currentStage;

/// @notice Bootstrap governor address (team)
address public bootstrapGovernor;

/// @notice Guardian multisig address (3-of-5)
address public guardianMultisig;

/// @notice DAO governor address (community)
address public daoGovernor;

/// @notice Timestamp when contract was ossified (0 = not ossified)
uint256 public ossificationTimestamp;
```

### Stage Transitions

#### BOOTSTRAP → MULTISIG

```solidity
/**
 * @notice Transition from BOOTSTRAP to MULTISIG stage
 * @param _multisig Guardian multisig address (3-of-5 recommended)
 *
 * SECURITY:
 * - Only bootstrap governor can initiate
 * - Must be in BOOTSTRAP stage
 * - Revokes bootstrap governor's GOVERNOR_ROLE
 * - Grants GOVERNOR_ROLE to multisig
 * - One-way transition (cannot revert to BOOTSTRAP)
 */
function transitionToMultisig(address _multisig) external {
    if (msg.sender != bootstrapGovernor) revert OnlyBootstrapGovernor();
    if (currentStage != GovernanceStage.BOOTSTRAP) {
        revert InvalidStageTransition(currentStage, GovernanceStage.MULTISIG);
    }
    if (_multisig == address(0)) revert ZeroAddress();

    GovernanceStage oldStage = currentStage;
    currentStage = GovernanceStage.MULTISIG;
    guardianMultisig = _multisig;

    // Transfer governance control
    _grantRole(GOVERNOR_ROLE, _multisig);
    _revokeRole(GOVERNOR_ROLE, bootstrapGovernor);

    emit GovernanceStageTransitioned(
        oldStage,
        currentStage,
        msg.sender,
        block.timestamp
    );
}
```

#### MULTISIG → DAO

```solidity
/**
 * @notice Transition from MULTISIG to DAO stage
 * @param _dao DAO governor address
 *
 * SECURITY:
 * - Only guardian multisig can initiate
 * - Must be in MULTISIG stage
 * - Revokes multisig's GOVERNOR_ROLE
 * - Grants GOVERNOR_ROLE to DAO
 * - One-way transition (cannot revert to MULTISIG)
 */
function transitionToDAO(address _dao) external {
    if (msg.sender != guardianMultisig) revert OnlyGuardianMultisig();
    if (currentStage != GovernanceStage.MULTISIG) {
        revert InvalidStageTransition(currentStage, GovernanceStage.DAO);
    }
    if (_dao == address(0)) revert ZeroAddress();

    GovernanceStage oldStage = currentStage;
    currentStage = GovernanceStage.DAO;
    daoGovernor = _dao;

    // Transfer governance control
    _grantRole(GOVERNOR_ROLE, _dao);
    _revokeRole(GOVERNOR_ROLE, guardianMultisig);

    emit GovernanceStageTransitioned(
        oldStage,
        currentStage,
        msg.sender,
        block.timestamp
    );
}
```

#### DAO → OSSIFIED

```solidity
/**
 * @notice Ossify contract (freeze forever)
 * @dev Can only be called from DAO stage
 *
 * SECURITY:
 * - Only DAO governor can initiate
 * - Must be in DAO stage
 * - Sets ossificationTimestamp for transparency
 * - PERMANENT: Cannot be reversed
 * - Blocks all future upgrades via _authorizeUpgrade()
 */
function ossify() external {
    if (msg.sender != daoGovernor) revert OnlyDAOGovernor();
    if (currentStage != GovernanceStage.DAO) {
        revert CannotOssifyBeforeDAO();
    }

    GovernanceStage oldStage = currentStage;
    currentStage = GovernanceStage.OSSIFIED;
    ossificationTimestamp = block.timestamp;

    emit GovernanceStageTransitioned(
        oldStage,
        currentStage,
        msg.sender,
        block.timestamp
    );
    emit ContractOssified(msg.sender, block.timestamp);
}
```

### Upgrade Authorization with Ossification

```solidity
/**
 * @notice Authorize upgrade (UUPS pattern)
 * @dev Respects ossification stage
 */
function _authorizeUpgrade(address newImplementation)
    internal
    override
    onlyRole(GOVERNOR_ROLE)
{
    if (currentStage == GovernanceStage.OSSIFIED) {
        revert ContractIsOssified();  // ✅ Cannot upgrade when ossified
    }
    // If not ossified, upgrade allowed (caller has GOVERNOR_ROLE)
}
```

### View Functions

```solidity
/**
 * @notice Check if contract can be upgraded
 * @return Whether contract is not ossified
 */
function canUpgrade() external view returns (bool) {
    return currentStage != GovernanceStage.OSSIFIED;
}

/**
 * @notice Get governance stage information
 * @return stage Current governance stage
 * @return governor Current governor address
 * @return canBeUpgraded Whether upgrades are allowed
 */
function getGovernanceInfo()
    external
    view
    returns (
        GovernanceStage stage,
        address governor,
        bool canBeUpgraded
    )
{
    stage = currentStage;
    canBeUpgraded = (currentStage != GovernanceStage.OSSIFIED);

    if (currentStage == GovernanceStage.BOOTSTRAP) {
        governor = bootstrapGovernor;
    } else if (currentStage == GovernanceStage.MULTISIG) {
        governor = guardianMultisig;
    } else if (currentStage == GovernanceStage.DAO) {
        governor = daoGovernor;
    } else {
        governor = address(0);  // Ossified, no governor
    }
}
```

### Benefits

- **Progressive Decentralization**: Gradual transition from team to community
- **Fail-Safe**: Multisig provides safety net during transition
- **Transparency**: All stages tracked on-chain with events
- **One-Way**: Cannot revert to previous stages (prevents governance capture)
- **Ultimate Immutability**: Ossification provides final trust guarantee

### Timeline Example

```
Month 0:   Deploy (BOOTSTRAP stage)
           - Team has full control
           - Rapid iteration and bug fixes
           - User onboarding and testing

Month 6:   Transition to MULTISIG
           - Transfer to 3-of-5 or 5-of-9 guardian multisig
           - Slower, more deliberate governance
           - Build confidence and track record

Month 12:  Transition to DAO
           - Transfer to community DAO (on-chain governance)
           - Community votes on upgrades
           - Full decentralization achieved

Month 24:  Ossify (OSSIFIED stage)
           - Freeze contract forever
           - No more upgrades possible
           - Ultimate immutability achieved
           - Users have absolute trust in code
```

## Pattern 3: Immutable Registry Pattern

### Description

Critical infrastructure contracts (registries, namespaces) are deployed as immutable, non-upgradeable contracts. Once deployed, their behavior can never change, providing ultimate trust guarantees.

### Immutable Contracts

```solidity
// CapabilityNamespaceV7_Immutable.sol
contract CapabilityNamespaceV7_Immutable {
    // NO UUPS inheritance
    // NO initializer
    // NO upgrade function
    // ALL STATE VARIABLES ARE CONSTANTS

    string public constant VERSION = "7.0.0";

    uint256 public constant CORE_VIEW = 1 << 0;
    uint256 public constant CORE_CLAIM = 1 << 1;
    // ... all capabilities defined as constants

    // Pure functions only (no state changes)
    function hasCapability(uint256 granted, uint256 required)
        external
        pure
        returns (bool)
    {
        return ((granted & CORE_ADMIN) != 0) || ((granted & required) == required);
    }
}
```

```solidity
// AttestationProviderRegistryV7_Immutable.sol
contract AttestationProviderRegistryV7_Immutable is AccessControl {
    // NO UUPS inheritance
    // Uses constructor (not initializer)
    // Cannot be upgraded after deployment

    constructor(address _governor) {
        if (_governor == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, _governor);
        _grantRole(GOVERNOR_ROLE, _governor);
    }

    // State variables for mutable data
    mapping(bytes32 => ProviderInfo) public providers;

    // But contract logic itself is immutable
}
```

### Why Immutable Registries?

**Capability Namespace** (`CapabilityNamespaceV7_Immutable`):
- Capability bit positions must NEVER change
- Bit 7 always means CORE_ADMIN, forever
- Changing would break ALL attestations across ALL time
- Must be immutable for consistency

**Provider Registry** (`AttestationProviderRegistryV7_Immutable`):
- Code hash verification logic must be trustworthy
- Cannot be upgraded to malicious logic
- Graceful degradation pattern must be reliable
- Must be immutable for security

**Verifier Registry** (`IntegraVerifierRegistryV7_Immutable`):
- ZK verifier addresses must be trustworthy
- Code hash verification must work correctly
- Cannot risk malicious upgrade
- Must be immutable for proof integrity

**Resolver Registry** (`IntegraResolverRegistryV7_Immutable`):
- Resolver lookup must be reliable
- Code hash verification must work
- Cannot risk DOS via malicious upgrade
- Must be immutable for service continuity

### Hybrid Model

```
UPGRADEABLE (UUPS with ossification):
├── AttestationAccessControlV7 (can evolve, will ossify)
├── EASAttestationProviderV7 (can add features, will ossify)
├── BaseTokenizerV7 + concrete tokenizers (can add types, will ossify)
├── IntegraMessageV7 (can evolve, will ossify)
├── IntegraSignalV7 (can evolve, will ossify)
└── IntegraExecutorV7 (can evolve, will ossify)

IMMUTABLE (never upgrade):
├── CapabilityNamespaceV7_Immutable (permanent bit definitions)
├── AttestationProviderRegistryV7_Immutable (trusted infrastructure)
├── IntegraVerifierRegistryV7_Immutable (trusted infrastructure)
├── IntegraResolverRegistryV7_Immutable (trusted infrastructure)
└── IntegraDocumentRegistryV7_Immutable (permanent document records)
```

### Benefits

- **Trust Guarantees**: Users know code will never change
- **No Upgrade Risk**: Cannot introduce bugs via upgrades
- **Gas Efficient**: No proxy overhead
- **Simpler**: No upgrade complexity to reason about

## Pattern 4: Storage Gap Management

### Description

Storage gaps reserve slots in upgradeable contracts for future state variables, preventing storage collisions during upgrades.

### Storage Gap Calculation

```solidity
/**
 * @dev Storage gap for future upgrades
 *
 * CURRENT STATE VARIABLES: 9 slots
 * 1. CapabilityNamespaceV7_Immutable public NAMESPACE;
 * 2. AttestationProviderRegistryV7_Immutable public PROVIDER_REGISTRY;
 * 3. GovernanceStage public currentStage;
 * 4. address public bootstrapGovernor;
 * 5. address public guardianMultisig;
 * 6. address public daoGovernor;
 * 7. uint256 public ossificationTimestamp;
 * 8. bytes32 public defaultProviderId;
 * 9. mapping(bytes32 => bytes32) public documentProvider;
 *
 * STANDARD GAP SIZE: 50 slots total
 * GAP SIZE: 50 - 9 = 41 slots
 *
 * FUTURE UPGRADES:
 * - Can add up to 41 new state variables
 * - Must reduce __gap size accordingly
 * - Example: Add 2 variables → reduce gap to uint256[39]
 */
uint256[41] private __gap;
```

### Storage Gap Examples Across Contracts

```solidity
// AttestationAccessControlV7 (9 variables)
uint256[41] private __gap;

// EASAttestationProviderV7 (7 variables)
uint256[43] private __gap;

// BaseTokenizerV7 (1 variable)
uint256[49] private __gap;

// TrustGraphIntegration (4 variables)
uint256[46] private __gap;

// OwnershipTokenizerV7 (4 variables)
uint256[46] private __gap;

// IntegraMessageV7 (1 variable)
uint256[49] private __gap;

// IntegraSignalV7 (9 variables)
uint256[41] private __gap;

// IntegraExecutorV7 (5 variables)
uint256[45] private __gap;
```

### Adding State Variables in Upgrades

```solidity
// VERSION 1 (Initial deployment)
contract MyContractV1 is UUPSUpgradeable {
    uint256 public stateVar1;
    uint256 public stateVar2;

    // 2 variables, need 48 gap slots
    uint256[48] private __gap;
}

// VERSION 2 (Upgrade with 2 new variables)
contract MyContractV2 is UUPSUpgradeable {
    uint256 public stateVar1;    // ✅ Same position
    uint256 public stateVar2;    // ✅ Same position
    uint256 public newVar1;      // ✅ New variable (slot 2)
    uint256 public newVar2;      // ✅ New variable (slot 3)

    // 4 variables, reduce gap to 46
    uint256[46] private __gap;  // ✅ Reduced by 2
}
```

### Storage Collision Prevention

```solidity
// ❌ BAD: Storage collision
contract MyContractV2_Bad is UUPSUpgradeable {
    uint256 public newVar1;      // ❌ Overwrites stateVar1!
    uint256 public stateVar1;    // ❌ Wrong position!
    uint256 public stateVar2;    // ❌ Wrong position!

    uint256[48] private __gap;
}

// ✅ GOOD: Preserve storage layout
contract MyContractV2_Good is UUPSUpgradeable {
    uint256 public stateVar1;    // ✅ Unchanged
    uint256 public stateVar2;    // ✅ Unchanged
    uint256 public newVar1;      // ✅ Appended

    uint256[47] private __gap;  // ✅ Reduced by 1
}
```

### Benefits

- **Safe Upgrades**: Prevents storage collisions
- **Future-Proof**: Reserves space for new features
- **Standardized**: 50-slot standard across all contracts
- **Documented**: Gap calculations clearly documented

## Pattern 5: Constructor Disabling

### Description

Upgradeable contracts must disable their constructors to prevent implementation contract initialization.

### Implementation

```solidity
abstract contract AttestationAccessControlV7 is UUPSUpgradeable {
    /**
     * @notice Disable initializers in implementation contract
     * @dev Prevents initialization of implementation (only proxy should be initialized)
     */
    constructor() {
        _disableInitializers();  // ✅ Disable constructor
    }

    /**
     * @notice Initialize proxy
     * @dev Called once during proxy deployment
     */
    function __AttestationAccessControl_init(...)
        internal
        onlyInitializing  // ✅ Only during initialization
    {
        // Initialize parent contracts
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        // ... initialization logic
    }
}
```

### Why Constructor Disabling?

```solidity
// Without constructor disabling:
const impl = await Implementation.deploy();
await impl.initialize(maliciousGovernor);  // ❌ Attacker initializes implementation!

// With constructor disabling:
const impl = await Implementation.deploy();  // ✅ Constructor disables initializers
await impl.initialize(maliciousGovernor);    // ❌ Reverts: initializers disabled

// Proxy can still be initialized:
const proxy = await upgrades.deployProxy(Implementation, [goodGovernor]);
// ✅ Proxy initialization works (separate storage)
```

## Testing Strategy

### UUPS Upgrade Tests

```typescript
describe("UUPS Upgrades", () => {
  it("should upgrade to new implementation", async () => {
    const V2 = await ethers.getContractFactory("ContractV2");
    const upgraded = await upgrades.upgradeProxy(proxyAddress, V2);

    expect(await upgraded.version()).to.equal("2.0.0");
  });

  it("should preserve state across upgrades", async () => {
    const valueBefore = await proxy.getValue();

    const V2 = await ethers.getContractFactory("ContractV2");
    await upgrades.upgradeProxy(proxyAddress, V2);

    const valueAfter = await proxy.getValue();
    expect(valueAfter).to.equal(valueBefore);
  });

  it("should prevent upgrade when ossified", async () => {
    await proxy.ossify();

    await expect(
      proxy.upgradeTo(newImplementation.address)
    ).to.be.revertedWithCustomError(proxy, "ContractIsOssified");
  });
});
```

### Progressive Ossification Tests

```typescript
describe("Progressive Ossification", () => {
  it("should transition BOOTSTRAP → MULTISIG", async () => {
    await expect(
      proxy.connect(bootstrap).transitionToMultisig(multisig.address)
    )
      .to.emit(proxy, "GovernanceStageTransitioned")
      .withArgs(0, 1, bootstrap.address, anyValue);

    const stage = await proxy.currentStage();
    expect(stage).to.equal(1); // MULTISIG
  });

  it("should prevent skipping stages", async () => {
    // Try to go directly from BOOTSTRAP to DAO
    await expect(
      proxy.connect(bootstrap).transitionToDAO(dao.address)
    ).to.be.revertedWithCustomError(proxy, "InvalidStageTransition");
  });

  it("should prevent reverting to previous stage", async () => {
    await proxy.connect(bootstrap).transitionToMultisig(multisig.address);

    // Try to go back to BOOTSTRAP
    await expect(
      proxy.connect(multisig).transitionToMultisig(newMultisig.address)
    ).to.be.revertedWithCustomError(proxy, "InvalidStageTransition");
  });

  it("should complete full ossification timeline", async () => {
    // BOOTSTRAP → MULTISIG
    await proxy.connect(bootstrap).transitionToMultisig(multisig.address);
    expect(await proxy.currentStage()).to.equal(1);

    // MULTISIG → DAO
    await proxy.connect(multisig).transitionToDAO(dao.address);
    expect(await proxy.currentStage()).to.equal(2);

    // DAO → OSSIFIED
    await proxy.connect(dao).ossify();
    expect(await proxy.currentStage()).to.equal(3);
    expect(await proxy.canUpgrade()).to.equal(false);
  });
});
```

### Storage Gap Tests

```typescript
describe("Storage Layout", () => {
  it("should preserve storage across upgrades", async () => {
    await proxy.setValue(42);
    await proxy.setMapping(key, value);

    const V2 = await ethers.getContractFactory("ContractV2");
    await upgrades.upgradeProxy(proxyAddress, V2);

    expect(await proxy.getValue()).to.equal(42);
    expect(await proxy.getMapping(key)).to.equal(value);
  });

  it("should validate storage layout", async () => {
    await upgrades.validateUpgrade(proxyAddress, V2Factory, {
      kind: "uups",
    });
    // Throws if storage layout invalid
  });
});
```

## Integration Guidelines

### For Governance

1. **Deployment Checklist**:
   ```typescript
   // 1. Deploy immutable registries
   const namespace = await CapabilityNamespace.deploy();
   const providerRegistry = await ProviderRegistry.deploy(governor);

   // 2. Deploy UUPS proxies
   const proxy = await upgrades.deployProxy(Implementation, [
     namespace.address,
     providerRegistry.address,
     defaultProviderId,
     governor,
   ]);

   // 3. Verify initial stage
   expect(await proxy.currentStage()).to.equal(0); // BOOTSTRAP
   ```

2. **Upgrade Process**:
   ```typescript
   // 1. Deploy new implementation
   const V2 = await Implementation_V2.deploy();

   // 2. Validate upgrade
   await upgrades.validateUpgrade(proxyAddress, V2, { kind: "uups" });

   // 3. Execute upgrade (requires GOVERNOR_ROLE)
   await proxy.connect(governor).upgradeTo(V2.address);

   // 4. Verify upgrade
   const implAddr = await upgrades.erc1967.getImplementationAddress(
     proxyAddress
   );
   expect(implAddr).to.equal(V2.address);
   ```

3. **Ossification Timeline**:
   ```typescript
   // Month 6: BOOTSTRAP → MULTISIG
   await proxy.connect(bootstrap).transitionToMultisig(multisigAddress);

   // Month 12: MULTISIG → DAO
   await proxy.connect(multisig).transitionToDAO(daoAddress);

   // Month 24: DAO → OSSIFIED
   await proxy.connect(dao).ossify();
   ```

## Security Considerations

### Upgrade Risks

- **Logic Bugs**: New implementation may have bugs
- **Storage Collisions**: Must preserve storage layout
- **Initialization**: Must disable constructor in implementation
- **Authorization**: Must require GOVERNOR_ROLE and check ossification

### Mitigation

- **Audits**: All upgrades should be audited
- **Testing**: Comprehensive upgrade tests with storage validation
- **Timelock**: Consider timelock before upgrade execution
- **Emergency Pause**: Can pause before upgrade to prevent exploits
- **Progressive Ossification**: Eventually remove upgrade risk entirely

## See Also

- [Security Patterns](./security.md) - Emergency controls and pausability
- [Access Control Patterns](./access-control.md) - GOVERNOR_ROLE management
- [Registry Patterns](./registries.md) - Immutable infrastructure
- [Foundation Documentation](../layer0/) - Attestation system architecture
