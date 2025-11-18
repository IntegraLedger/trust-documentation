# IntegraVerifierRegistryV7_Immutable

## Overview

**Version**: 7.0.0
**Type**: Immutable Contract (Deploy Once, Never Upgrade)
**License**: MIT
**Inherits**: AccessControl

IntegraVerifierRegistryV7_Immutable is an immutable registry for ZK proof verifiers with code integrity verification. It maintains a permanent registry of verifier contracts (Groth16, PLONK, etc.) with security guarantees through code hash validation.

### Purpose

- Maintain registry of ZK proof verifiers (Groth16, PLONK, Poseidon, Merkle)
- Validate verifier code integrity through hash checking
- Enable/disable verifiers without removing them
- Provide enumeration for discovery
- Ensure verifier references remain valid forever

### Key Features

- Code hash validation prevents verifier replacement attacks
- Active/inactive status tracking for emergency stops
- Verifier type categorization (Groth16, PLONK, etc.)
- Code integrity verification on every retrieval
- Metadata updates without affecting verification
- Graceful degradation (returns address(0) if compromised)
- Enumeration support with pagination

## Architecture

### Design Philosophy

**Why Immutable?**

The verifier registry MUST be immutable because:
1. ZK verifier references must remain valid forever
2. Code hash validation logic cannot be manipulated
3. Proof verification must be deterministic across time
4. Historical proofs must remain verifiable

**Security Model**

```
Registration:
1. Verifier contract address provided
2. Verify address is a contract (not EOA)
3. Capture code hash at registration
4. Store verifier info with code hash
5. Emit event with transparency data

Retrieval:
1. Lookup verifier info
2. Check if active
3. Read current code hash from chain
4. Compare with stored hash
5. Return address if valid, address(0) if changed
```

### Integration Points

- **Layer 1+ Contracts**: Use getVerifier() to lookup ZK verifiers
- **ZK Proof Systems**: Verifier contracts registered here
- **Document Contracts**: Reference verifiers for proof validation

## Key Concepts

### 1. Verifier Types

Verifier types are documentation standards:

| Type | Description | Use Case |
|------|-------------|----------|
| Groth16 | Groth16 ZK-SNARK verifier | General-purpose ZK proofs |
| PLONK | PLONK universal verifier | Universal ZK proof system |
| Poseidon | Poseidon hash-based verifier | Hash-based proof validation |
| Merkle | Merkle tree proof verifier | Inclusion proofs |
| Custom | Custom verification logic | Specialized proof systems |

### 2. Code Hash Validation

Identical to AttestationProviderRegistry:

```solidity
// Registration
bytes32 codeHash = extcodehash(verifierAddress);

// Retrieval
bytes32 currentHash = extcodehash(verifierAddress);
if (currentHash != storedHash) {
    return address(0); // Code changed!
}
```

**Protects Against**:
- Verifier contract upgrades that change verification logic
- Malicious replacement of verifier contracts
- CREATE2 address reuse with different code

### 3. Metadata Updates

Unlike provider address and code hash, metadata CAN be updated:

```solidity
function updateVerifierMetadata(
    bytes32 verifierId,
    string calldata newDescription,
    string calldata newVerifierType
) external
```

**Use Cases**:
- Fix typos in descriptions
- Update verifier type categorization
- Add additional context
- Improve documentation

**Security**: Metadata updates don't affect verification logic.

### 4. Graceful Degradation

Returns address(0) instead of reverting if:
- Verifier doesn't exist
- Verifier is deactivated
- Verifier code changed

**Caller Responsibility**:
```solidity
address verifier = verifierRegistry.getVerifier(verifierId);
if (verifier == address(0)) {
    revert VerifierNotAvailable(verifierId);
}
// Safe to use verifier
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

Only governor can register/manage verifiers.

### Verifier Info Struct

```solidity
struct VerifierInfo {
    address verifierAddress;  // Verifier contract address
    bytes32 codeHash;         // Code hash at registration (integrity check)
    bool active;              // Can be deactivated without removal
    uint256 registeredAt;     // Registration timestamp
    string description;       // Human-readable description
    string verifierType;      // Verifier type (e.g., "Groth16", "PLONK")
}
```

### Storage Mappings

```solidity
mapping(bytes32 => VerifierInfo) public verifiers;
```

Main registry mapping verifier ID to verifier info.

```solidity
bytes32[] public verifierIds;
```

Array of all verifier IDs for enumeration.

```solidity
mapping(bytes32 => uint256) private verifierIndex;
```

Index of verifier ID in verifierIds array (index + 1, 0 = not exists).

## Functions

### registerVerifier

```solidity
function registerVerifier(
    bytes32 verifierId,
    address verifier,
    string calldata verifierType,
    string calldata description
) external onlyRole(GOVERNOR_ROLE)
```

Register ZK proof verifier with code integrity tracking.

**Parameters**:
- `verifierId`: Unique identifier (e.g., keccak256("BasicAccessV1Groth16"))
- `verifier`: Contract address of verifier
- `verifierType`: Type of verifier ("Groth16", "PLONK", etc.)
- `description`: Human-readable description

**Verifier ID Naming Convention**:
```
Format: keccak256("<circuit>_<version>_<type>")

Examples:
- keccak256("BasicAccess_V1_Groth16")
- keccak256("DocumentOwnership_V2_PLONK")
- keccak256("IdentityVerification_V1_Poseidon")
```

**Validation**:
1. Verifier address is not zero
2. Verifier ID not already registered
3. Verifier address is a contract (not EOA)
4. Code hash can be captured

**Events**: Emits `VerifierRegistered`

**Errors**:
- `ZeroAddress()`: Verifier address is zero
- `VerifierAlreadyRegistered(verifierId, existingVerifier)`: Duplicate registration
- `NotAContract(verifier)`: Address is not a contract

**Example**:
```solidity
bytes32 verifierId = keccak256("BasicAccess_V1_Groth16");
address verifierContract = 0x123...;

verifierRegistry.registerVerifier(
    verifierId,
    verifierContract,
    "Groth16",
    "BasicAccess Groth16 Verifier V1"
);
```

**Gas Cost**: ~100,000 gas (one-time cost)

### getVerifier

```solidity
function getVerifier(bytes32 verifierId)
    external
    view
    returns (address)
```

Get verifier address with code integrity verification.

**Parameters**:
- `verifierId`: Verifier identifier

**Returns**:
- Verifier address (or address(0) if invalid/inactive)

**Validation Steps**:
1. Check verifier exists
2. Check verifier is active
3. Validate code hash matches registration
4. Return address or address(0)

**Example**:
```solidity
address verifier = verifierRegistry.getVerifier(verifierId);
if (verifier == address(0)) {
    revert VerifierNotFound(verifierId);
}

// Safe to use verifier
bool valid = IVerifier(verifier).verify(proof, publicInputs);
```

**Gas Cost**: ~5,000 gas

### getVerifierInfo

```solidity
function getVerifierInfo(bytes32 verifierId)
    external
    view
    returns (VerifierInfo memory)
```

Get verifier info without integrity check.

**Parameters**:
- `verifierId`: Verifier identifier

**Returns**:
- `VerifierInfo` struct with all verifier details

**Use Case**: Querying verifier details for display/debugging.

### deactivateVerifier

```solidity
function deactivateVerifier(bytes32 verifierId)
    external
    onlyRole(GOVERNOR_ROLE)
```

Deactivate verifier (emergency stop).

**Parameters**:
- `verifierId`: Verifier to deactivate

**Effects**:
- Sets `active = false`
- getVerifier() will return address(0)
- Verifier can be reactivated later

**Use Cases**:
- Verifier bug discovered
- ZK proof system deprecated
- Temporary security concern
- Circuit upgrade needed

**Events**: Emits `VerifierDeactivated`

**Errors**:
- `VerifierNotFound(verifierId)`: Verifier doesn't exist

**Example**:
```solidity
// Security team discovers soundness issue
verifierRegistry.deactivateVerifier(
    keccak256("BasicAccess_V1_Groth16")
);
```

### reactivateVerifier

```solidity
function reactivateVerifier(bytes32 verifierId)
    external
    onlyRole(GOVERNOR_ROLE)
```

Reactivate previously deactivated verifier.

**Parameters**:
- `verifierId`: Verifier to reactivate

**Security**: Verifies code hasn't changed before reactivating.

**Effects**:
- Sets `active = true`
- getVerifier() will return address again

**Events**: Emits `VerifierReactivated`

**Errors**:
- `VerifierNotFound(verifierId)`: Verifier doesn't exist
- `VerifierCodeChanged(verifierId, expectedHash, currentHash)`: Code changed

**Example**:
```solidity
// After deploying fixed verifier
verifierRegistry.reactivateVerifier(verifierId);
```

### updateVerifierMetadata

```solidity
function updateVerifierMetadata(
    bytes32 verifierId,
    string calldata newDescription,
    string calldata newVerifierType
) external onlyRole(GOVERNOR_ROLE)
```

Update verifier metadata (description and type).

**Parameters**:
- `verifierId`: Verifier to update
- `newDescription`: New description (must not be empty)
- `newVerifierType`: New verifier type (must not be empty)

**Effects**:
- Updates description and verifierType
- Does NOT affect verifierAddress or codeHash

**Events**: Emits `VerifierMetadataUpdated`

**Errors**:
- `VerifierNotFound(verifierId)`: Verifier doesn't exist
- `EmptyDescription()`: Description is empty
- `EmptyVerifierType()`: Verifier type is empty

**Example**:
```solidity
verifierRegistry.updateVerifierMetadata(
    verifierId,
    "BasicAccess Groth16 Verifier V1 (Optimized)",
    "Groth16-Optimized"
);
```

### Enumeration Functions

```solidity
function getVerifierCount() external view returns (uint256)
```

Get total number of registered verifiers.

```solidity
function getVerifierIdAt(uint256 index) external view returns (bytes32)
```

Get verifier ID at specific index.

```solidity
function getAllVerifierIds() external view returns (bytes32[] memory)
```

Get all verifier IDs. **Warning**: Gas-intensive for large registries.

```solidity
function getVerifierIdsPaginated(uint256 offset, uint256 limit)
    external
    view
    returns (bytes32[] memory)
```

Get paginated list of verifier IDs.

**Example**:
```solidity
// Iterate through all verifiers in pages of 10
uint256 count = verifierRegistry.getVerifierCount();
for (uint256 i = 0; i < count; i += 10) {
    bytes32[] memory page = verifierRegistry.getVerifierIdsPaginated(i, 10);
    // Process page...
}
```

### getVersion

```solidity
function getVersion() external pure returns (string memory)
```

Get contract version.

**Returns**: "7.0.0"

## Events

### VerifierRegistered

```solidity
event VerifierRegistered(
    bytes32 indexed verifierId,
    address indexed verifier,
    bytes32 codeHash,
    string verifierType,
    string description,
    uint256 timestamp
)
```

Emitted when a verifier is registered.

### VerifierDeactivated

```solidity
event VerifierDeactivated(
    bytes32 indexed verifierId,
    address indexed verifier,
    uint256 timestamp
)
```

Emitted when a verifier is deactivated.

### VerifierReactivated

```solidity
event VerifierReactivated(
    bytes32 indexed verifierId,
    address indexed verifier,
    uint256 timestamp
)
```

Emitted when a verifier is reactivated.

### VerifierMetadataUpdated

```solidity
event VerifierMetadataUpdated(
    bytes32 indexed verifierId,
    string newDescription,
    string newVerifierType,
    uint256 timestamp
)
```

Emitted when verifier metadata is updated.

## Security Considerations

### ZK Verifier Security

**Critical Properties**:
1. **Soundness**: Verifier only accepts valid proofs
2. **Completeness**: Verifier accepts all valid proofs
3. **Determinism**: Same proof always produces same result
4. **No Malleability**: Proof cannot be modified while remaining valid

**Registry Protection**:
- Code hash validation ensures verifier logic doesn't change
- Deactivation mechanism for emergency response
- Immutable registry prevents manipulation

### Verifier Deployment Best Practices

**Pre-Registration Checklist**:
- [ ] Verifier circuit has been audited
- [ ] Trusted setup ceremony completed (for Groth16)
- [ ] Verifier contract has been formally verified
- [ ] Test vectors validate soundness and completeness
- [ ] Gas costs are acceptable
- [ ] Verifier deployment is deterministic

**Example Secure Deployment**:
```solidity
// 1. Generate verifier from circuit (off-chain)
// snarkjs generateverifier

// 2. Deploy verifier
Verifier verifier = new Verifier();

// 3. Test verifier with known proofs
require(verifier.verify(validProof, validInputs), "Valid proof failed");
require(!verifier.verify(invalidProof, validInputs), "Invalid proof accepted");

// 4. Register in registry
bytes32 id = keccak256("MyCircuit_V1_Groth16");
verifierRegistry.registerVerifier(
    id,
    address(verifier),
    "Groth16",
    "MyCircuit Groth16 Verifier V1 - Audited"
);
```

### Code Hash Limitations

**What Code Hash Validates**:
- Verifier bytecode hasn't changed
- Contract at address is the same contract

**What Code Hash Doesn't Validate**:
- Correctness of verification logic
- Soundness of underlying circuit
- Trusted setup parameters (for Groth16)
- Gas optimization quality

**Additional Validation Needed**:
1. Circuit audits
2. Formal verification
3. Test vector validation
4. Trusted setup verification

### Circuit Version Management

**Best Practices**:

1. **Version in Verifier ID**:
   ```solidity
   bytes32 v1 = keccak256("BasicAccess_V1_Groth16");
   bytes32 v2 = keccak256("BasicAccess_V2_Groth16");
   ```

2. **Deprecation Path**:
   ```solidity
   // Deactivate old version
   verifierRegistry.deactivateVerifier(v1);

   // Register new version
   verifierRegistry.registerVerifier(v2, newVerifier, ...);
   ```

3. **Migration Period**:
   - Keep old verifier active during migration
   - Support both versions in contracts
   - Monitor usage of old version
   - Deactivate when usage drops to zero

## Usage Examples

### Basic Registration

```solidity
// Deploy registry
IntegraVerifierRegistryV7_Immutable registry =
    new IntegraVerifierRegistryV7_Immutable(governorAddress);

// Deploy Groth16 verifier
Groth16Verifier verifier = new Groth16Verifier();

// Register verifier
bytes32 verifierId = keccak256("BasicAccess_V1_Groth16");
registry.registerVerifier(
    verifierId,
    address(verifier),
    "Groth16",
    "BasicAccess Groth16 Verifier V1"
);
```

### Proof Verification

```solidity
contract DocumentContract {
    IntegraVerifierRegistryV7_Immutable public verifierRegistry;
    bytes32 public defaultVerifierId;

    function verifyOwnershipProof(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[1] calldata input
    ) external view returns (bool) {
        // Get verifier from registry
        address verifier = verifierRegistry.getVerifier(defaultVerifierId);

        if (verifier == address(0)) {
            revert VerifierNotAvailable(defaultVerifierId);
        }

        // Verify proof
        return IGroth16Verifier(verifier).verifyProof(a, b, c, input);
    }
}
```

### Multi-Version Support

```solidity
contract FlexibleVerification {
    IntegraVerifierRegistryV7_Immutable public verifierRegistry;

    mapping(bytes32 => bytes32[]) public documentVerifiers; // doc => verifier versions

    function verifyWithAnyVersion(
        bytes32 documentHash,
        bytes32 preferredVerifierId,
        bytes calldata proof
    ) external view returns (bool) {
        bytes32[] memory verifierIds = documentVerifiers[documentHash];

        // Try preferred version first
        address verifier = verifierRegistry.getVerifier(preferredVerifierId);
        if (verifier != address(0)) {
            if (tryVerify(verifier, proof)) {
                return true;
            }
        }

        // Try other versions
        for (uint256 i = 0; i < verifierIds.length; i++) {
            if (verifierIds[i] == preferredVerifierId) continue;

            verifier = verifierRegistry.getVerifier(verifierIds[i]);
            if (verifier != address(0)) {
                if (tryVerify(verifier, proof)) {
                    return true;
                }
            }
        }

        return false;
    }

    function tryVerify(address verifier, bytes calldata proof)
        internal
        view
        returns (bool)
    {
        // Attempt verification, catch failures
        try IVerifier(verifier).verify(proof) returns (bool valid) {
            return valid;
        } catch {
            return false;
        }
    }
}
```

### Verifier Discovery

```solidity
function listActiveGroth16Verifiers()
    external
    view
    returns (VerifierInfo[] memory)
{
    uint256 count = verifierRegistry.getVerifierCount();
    VerifierInfo[] memory groth16 = new VerifierInfo[](count);
    uint256 groth16Count = 0;

    for (uint256 i = 0; i < count; i++) {
        bytes32 id = verifierRegistry.getVerifierIdAt(i);
        VerifierInfo memory info = verifierRegistry.getVerifierInfo(id);

        if (info.active &&
            keccak256(bytes(info.verifierType)) == keccak256(bytes("Groth16"))) {
            groth16[groth16Count] = info;
            groth16Count++;
        }
    }

    // Trim array
    assembly {
        mstore(groth16, groth16Count)
    }

    return groth16;
}
```

## Integration Guide

### Deployment

```solidity
// 1. Deploy registry
IntegraVerifierRegistryV7_Immutable registry =
    new IntegraVerifierRegistryV7_Immutable(governorAddress);

// 2. Verify deployment
require(
    keccak256(bytes(registry.getVersion())) == keccak256(bytes("7.0.0")),
    "Invalid version"
);

// 3. Save address
saveDeployment("IntegraVerifierRegistry", address(registry));
```

### Integration in Contracts

```solidity
import "./IntegraVerifierRegistryV7_Immutable.sol";

contract MyContract {
    IntegraVerifierRegistryV7_Immutable public immutable VERIFIER_REGISTRY;
    bytes32 public defaultVerifierId;

    constructor(address _verifierRegistry) {
        VERIFIER_REGISTRY = IntegraVerifierRegistryV7_Immutable(_verifierRegistry);
    }

    function setDefaultVerifier(bytes32 verifierId) external onlyOwner {
        // Validate verifier exists and is active
        address verifier = VERIFIER_REGISTRY.getVerifier(verifierId);
        require(verifier != address(0), "Invalid verifier");

        defaultVerifierId = verifierId;
    }

    function verify(bytes calldata proof) external view returns (bool) {
        address verifier = VERIFIER_REGISTRY.getVerifier(defaultVerifierId);
        require(verifier != address(0), "Verifier not available");

        return IVerifier(verifier).verify(proof);
    }
}
```

### Testing

```javascript
const Registry = await ethers.getContractFactory("IntegraVerifierRegistryV7_Immutable");
const registry = await Registry.deploy(governor.address);

const Verifier = await ethers.getContractFactory("Groth16Verifier");
const verifier = await Verifier.deploy();

// Register verifier
const verifierId = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("TestCircuit_V1_Groth16")
);
await registry.connect(governor).registerVerifier(
    verifierId,
    verifier.address,
    "Groth16",
    "Test Groth16 Verifier"
);

// Verify registration
const addr = await registry.getVerifier(verifierId);
expect(addr).to.equal(verifier.address);

// Test metadata update
await registry.connect(governor).updateVerifierMetadata(
    verifierId,
    "Test Groth16 Verifier (Updated)",
    "Groth16-Optimized"
);
```

## References

- [Layer 0 Overview](./overview.md)
- [AttestationProviderRegistryV7_Immutable](./AttestationProviderRegistryV7_Immutable.md)
- [CapabilityNamespaceV7_Immutable](./CapabilityNamespaceV7_Immutable.md)
