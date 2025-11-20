# Integra V7 Security Guide

Comprehensive security best practices for Integra smart contracts.

## Table of Contents

- [Overview](#overview)
- [Security Best Practices](#security-best-practices)
- [Threat Models](#threat-models)
- [Attack Vectors and Mitigations](#attack-vectors-and-mitigations)
- [Access Control Implementation](#access-control-implementation)
- [Emergency Procedures](#emergency-procedures)
- [Audit Checklist](#audit-checklist)
- [Monitoring and Alerting](#monitoring-and-alerting)
- [Incident Response](#incident-response)

## Overview

Integra V7 implements defense-in-depth security with multiple independent layers:

1. **Code Hash Verification**: Prevent malicious contract upgrades
2. **Reentrancy Protection**: ReentrancyGuard on all state-changing functions
3. **Access Control**: Role-based, attestation-based, and document-level authorization
4. **Pausability**: Emergency circuit breakers
5. **Progressive Ossification**: Planned path to immutability
6. **Formal Verification**: Certora proofs for critical properties
7. **Time-Limited Emergency Powers**: Auto-expiring emergency controls

### Security Principles

#### Defense in Depth
Multiple independent security layers ensure that a single failure doesn't compromise the system.

#### Fail-Safe Defaults
Secure defaults (paused contracts, restricted access) with explicit enabling rather than disabling.

#### Principle of Least Privilege
Users and contracts receive minimal permissions necessary for their function.

#### Separation of Concerns
Security-critical functionality isolated from application logic.

#### Graceful Degradation
System continues operating in reduced capacity rather than failing completely.

## Security Best Practices

### Contract Development

#### 1. Use Established Patterns

```solidity
// ✅ GOOD: Use OpenZeppelin contracts
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract MyContract is
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable
{
    // Implementation
}

// ❌ BAD: Custom reentrancy guard
contract MyContract {
    bool private locked;

    modifier noReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }
}
```

#### 2. Checks-Effects-Interactions Pattern

```solidity
// ✅ GOOD: State changes before external calls
function claimToken(bytes32 integraHash, uint256 tokenId) external {
    // CHECKS
    require(!claimed[integraHash][tokenId], "Already claimed");
    require(reservations[integraHash][tokenId].recipient == msg.sender, "Not authorized");

    // EFFECTS
    claimed[integraHash][tokenId] = true;
    delete reservations[integraHash][tokenId];

    // INTERACTIONS
    _mint(msg.sender, tokenId);
    _callExternalHook(integraHash, tokenId);
}

// ❌ BAD: External calls before state changes
function claimToken(bytes32 integraHash, uint256 tokenId) external {
    _mint(msg.sender, tokenId);  // External call first
    claimed[integraHash][tokenId] = true;  // State change after
}
```

#### 3. Input Validation

```solidity
// ✅ GOOD: Comprehensive validation
function transferDocumentOwnership(
    bytes32 integraHash,
    address newOwner,
    string calldata reason
) external {
    if (integraHash == bytes32(0)) revert ZeroHash();
    if (newOwner == address(0)) revert ZeroAddress();
    if (bytes(reason).length == 0) revert EmptyReason();
    if (!documents[integraHash].exists) revert DocumentNotRegistered(integraHash);
    if (msg.sender != documents[integraHash].owner) revert Unauthorized(msg.sender, integraHash);

    // Proceed with transfer
}

// ❌ BAD: Minimal validation
function transferDocumentOwnership(bytes32 integraHash, address newOwner) external {
    documents[integraHash].owner = newOwner;
}
```

#### 4. Safe Math and Overflow Protection

```solidity
// ✅ GOOD: Solidity 0.8+ has built-in overflow protection
function calculateFee(uint256 amount) public pure returns (uint256) {
    return amount * 3 / 100;  // Safe in 0.8+
}

// Use unchecked only when safe (bounded loops, gas optimization)
function batchOperation(uint256 count) external {
    for (uint256 i = 0; i < count;) {
        // Process item i
        unchecked { ++i; }  // Safe: i < count
    }
}

// ❌ BAD: Unchecked without justification
function calculateFee(uint256 amount) public pure returns (uint256) {
    unchecked {
        return amount * 3 / 100;  // Risky: could overflow
    }
}
```

### Access Control

#### 1. Multi-Layer Authorization

```solidity
// ✅ GOOD: Multiple independent checks
modifier requireOwnerOrExecutor(bytes32 integraHash) {
    // Layer 1: Document must use this tokenizer
    address documentTokenizer = documentRegistry.getTokenizer(integraHash);
    if (documentTokenizer != address(this)) {
        revert WrongTokenizer(integraHash, documentTokenizer, address(this));
    }

    // Layer 2: Owner check
    address owner = documentRegistry.getDocumentOwner(integraHash);
    if (msg.sender == owner) {
        _;
        return;
    }

    // Layer 3: Executor check
    address authorizedExecutor = documentRegistry.getDocumentExecutor(integraHash);
    if (authorizedExecutor != address(0) && msg.sender == authorizedExecutor) {
        _;
        return;
    }

    // All checks failed
    revert Unauthorized(msg.sender, integraHash);
}
```

#### 2. Attestation-Based Capabilities

```solidity
// ✅ GOOD: 13-step verification
function verifyCapabilities(
    bytes calldata proof,
    address recipient,
    bytes32 documentHash,
    uint256 requiredCapability
) external view returns (bool verified, uint256 grantedCapabilities) {
    bytes32 attestationUID = abi.decode(proof, (bytes32));
    Attestation memory attestation = eas.getAttestation(attestationUID);

    // Step 1-13: Comprehensive verification
    if (attestation.uid == bytes32(0)) return (false, 0);
    if (attestation.revoked) return (false, 0);
    if (attestation.expirationTime > 0 && attestation.expirationTime < block.timestamp) {
        return (false, 0);
    }
    if (attestation.schema != schemaUID) return (false, 0);
    if (attestation.recipient != recipient) return (false, 0);  // Front-running protection
    // ... continue all checks

    return (true, grantedCapabilities);
}

// ❌ BAD: Minimal verification
function verifyCapabilities(bytes calldata proof) external view returns (bool) {
    bytes32 attestationUID = abi.decode(proof, (bytes32));
    return eas.getAttestation(attestationUID).uid != bytes32(0);
}
```

### Upgrade Safety

#### 1. Storage Gap Management

```solidity
// ✅ GOOD: Documented storage gap
/**
 * @dev Storage gap for future upgrades
 * CURRENT STATE VARIABLES: 9 slots
 * GAP SIZE: 50 - 9 = 41 slots
 */
uint256[41] private __gap;

// When upgrading, add variables at end and reduce gap
contract V2 {
    // V1 variables (unchanged)
    uint256 public var1;
    uint256 public var2;

    // V2 variables (appended)
    uint256 public var3;

    // Gap reduced by 1
    uint256[40] private __gap;
}

// ❌ BAD: No storage gap or incorrect management
contract V1 {
    uint256 public var1;
    uint256 public var2;
}

contract V2 {
    uint256 public var3;  // Overwrites var1!
    uint256 public var1;  // Wrong position
    uint256 public var2;  // Wrong position
}
```

#### 2. Upgrade Authorization

```solidity
// ✅ GOOD: Ossification-aware authorization
function _authorizeUpgrade(address newImplementation)
    internal
    override
    onlyRole(GOVERNOR_ROLE)
{
    if (currentStage == GovernanceStage.OSSIFIED) {
        revert ContractIsOssified();
    }
    // Additional validation
    if (newImplementation == address(0)) {
        revert ZeroAddress();
    }
}

// ❌ BAD: No ossification check
function _authorizeUpgrade(address newImplementation)
    internal
    override
    onlyRole(GOVERNOR_ROLE)
{
    // No check if ossified
}
```

## Threat Models

### Threat 1: Malicious Provider Upgrade

**Scenario**: Attacker upgrades attestation provider to malicious implementation

**Attack Flow**:
1. Provider registered in ProviderRegistry
2. Attacker gains control of provider contract
3. Attacker upgrades provider to malicious implementation
4. Malicious provider grants capabilities to anyone

**Mitigation**:
```solidity
// Code hash verification in ProviderRegistry
function getProvider(bytes32 providerId) external view returns (address) {
    ProviderInfo storage info = providers[providerId];

    // Verify code hasn't changed
    bytes32 currentHash;
    assembly { currentHash := extcodehash(info.providerAddress) }

    if (currentHash != info.codeHash) {
        return address(0);  // Graceful degradation
    }

    return info.providerAddress;
}
```

**Detection**: Code hash mismatch on next call
**Impact**: Limited to documents using compromised provider
**Recovery**: Governor deactivates provider, documents switch providers

### Threat 2: Cross-Chain Replay Attack

**Scenario**: Attacker reuses attestation from one chain on another

**Attack Flow**:
1. User gets attestation on Ethereum for document X
2. Attacker observes attestation UID
3. Attacker calls claim on Polygon with same UID
4. If validation weak, attacker gains unauthorized access

**Mitigation**:
```solidity
// EASAttestationProvider validates chain-specific data
(
    uint256 sourceChainId,
    address sourceEASAddress,
    address sourceDocumentContract,
    // ...
) = abi.decode(attestation.data, (...));

// Step 9: Verify source chain ID matches
if (sourceChainId != block.chainid) {
    return (false, 0);
}

// Step 10: Verify source EAS contract matches
if (sourceEASAddress != address(eas)) {
    return (false, 0);
}

// Step 11: Verify source document contract matches
if (sourceDocumentContract != address(this)) {
    return (false, 0);
}
```

**Detection**: Chain ID mismatch in verification
**Impact**: None (verification fails)
**Recovery**: N/A (attack prevented)

### Threat 3: Front-Running Attack

**Scenario**: Attacker observes claim transaction in mempool and front-runs

**Attack Flow**:
1. Alice generates attestation for herself (recipient = Alice)
2. Alice submits claim transaction with attestationUID
3. Bob observes transaction in mempool
4. Bob front-runs with higher gas, using Alice's attestationUID
5. If validation weak, Bob claims Alice's token

**Mitigation**:
```solidity
// Recipient binding in attestation verification
if (attestation.recipient != recipient) {
    return (false, 0);  // Attestation not for this recipient
}

// Caller must match attestation recipient
modifier requiresCapabilityWithUID(
    bytes32 documentHash,
    uint256 requiredCapability,
    bytes32 easUID
) {
    _verifyCapability(msg.sender, documentHash, requiredCapability, easUID);
    _;
}
```

**Detection**: Recipient mismatch in verification
**Impact**: None (verification fails)
**Recovery**: N/A (attack prevented)

### Threat 4: Governance Takeover

**Scenario**: Malicious actor gains control of governance

**Attack Flow**:
1. Attacker compromises bootstrap governor private key
2. Attacker upgrades contracts to malicious implementations
3. Attacker drains funds, corrupts data, etc.

**Mitigation**:
```solidity
// Progressive ossification prevents permanent control
function transitionToMultisig(address _multisig) external {
    require(msg.sender == bootstrapGovernor);
    require(currentStage == GovernanceStage.BOOTSTRAP);

    currentStage = GovernanceStage.MULTISIG;
    guardianMultisig = _multisig;

    _grantRole(GOVERNOR_ROLE, _multisig);
    _revokeRole(GOVERNOR_ROLE, bootstrapGovernor);  // One-way transition

    emit GovernanceStageTransitioned(BOOTSTRAP, MULTISIG, block.timestamp);
}

// Time-locked upgrades (future)
// Multisig requirement (3-of-5, 5-of-9)
// DAO voting (community governance)
// Final ossification (immutable)
```

**Detection**: Monitoring governance events
**Impact**: Limited by stage (BOOTSTRAP worst, DAO better, OSSIFIED immune)
**Recovery**: Community fork if necessary

### Threat 5: Resolver DOS Attack

**Scenario**: Malicious resolver consumes all gas

**Attack Flow**:
1. Attacker creates malicious resolver
2. Governor registers resolver (assuming trusted)
3. Document owner sets malicious resolver as primary
4. Malicious resolver has infinite loop in onDocumentRegistered()
5. All document registrations fail due to gas exhaustion

**Mitigation**:
```solidity
// Configurable gas limits per resolver
function _callPrimaryResolverHook(bytes32 integraHash) internal {
    bytes32 resolverId = documents[integraHash].primaryResolverId;
    address resolver = resolverRegistry.getResolver(resolverId);

    if (resolver == address(0)) {
        emit ResolverUnavailable(resolverId, true, integraHash);
        return;
    }

    uint256 gasLimit = resolverGasLimitOverride[resolverId];
    if (gasLimit == 0) {
        gasLimit = DEFAULT_PRIMARY_RESOLVER_GAS;  // 200,000
    }

    // Call with gas limit
    try IDocumentResolver(resolver).onDocumentRegistered{gas: gasLimit}(
        integraHash,
        documents[integraHash].owner,
        documents[integraHash].documentHash,
        processHash
    ) {
        // Success
    } catch {
        revert PrimaryResolverFailed(resolverId, integraHash);
    }
}
```

**Detection**: Transaction reversion with gas limit error
**Impact**: Limited to documents using malicious resolver
**Recovery**: Governor overrides gas limit or deactivates resolver

## Attack Vectors and Mitigations

### Attack Vector Matrix

| Attack | Likelihood | Impact | Mitigation | Status |
|--------|-----------|--------|------------|---------|
| Reentrancy | Low | Critical | ReentrancyGuard | ✅ Implemented |
| Integer Overflow | Low | Critical | Solidity 0.8+ | ✅ Built-in |
| Access Control Bypass | Medium | Critical | Multi-layer checks | ✅ Implemented |
| Front-Running | Medium | Medium | Recipient binding | ✅ Implemented |
| Cross-Chain Replay | Medium | High | Chain ID validation | ✅ Implemented |
| Malicious Upgrade | Medium | Critical | Code hash verification | ✅ Implemented |
| Governance Takeover | Low | Critical | Progressive ossification | ✅ Implemented |
| DOS (Gas) | Medium | Medium | Gas limits | ✅ Implemented |
| DOS (Storage) | Low | Low | Batch size limits | ✅ Implemented |
| Phishing | High | Medium | Education | 🔄 Ongoing |
| Social Engineering | High | Medium | Multisig, timelock | ✅ Implemented |

### Specific Attack Scenarios

#### Scenario 1: Reentrancy via Malicious Tokenizer

```solidity
// ATTACK: Malicious tokenizer attempts reentrancy
contract MaliciousTokenizer {
    IntegraDocumentRegistry public registry;

    function onDocumentRegistered(...) external {
        // Attempt reentrancy
        registry.registerDocument(...);
    }
}

// DEFENSE: ReentrancyGuard prevents reentrancy
contract IntegraDocumentRegistry is ReentrancyGuardUpgradeable {
    function registerDocument(...) external nonReentrant {
        // State changes
        documents[integraHash] = ...;

        // External call (potential reentrancy point)
        _callResolverHook(integraHash);

        // ReentrancyGuard ensures this can't be re-entered
    }
}
```

#### Scenario 2: Storage Collision in Upgrade

```solidity
// ATTACK: Malicious upgrade corrupts storage
contract V2Malicious {
    // Attacker changes storage layout
    address public maliciousVar;  // Overwrites critical storage
    uint256 public var1;           // Wrong position
}

// DEFENSE: Storage gap validation
contract V2Safe {
    // V1 variables (preserved)
    uint256 public var1;
    uint256 public var2;

    // V2 variables (appended)
    uint256 public var3;

    // Gap reduced appropriately
    uint256[47] private __gap;  // Was 48, reduced by 1
}

// Hardhat plugin validates storage layout
await upgrades.validateUpgrade(proxyAddress, V2Factory, {
    kind: "uups",
});
```

## Access Control Implementation

### Role Hierarchy

```
CORE_ADMIN (bit 7)
  └── Has all capabilities
      └── Override for any operation

GOVERNOR_ROLE
  └── Contract governance
      └── Upgrades, configuration, emergency

EMERGENCY_ROLE (time-limited)
  └── Emergency unlock (6 months)
      └── After expiry: Only GOVERNOR

Document Owner
  └── Document-level control
      └── Transfer, executor auth, resolver config

Authorized Executor
  └── Delegated operations
      └── Token operations on behalf of owner

Capability Holders
  └── Operation-specific permissions
      └── CORE_VIEW, CORE_CLAIM, CORE_TRANSFER, etc.
```

### Access Control Patterns

#### Pattern 1: Role-Based Access Control

```solidity
// OpenZeppelin AccessControl for admin operations
modifier onlyRole(bytes32 role) {
    _checkRole(role);
    _;
}

function pause() external onlyRole(GOVERNOR_ROLE) {
    _pause();
}

function setRegistrationFee(uint256 fee) external onlyRole(GOVERNOR_ROLE) {
    require(fee <= MAX_REGISTRATION_FEE, "Fee too high");
    registrationFee = fee;
}
```

#### Pattern 2: Document-Level Access Control

```solidity
// Document owner or authorized executor
modifier requireOwnerOrExecutor(bytes32 integraHash) {
    address owner = documentRegistry.getDocumentOwner(integraHash);
    address executor = documentRegistry.getDocumentExecutor(integraHash);

    if (msg.sender != owner && msg.sender != executor) {
        revert Unauthorized(msg.sender, integraHash);
    }
    _;
}
```

#### Pattern 3: Capability-Based Access Control

```solidity
// Attestation-based capabilities
modifier requiresCapability(
    bytes32 documentHash,
    uint256 requiredCapability,
    bytes calldata attestationProof
) {
    _verifyCapability(msg.sender, documentHash, requiredCapability, attestationProof);
    _;
}

function claimToken(..., bytes32 easUID) external
    requiresCapability(integraHash, NAMESPACE.CORE_CLAIM(), abi.encode(easUID))
{
    // Claim logic
}
```

## Emergency Procedures

### Emergency Response Plan

#### Step 1: Detection

```javascript
// Monitoring script
const documentRegistry = new ethers.Contract(...);

documentRegistry.on("*", (event) => {
    // Check for anomalies
    if (isAnomaly(event)) {
        alertTeam(event);
    }
});
```

#### Step 2: Assessment

```markdown
## Severity Assessment

### Critical (P0)
- Active exploitation
- Funds at risk
- Data corruption
- Examples: Reentrancy attack, governance takeover

Action: Immediate pause

### High (P1)
- Potential exploitation
- Vulnerability discovered
- Examples: Front-running vulnerability, access control bug

Action: Pause within 1 hour

### Medium (P2)
- Edge case bug
- Non-critical functionality affected
- Examples: Gas optimization issue, UI bug

Action: Fix in next upgrade

### Low (P3)
- Cosmetic issue
- Documentation error
- Examples: Event naming, comment typo

Action: Fix when convenient
```

#### Step 3: Pause Contracts

```javascript
// Emergency pause
const governor = new ethers.Wallet(GOVERNOR_PRIVATE_KEY, provider);
const documentRegistry = new ethers.Contract(
    DOCUMENT_REGISTRY_ADDRESS,
    DocumentRegistryABI,
    governor
);

// Pause immediately
const tx = await documentRegistry.pause();
await tx.wait();

console.log("Contracts paused");
```

#### Step 4: Investigation

```bash
# Analyze transactions
cast tx $SUSPICIOUS_TX_HASH

# Trace transaction
cast run $SUSPICIOUS_TX_HASH --trace

# Check state
cast call $DOCUMENT_REGISTRY "paused()(bool)"
```

#### Step 5: Mitigation

```solidity
// Example: Emergency unlock (within 6 months)
function emergencyUnlockResolvers(
    bytes32 integraHash,
    string calldata justification
) external {
    if (block.timestamp < emergencyExpiry) {
        // Emergency address OR governance
        if (msg.sender != emergencyAddress && !hasRole(GOVERNOR_ROLE, msg.sender)) {
            revert UnauthorizedEmergencyUnlock(msg.sender);
        }
    } else {
        // Only governance after expiry
        if (!hasRole(GOVERNOR_ROLE, msg.sender)) {
            revert EmergencyPowersExpired();
        }
    }

    documents[integraHash].resolversLocked = false;

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

#### Step 6: Recovery

```javascript
// Deploy fixed implementation
const V2_Fixed = await ethers.getContractFactory("ContractV2_Fixed");
const v2Fixed = await V2_Fixed.deploy();

// Upgrade
await documentRegistry.connect(governor).upgradeTo(v2Fixed.address);

// Verify upgrade
const newImpl = await upgrades.erc1967.getImplementationAddress(
    documentRegistry.address
);
console.log("Upgraded to:", newImpl);

// Unpause
await documentRegistry.connect(governor).unpause();
```

#### Step 7: Post-Mortem

```markdown
## Incident Post-Mortem

### Incident Summary
- Date: 2024-01-15
- Duration: 2 hours
- Severity: High
- Impact: 10 documents affected

### Root Cause
- Front-running vulnerability in token claim
- Missing recipient validation

### Timeline
- 10:00 AM: Anomaly detected
- 10:05 AM: Contracts paused
- 10:30 AM: Root cause identified
- 11:00 AM: Fix deployed
- 12:00 PM: Contracts unpaused

### Lessons Learned
- Add automated front-running tests
- Enhance monitoring for claim operations
- Improve incident response procedures

### Action Items
- [ ] Add recipient binding validation
- [ ] Implement automated monitoring
- [ ] Update documentation
- [ ] Conduct team training
```

## Audit Checklist

### Pre-Audit Checklist

- [ ] All tests passing (100% coverage)
- [ ] No compiler warnings
- [ ] Slither analysis clean
- [ ] Mythril scan complete
- [ ] Formal verification passed (Tier 1)
- [ ] Documentation complete
- [ ] NatSpec comments comprehensive
- [ ] Code frozen (no changes during audit)

### Audit Scope

```markdown
## Audit Scope

### In Scope
- All Tier 1 contracts (immutable)
- All Tier 2 contracts (ossifiable)
- Sample Tier 3 contracts (upgradeability patterns)

### Out of Scope
- Frontend code
- Backend services
- External dependencies (OpenZeppelin, EAS)

### Focus Areas
1. Access control
2. Reentrancy protection
3. Upgrade safety
4. Code hash verification
5. Emergency controls
6. Progressive ossification
```

### Post-Audit Checklist

- [ ] All critical issues resolved
- [ ] All high issues resolved
- [ ] Medium issues triaged
- [ ] Low issues documented
- [ ] Audit report published
- [ ] Code re-frozen for deployment
- [ ] Final verification passed

## Monitoring and Alerting

### Event Monitoring

```javascript
// Monitor critical events
const events = {
    // Document Registry
    DocumentRegistered: (integraHash, owner, documentHash) => {
        log("Document registered", { integraHash, owner });
    },

    DocumentOwnershipTransferred: (integraHash, from, to, reason) => {
        alert("Ownership transfer", { integraHash, from, to, reason });
    },

    ResolversEmergencyUnlocked: (integraHash, unlocker, justification) => {
        alert("Emergency unlock", { integraHash, unlocker, justification });
    },

    // Governance
    GovernanceStageTransitioned: (from, to, timestamp) => {
        alert("Governance transition", { from, to });
    },

    ContractOssified: (by, timestamp) => {
        alert("Contract ossified", { by });
    },

    // Security
    Paused: (account) => {
        alert("Contract paused", { account });
    },

    Unpaused: (account) => {
        alert("Contract unpaused", { account });
    },
};

// Subscribe to events
for (const [eventName, handler] of Object.entries(events)) {
    documentRegistry.on(eventName, handler);
}
```

### Metrics and Thresholds

```javascript
// Define alert thresholds
const THRESHOLDS = {
    documentsPerHour: 1000,
    transfersPerHour: 100,
    claimsPerHour: 500,
    failedTransactionsPercent: 5,
    gasPrice: 100, // Gwei
};

// Monitor metrics
setInterval(async () => {
    const metrics = await collectMetrics();

    if (metrics.documentsPerHour > THRESHOLDS.documentsPerHour) {
        alert("High registration volume", metrics);
    }

    if (metrics.failedTransactionsPercent > THRESHOLDS.failedTransactionsPercent) {
        alert("High failure rate", metrics);
    }
}, 60_000); // Every minute
```

## Incident Response

### Incident Response Team

- **Incident Commander**: Overall coordination
- **Security Lead**: Technical analysis and mitigation
- **DevOps Lead**: Infrastructure and deployment
- **Communications Lead**: Community and stakeholder updates

### Runbook

```bash
# 1. DETECTION
# Monitor for anomalies
npm run monitor

# 2. ASSESSMENT
# Analyze suspicious transaction
cast tx $TX_HASH --trace

# 3. PAUSE (if critical)
cast send $REGISTRY_ADDRESS "pause()" --private-key $GOVERNOR_KEY

# 4. INVESTIGATE
# Check contract state
cast call $REGISTRY_ADDRESS "paused()(bool)"
cast call $REGISTRY_ADDRESS "currentStage()(uint8)"

# 5. FIX
# Deploy new implementation
forge script script/DeployV2.s.sol --broadcast

# 6. UPGRADE
# Upgrade contract
cast send $REGISTRY_ADDRESS "upgradeTo(address)" $NEW_IMPL --private-key $GOVERNOR_KEY

# 7. VERIFY
# Check upgrade
cast call $REGISTRY_ADDRESS "version()(string)"

# 8. UNPAUSE
cast send $REGISTRY_ADDRESS "unpause()" --private-key $GOVERNOR_KEY

# 9. MONITOR
# Watch for issues
npm run monitor -- --alert-level=high
```

## Best Practices Summary

1. **Use established patterns** (OpenZeppelin contracts)
2. **Implement defense in depth** (multiple security layers)
3. **Validate all inputs** (comprehensive checks)
4. **Follow CEI pattern** (checks, effects, interactions)
5. **Protect against reentrancy** (ReentrancyGuard)
6. **Manage upgrades carefully** (storage gaps, validation)
7. **Monitor continuously** (events, metrics, alerts)
8. **Plan for emergencies** (pause, unlock, incident response)
9. **Document everything** (NatSpec, guides, runbooks)
10. **Audit regularly** (internal and external reviews)

## Next Steps

- [Integration Guide](./integration.md) - Integrate securely
- [Deployment Guide](./deployment.md) - Deploy with security
- [Testing Guide](./testing.md) - Test security properties
- [Migration Guide](./migration.md) - Migrate safely
