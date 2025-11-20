# CapabilityNamespace_Immutable

## Overview

**Version**: 7.0.0
**Type**: Immutable Contract (Deploy Once, Never Upgrade)
**License**: MIT

CapabilityNamespace_Immutable provides permanent capability bit position definitions and role templates for the Integra ecosystem. This contract establishes a 256-bit organized namespace where each bit represents a specific permission or capability.

### Purpose

- Define permanent, immutable capability bit positions (0-255)
- Provide role templates composed of multiple capabilities
- Offer utility functions for capability manipulation
- Ensure capability meanings never change across contracts or time

### Key Features

- 256-bit organized namespace with tier-based organization
- Pre-defined role templates (VIEWER, PARTICIPANT, MANAGER, ADMIN)
- Pure functions for gas-efficient capability checking
- Formally verifiable bitwise operations
- Reserved bits for future expansion

## Architecture

### Design Philosophy

**Why Immutable?**

The capability namespace MUST be immutable because:
1. Changing capability meanings breaks all existing attestations
2. Contracts across different chains must use consistent definitions
3. Users need mathematical certainty about permission semantics
4. Historical attestations must remain valid indefinitely

**Namespace Organization**

The 256-bit space is organized into tiers:

```
Bits 0-7     (8 bits):   Core Capabilities
Bits 8-15    (8 bits):   Document Operations
Bits 16-23   (8 bits):   Financial Operations
Bits 24-31   (8 bits):   Governance Operations
Bits 32-127  (96 bits):  Reserved Tier 4-15
Bits 128-255 (128 bits): Reserved for Protocol Extensions
```

### Integration Points

- **AttestationAccessControl**: Uses hasCapability() for permission checks
- **EASAttestationProvider**: Returns capability bitmasks matching this namespace
- **All Layer 1+ Contracts**: Reference capability constants from this contract

## Key Concepts

### 1. Capability Bitmask

Capabilities are represented as a 256-bit integer where each bit position has a specific meaning:

```
Capability = 1 << bitPosition

Examples:
CORE_VIEW     = 1 << 0  = 0b00000001 (bit 0 set)
CORE_CLAIM    = 1 << 1  = 0b00000010 (bit 1 set)
CORE_TRANSFER = 1 << 2  = 0b00000100 (bit 2 set)
```

### 2. Capability Composition

Multiple capabilities can be combined using bitwise OR:

```
ROLE_PARTICIPANT = CORE_VIEW | CORE_CLAIM | CORE_TRANSFER | FIN_REQUEST_PAYMENT
                 = (1 << 0) | (1 << 1) | (1 << 2) | (1 << 16)
                 = 0b00000000000000010000000000000111
```

### 3. Admin Override

The CORE_ADMIN capability (bit 7) grants all permissions:

```
CORE_ADMIN = 1 << 7

If (granted & CORE_ADMIN) != 0:
    User has all capabilities (bits 0-127)
```

### 4. Role Templates

Pre-defined role templates for common permission sets:

| Role | Capabilities | Use Case |
|------|-------------|----------|
| VIEWER | VIEW only | Read-only access |
| PARTICIPANT | VIEW, CLAIM, TRANSFER, REQUEST_PAYMENT | Basic interaction |
| MANAGER | PARTICIPANT + UPDATE, APPROVE_PAYMENT, SIGN, WITNESS | Operational management |
| ADMIN | All bits 0-127 | Full administrative control |

## State Variables

### Version

```solidity
string public constant VERSION = "7.0.0"
```

Contract version following semantic versioning.

### Core Capabilities (Bits 0-7)

```solidity
uint256 public constant CORE_VIEW = 1 << 0;        // View document details
uint256 public constant CORE_CLAIM = 1 << 1;       // Claim reserved tokens
uint256 public constant CORE_TRANSFER = 1 << 2;    // Transfer token ownership
uint256 public constant CORE_UPDATE = 1 << 3;      // Update document metadata
uint256 public constant CORE_DELEGATE = 1 << 4;    // Delegate capabilities
uint256 public constant CORE_REVOKE = 1 << 5;      // Revoke access
uint256 public constant CORE_RESERVED_1 = 1 << 6;  // Reserved for future use
uint256 public constant CORE_ADMIN = 1 << 7;       // Full admin rights
```

### Document Operations (Bits 8-15)

```solidity
uint256 public constant DOC_SIGN = 1 << 8;       // Sign documents
uint256 public constant DOC_WITNESS = 1 << 9;    // Witness signatures
uint256 public constant DOC_NOTARIZE = 1 << 10;  // Notarize documents
uint256 public constant DOC_VERIFY = 1 << 11;    // Verify authenticity
uint256 public constant DOC_AMEND = 1 << 12;     // Amend content
uint256 public constant DOC_ARCHIVE = 1 << 13;   // Archive documents
uint256 public constant DOC_RESERVED_1 = 1 << 14; // Reserved
uint256 public constant DOC_RESERVED_2 = 1 << 15; // Reserved
```

### Financial Operations (Bits 16-23)

```solidity
uint256 public constant FIN_REQUEST_PAYMENT = 1 << 16;  // Request payments
uint256 public constant FIN_APPROVE_PAYMENT = 1 << 17;  // Approve payments
uint256 public constant FIN_EXECUTE_PAYMENT = 1 << 18;  // Execute payments
uint256 public constant FIN_CANCEL_PAYMENT = 1 << 19;   // Cancel payments
uint256 public constant FIN_WITHDRAW = 1 << 20;         // Withdraw funds
uint256 public constant FIN_DEPOSIT = 1 << 21;          // Deposit funds
uint256 public constant FIN_RESERVED_1 = 1 << 22;       // Reserved
uint256 public constant FIN_RESERVED_2 = 1 << 23;       // Reserved
```

### Governance Operations (Bits 24-31)

```solidity
uint256 public constant GOV_PROPOSE = 1 << 24;         // Propose actions
uint256 public constant GOV_VOTE = 1 << 25;            // Vote on proposals
uint256 public constant GOV_EXECUTE = 1 << 26;         // Execute proposals
uint256 public constant GOV_VETO = 1 << 27;            // Veto proposals
uint256 public constant GOV_DELEGATE_VOTE = 1 << 28;   // Delegate voting power
uint256 public constant GOV_RESERVED_1 = 1 << 29;      // Reserved
uint256 public constant GOV_RESERVED_2 = 1 << 30;      // Reserved
uint256 public constant GOV_RESERVED_3 = 1 << 31;      // Reserved
```

### Role Templates

```solidity
uint256 public constant ROLE_VIEWER = CORE_VIEW;
uint256 public constant ROLE_PARTICIPANT = CORE_VIEW | CORE_CLAIM | CORE_TRANSFER | FIN_REQUEST_PAYMENT;
uint256 public constant ROLE_MANAGER = ROLE_PARTICIPANT | CORE_UPDATE | FIN_APPROVE_PAYMENT | DOC_SIGN | DOC_WITNESS;
uint256 public constant ROLE_ADMIN = (1 << 128) - 1; // All bits 0-127 set
```

## Functions

### hasCapability

```solidity
function hasCapability(uint256 granted, uint256 required)
    external
    pure
    returns (bool)
```

Check if granted capabilities include required capability.

**Parameters**:
- `granted`: Granted capabilities bitmask
- `required`: Required capability bitmask

**Returns**:
- `bool`: Whether required capability is granted

**Algorithm**:
```
1. Check if CORE_ADMIN bit is set in granted
   → If yes, return true (admin override)
2. Otherwise, check if all required bits are set in granted
   → Return (granted & required) == required
```

**Gas Cost**: ~500 gas (pure function, no storage access)

**Examples**:
```solidity
// User has PARTICIPANT role
uint256 granted = ROLE_PARTICIPANT;

// Check if user can claim
bool canClaim = NAMESPACE.hasCapability(granted, CORE_CLAIM); // true

// Check if user can approve payments
bool canApprove = NAMESPACE.hasCapability(granted, FIN_APPROVE_PAYMENT); // false

// Admin can do anything
uint256 adminGranted = CORE_ADMIN;
bool adminClaim = NAMESPACE.hasCapability(adminGranted, CORE_CLAIM); // true (admin override)
```

### composeCapabilities

```solidity
function composeCapabilities(uint256[] calldata capabilities)
    external
    pure
    returns (uint256)
```

Compose multiple capabilities into a single bitmask.

**Parameters**:
- `capabilities`: Array of capability bits to combine

**Returns**:
- `uint256`: Combined capability bitmask

**Algorithm**:
```
result = 0
for each capability in capabilities:
    result = result | capability
return result
```

**Gas Cost**: ~300 + (100 * array length) gas

**Examples**:
```solidity
uint256[] memory caps = new uint256[](3);
caps[0] = CORE_VIEW;
caps[1] = CORE_CLAIM;
caps[2] = CORE_TRANSFER;

uint256 composed = NAMESPACE.composeCapabilities(caps);
// Result: CORE_VIEW | CORE_CLAIM | CORE_TRANSFER
```

### addCapability

```solidity
function addCapability(uint256 current, uint256 toAdd)
    external
    pure
    returns (uint256)
```

Add capability to existing set.

**Parameters**:
- `current`: Current capabilities
- `toAdd`: Capability to add

**Returns**:
- `uint256`: Updated capabilities

**Examples**:
```solidity
uint256 caps = CORE_VIEW;
caps = NAMESPACE.addCapability(caps, CORE_CLAIM);
// Result: CORE_VIEW | CORE_CLAIM
```

### removeCapability

```solidity
function removeCapability(uint256 current, uint256 toRemove)
    external
    pure
    returns (uint256)
```

Remove capability from existing set.

**Parameters**:
- `current`: Current capabilities
- `toRemove`: Capability to remove

**Returns**:
- `uint256`: Updated capabilities

**Algorithm**:
```
return current & ~toRemove  // Bitwise AND with complement
```

**Examples**:
```solidity
uint256 caps = ROLE_PARTICIPANT; // VIEW | CLAIM | TRANSFER | REQUEST_PAYMENT
caps = NAMESPACE.removeCapability(caps, CORE_CLAIM);
// Result: VIEW | TRANSFER | REQUEST_PAYMENT (CLAIM removed)
```

### hasAnyCapability

```solidity
function hasAnyCapability(uint256 capabilities)
    external
    pure
    returns (bool)
```

Check if any capabilities are set.

**Parameters**:
- `capabilities`: Capability bitmask

**Returns**:
- `bool`: Whether any capabilities are set

**Examples**:
```solidity
bool hasAny = NAMESPACE.hasAnyCapability(CORE_VIEW); // true
bool none = NAMESPACE.hasAnyCapability(0); // false
```

### isAdmin

```solidity
function isAdmin(uint256 capabilities)
    external
    pure
    returns (bool)
```

Check if admin flag is set.

**Parameters**:
- `capabilities`: Capability bitmask

**Returns**:
- `bool`: Whether CORE_ADMIN is set

**Examples**:
```solidity
bool admin = NAMESPACE.isAdmin(CORE_ADMIN); // true
bool notAdmin = NAMESPACE.isAdmin(ROLE_PARTICIPANT); // false
```

### isStandardCapability

```solidity
function isStandardCapability(uint256 capability)
    external
    pure
    returns (bool)
```

Check if capability is a standard single-bit capability (bits 0-31).

**Parameters**:
- `capability`: Capability to check

**Returns**:
- `bool`: Whether capability is standard (single bit, positions 0-31)

**Algorithm**:
```
1. Check if exactly one bit is set: (capability & (capability - 1)) == 0
2. Check if bit is in range 0-31: capability <= (1 << 31)
3. Check if non-zero: capability != 0
```

**Examples**:
```solidity
bool standard = NAMESPACE.isStandardCapability(CORE_CLAIM); // true (1 << 1)
bool notStandard = NAMESPACE.isStandardCapability(ROLE_PARTICIPANT); // false (multiple bits)
bool outOfRange = NAMESPACE.isStandardCapability(1 << 32); // false (bit 32)
```

### isCompositeCapability

```solidity
function isCompositeCapability(uint256 capabilities)
    external
    pure
    returns (bool)
```

Check if capability bitmask contains multiple capabilities.

**Parameters**:
- `capabilities`: Capability bitmask to check

**Returns**:
- `bool`: Whether multiple capabilities are set

**Algorithm**:
```
return capabilities != 0 && (capabilities & (capabilities - 1)) != 0
```

**Examples**:
```solidity
bool composite = NAMESPACE.isCompositeCapability(ROLE_PARTICIPANT); // true
bool single = NAMESPACE.isCompositeCapability(CORE_CLAIM); // false
```

### Enumeration Functions

```solidity
function getCoreCapabilities() external pure returns (uint256[8] memory)
function getDocumentCapabilities() external pure returns (uint256[8] memory)
function getFinancialCapabilities() external pure returns (uint256[8] memory)
function getGovernanceCapabilities() external pure returns (uint256[8] memory)
```

Get all capability constants for a tier.

**Returns**: Array of 8 capability values for the tier

**Examples**:
```solidity
uint256[8] memory core = NAMESPACE.getCoreCapabilities();
// [CORE_VIEW, CORE_CLAIM, CORE_TRANSFER, CORE_UPDATE,
//  CORE_DELEGATE, CORE_REVOKE, CORE_RESERVED_1, CORE_ADMIN]
```

### getRoleTemplates

```solidity
function getRoleTemplates()
    external
    pure
    returns (
        uint256 viewer,
        uint256 participant,
        uint256 manager,
        uint256 admin
    )
```

Get all role template constants.

**Returns**:
- `viewer`: ROLE_VIEWER bitmask
- `participant`: ROLE_PARTICIPANT bitmask
- `manager`: ROLE_MANAGER bitmask
- `admin`: ROLE_ADMIN bitmask

### getVersion

```solidity
function getVersion() external pure returns (string memory)
```

Get contract version.

**Returns**: Semantic version string ("7.0.0")

## Events

No events (stateless utility contract).

## Security Considerations

### Immutability Guarantees

1. **Deploy Once**: Contract has no storage and cannot be upgraded
2. **Permanent Definitions**: Capability bit positions never change
3. **Cross-Contract Consistency**: All contracts reference same namespace
4. **Time-Invariant**: Meanings remain constant forever

### Bitwise Operation Safety

1. **No Overflow**: All operations use bitwise logic (no arithmetic)
2. **Bounded Domain**: 256-bit maximum ensures no overflow possible
3. **Formally Verifiable**: Pure functions enable formal verification
4. **Gas Efficient**: Bitwise operations are cheapest EVM operations

### Admin Override Risks

The CORE_ADMIN capability (bit 7) grants all permissions. When granting admin:

1. **Verify Recipient**: Ensure admin goes to trusted address
2. **Audit Trail**: Log all admin grants in attestations
3. **Time Limits**: Consider time-bound admin attestations
4. **Revocation Plan**: Have process to revoke admin if compromised

### Future Expansion

1. **Reserved Bits**: Bits 32-255 reserved for future capabilities
2. **Backward Compatible**: New capabilities won't affect existing logic
3. **Coordinated Rollout**: New bits require ecosystem-wide adoption
4. **Documentation**: Update docs when activating reserved bits

## Usage Examples

### Basic Capability Checking

```solidity
contract MyContract {
    CapabilityNamespace_Immutable public NAMESPACE;

    function requireClaim(uint256 userCapabilities) public view {
        require(
            NAMESPACE.hasCapability(userCapabilities, NAMESPACE.CORE_CLAIM()),
            "User cannot claim"
        );
    }
}
```

### Composing Custom Roles

```solidity
// Create a custom "Signer" role
uint256 signerRole = NAMESPACE.CORE_VIEW()
                   | NAMESPACE.DOC_SIGN()
                   | NAMESPACE.DOC_WITNESS();

// Or use composeCapabilities
uint256[] memory caps = new uint256[](3);
caps[0] = NAMESPACE.CORE_VIEW();
caps[1] = NAMESPACE.DOC_SIGN();
caps[2] = NAMESPACE.DOC_WITNESS();

uint256 composedRole = NAMESPACE.composeCapabilities(caps);
```

### Dynamic Capability Management

```solidity
contract CapabilityManager {
    CapabilityNamespace_Immutable public NAMESPACE;
    mapping(address => uint256) public userCapabilities;

    function grantCapability(address user, uint256 capability) external {
        userCapabilities[user] = NAMESPACE.addCapability(
            userCapabilities[user],
            capability
        );
    }

    function revokeCapability(address user, uint256 capability) external {
        userCapabilities[user] = NAMESPACE.removeCapability(
            userCapabilities[user],
            capability
        );
    }
}
```

### Admin Check Pattern

```solidity
function checkPermission(address user, uint256 required) public view returns (bool) {
    uint256 granted = getUserCapabilities(user);

    // Admin override
    if (NAMESPACE.isAdmin(granted)) {
        return true;
    }

    // Standard capability check
    return NAMESPACE.hasCapability(granted, required);
}
```

## Integration Guide

### Deployment

1. **Deploy Contract**:
   ```solidity
   CapabilityNamespace_Immutable namespace = new CapabilityNamespace_Immutable();
   ```

2. **Verify Deployment**:
   ```solidity
   require(
       keccak256(bytes(namespace.getVersion())) == keccak256(bytes("7.0.0")),
       "Invalid version"
   );
   ```

3. **Save Address**: Record contract address in deployment config

### Integration in Other Contracts

```solidity
import "./CapabilityNamespace_Immutable.sol";

contract MyContract {
    CapabilityNamespace_Immutable public immutable NAMESPACE;

    constructor(address _namespace) {
        NAMESPACE = CapabilityNamespace_Immutable(_namespace);
    }

    function checkAccess(uint256 userCaps) internal view returns (bool) {
        return NAMESPACE.hasCapability(userCaps, NAMESPACE.CORE_VIEW());
    }
}
```

### Testing

```javascript
const CapabilityNamespace = await ethers.getContractFactory("CapabilityNamespace_Immutable");
const namespace = await CapabilityNamespace.deploy();

// Test capability checking
const granted = await namespace.ROLE_PARTICIPANT();
const required = await namespace.CORE_CLAIM();
const hasIt = await namespace.hasCapability(granted, required);
expect(hasIt).to.equal(true);

// Test admin override
const adminGranted = await namespace.CORE_ADMIN();
const canDoAnything = await namespace.hasCapability(adminGranted, required);
expect(canDoAnything).to.equal(true);
```

## Gas Optimization Tips

1. **Cache Capability Constants**: Load once and reuse
   ```solidity
   uint256 constant CLAIM = NAMESPACE.CORE_CLAIM(); // Wrong - not allowed

   // Instead, cache in storage if used frequently
   uint256 public claimCap;
   constructor() {
       claimCap = NAMESPACE.CORE_CLAIM();
   }
   ```

2. **Use Inline Checks**: For single checks, inline bitwise ops
   ```solidity
   // Less gas
   if ((granted & required) == required || (granted & CORE_ADMIN) != 0) {
       // ...
   }

   // More gas (external call)
   if (NAMESPACE.hasCapability(granted, required)) {
       // ...
   }
   ```

3. **Batch Composition**: Compose once, use many times
   ```solidity
   uint256 managerRole = NAMESPACE.ROLE_MANAGER(); // Compose once
   // Use managerRole multiple times
   ```

## References

- [Layer 0 Overview](./overview.md)
- [AttestationAccessControl](./AttestationAccessControl.md)
- [EASAttestationProvider](./EASAttestationProvider.md)
