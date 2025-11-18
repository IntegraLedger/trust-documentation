# IAttestationProvider

## Overview

**Version**: 7.0.0
**Type**: Interface
**License**: MIT

IAttestationProvider is the standard interface for attestation providers in the Integra V7 architecture. It provides abstraction for different attestation systems (EAS, VC, ZK, DIDs) while maintaining a consistent verification API.

### Purpose

- Define standard interface for all attestation providers
- Enable provider abstraction in AttestationAccessControlV7
- Support multiple attestation methods without contract changes
- Provide minimal, focused interface for capability verification
- Allow extensibility through optional methods

### Key Features

- Minimal interface (only essential methods required)
- Provider-agnostic design (works with any attestation system)
- Backward compatible with EASAttestationProviderV7
- Extensibility through supportsMethod() pattern
- Clear separation between required and optional methods

## Architecture

### Design Philosophy

**Minimal Interface Principle**

The interface includes ONLY what's necessary for capability verification:
1. `verifyCapabilities()` - Core verification method
2. `getProviderInfo()` - Provider metadata
3. `supportsMethod()` - Feature discovery

**Why Minimal?**

- Easier to implement new providers
- Reduces coupling between layers
- Allows provider-specific optimizations
- Simplifies formal verification

**Provider Pattern**

```
AttestationAccessControlV7 (Base Layer)
    ↓ Routes to provider
IAttestationProvider (Interface)
    ↓ Implemented by
EASAttestationProviderV7, VCProvider, ZKProvider, etc.
```

### Integration Points

- **AttestationAccessControlV7**: Calls verifyCapabilities()
- **AttestationProviderRegistry**: Registers implementations
- **Provider Implementations**: EAS, VC, ZK, DID, JWT providers

## Key Concepts

### 1. Provider Abstraction

Different attestation systems have different proof formats:

| Provider Type | Proof Format | Example |
|---------------|--------------|---------|
| EAS | `abi.encode(attestationUID)` | 32 bytes |
| VC | `abi.encode(credentialJSON, signature)` | Variable |
| ZK | `abi.encode(publicSignals, proof)` | Variable |
| JWT | `abi.encode(token)` | Variable |
| DID | `abi.encode(did, presentation)` | Variable |

**Interface Handles All**:

```solidity
function verifyCapabilities(
    bytes calldata proof,  // Provider-specific format
    address recipient,
    bytes32 documentHash,
    uint256 requiredCapability
) external view returns (bool verified, uint256 grantedCapabilities);
```

### 2. Capability Bitmask

Providers return capabilities as bitmask matching CapabilityNamespaceV7:

```solidity
uint256 capabilities = CORE_VIEW | CORE_CLAIM | CORE_TRANSFER;

// Provider returns
return (true, capabilities);

// Caller checks
require(NAMESPACE.hasCapability(capabilities, requiredCapability));
```

### 3. Feature Discovery

Providers can support optional methods:

```solidity
// Check if provider supports batch verification
if (provider.supportsMethod(keccak256("batchVerify"))) {
    // Use batch verification
    (bool success, bytes memory result) = provider.call(
        abi.encodeWithSignature("batchVerify(...)")
    );
} else {
    // Fall back to individual verification
    for (...) {
        provider.verifyCapabilities(...);
    }
}
```

**Optional Methods** (examples):
- `keccak256("issueAttestation")` - Can issue attestations
- `keccak256("revokeAttestation")` - Can revoke attestations
- `keccak256("batchVerify")` - Supports batch verification
- `keccak256("offChainVerify")` - Supports off-chain verification

### 4. Security Requirements

All implementations MUST:
1. Verify proof authenticity
2. Bind proof to recipient (prevent replay)
3. Bind proof to documentHash (prevent misuse)
4. Check revocation status
5. Check expiration
6. Return deterministic results

## Functions

### verifyCapabilities

```solidity
function verifyCapabilities(
    bytes calldata proof,
    address recipient,
    bytes32 documentHash,
    uint256 requiredCapability
) external view returns (bool verified, uint256 grantedCapabilities);
```

Verify capabilities for a user on a document.

**Parameters**:
- `proof`: Provider-specific proof data (attestation UID, credential, ZK proof, etc.)
- `recipient`: Address that should have the capabilities
- `documentHash`: Document identifier (integraHash)
- `requiredCapability`: Required capability (for provider-specific optimizations)

**Returns**:
- `verified`: Whether proof is authentic and valid
- `grantedCapabilities`: Bitmask of granted capabilities

**Verification Process** (provider-specific):
1. Provider decodes proof based on their attestation format
2. Provider validates proof authenticity
3. Provider extracts capabilities from proof
4. Provider returns (verified, capabilities)

**Security Requirements**:

| Requirement | Description | Example |
|-------------|-------------|---------|
| Authenticity | Proof must be valid | EAS: Check attestation exists |
| Recipient Binding | Proof must be for recipient | EAS: attestation.recipient == user |
| Document Binding | Proof must be for document | EAS: attestedDocHash == documentHash |
| Revocation Check | Proof must not be revoked | EAS: attestation.revocationTime == 0 |
| Expiration Check | Proof must not be expired | EAS: expirationTime == 0 or > now |

**Example Implementations**:

**EAS Provider**:
```solidity
function verifyCapabilities(
    bytes calldata proof,
    address recipient,
    bytes32 documentHash,
    uint256 requiredCapability
) external view returns (bool, uint256) {
    bytes32 attestationUID = abi.decode(proof, (bytes32));

    Attestation memory att = eas.getAttestation(attestationUID);

    // Verify attestation
    require(att.uid != 0, "Not found");
    require(att.revocationTime == 0, "Revoked");
    require(att.recipient == recipient, "Wrong recipient");

    // Decode capabilities
    (bytes32 docHash, , uint256 caps, ...) = abi.decode(att.data, (...));
    require(docHash == documentHash, "Wrong document");

    return (true, caps);
}
```

**VC Provider**:
```solidity
function verifyCapabilities(
    bytes calldata proof,
    address recipient,
    bytes32 documentHash,
    uint256 requiredCapability
) external view returns (bool, uint256) {
    (string memory credentialJSON, bytes memory signature) = abi.decode(
        proof,
        (string, bytes)
    );

    // Verify signature
    address signer = recoverSigner(credentialJSON, signature);
    require(trustedIssuers[documentHash] == signer, "Untrusted issuer");

    // Parse credential
    Credential memory cred = parseCredential(credentialJSON);
    require(cred.subject == recipient, "Wrong recipient");
    require(cred.documentHash == documentHash, "Wrong document");

    return (true, cred.capabilities);
}
```

**ZK Provider**:
```solidity
function verifyCapabilities(
    bytes calldata proof,
    address recipient,
    bytes32 documentHash,
    uint256 requiredCapability
) external view returns (bool, uint256) {
    (uint256[] memory publicSignals, bytes memory zkProof) = abi.decode(
        proof,
        (uint256[], bytes)
    );

    // Public signals: [recipientHash, documentHash, capabilities, ...]
    require(publicSignals[0] == uint256(uint160(recipient)), "Wrong recipient");
    require(publicSignals[1] == uint256(documentHash), "Wrong document");

    // Verify ZK proof
    require(verifier.verify(zkProof, publicSignals), "Invalid proof");

    uint256 capabilities = publicSignals[2];
    return (true, capabilities);
}
```

### getProviderInfo

```solidity
function getProviderInfo()
    external
    view
    returns (string memory name, string memory version, bytes32 providerType);
```

Get provider information.

**Returns**:
- `name`: Human-readable provider name (e.g., "EAS Attestation Provider V7")
- `version`: Semantic version (e.g., "7.0.0")
- `providerType`: Type identifier (e.g., keccak256("EAS"))

**Use Cases**:
- UI display ("You're using EAS attestations")
- Debugging ("Current provider: EAS v7.0.0")
- Analytics ("Provider distribution: 60% EAS, 30% VC, 10% ZK")

**Example**:
```solidity
(string memory name, string memory version, bytes32 providerType) =
    provider.getProviderInfo();

console.log("Provider:", name);
console.log("Version:", version);
console.log("Type:", bytes32ToString(providerType));
```

### supportsMethod

```solidity
function supportsMethod(bytes32 methodId)
    external
    view
    returns (bool);
```

Check if provider supports a specific method.

**Parameters**:
- `methodId`: Method identifier (keccak256 of method name)

**Returns**: Whether method is supported

**Purpose**: Allows optional features without breaking interface.

**Standard Methods**:

| Method | ID | Description |
|--------|-----|-------------|
| verifyCapabilities | keccak256("verifyCapabilities") | Core verification (required) |
| issueAttestation | keccak256("issueAttestation") | Can issue new attestations |
| revokeAttestation | keccak256("revokeAttestation") | Can revoke attestations |
| batchVerify | keccak256("batchVerify") | Batch verification support |
| offChainVerify | keccak256("offChainVerify") | Off-chain verification |

**Example Usage**:

```solidity
// Check for batch support
if (provider.supportsMethod(keccak256("batchVerify"))) {
    // Call batch method
    (bool success, bytes memory result) = address(provider).call(
        abi.encodeWithSignature(
            "batchVerify(bytes[],address[],bytes32[],uint256[])",
            proofs,
            recipients,
            documentHashes,
            requiredCapabilities
        )
    );

    if (success) {
        (bool[] memory verified, uint256[] memory caps) = abi.decode(
            result,
            (bool[], uint256[])
        );
        // Use batch results
    }
} else {
    // Fall back to individual verification
    for (uint i = 0; i < proofs.length; i++) {
        (bool verified, uint256 caps) = provider.verifyCapabilities(
            proofs[i],
            recipients[i],
            documentHashes[i],
            requiredCapabilities[i]
        );
        // Handle individual results
    }
}
```

**Implementation Example**:

```solidity
function supportsMethod(bytes32 methodId) external pure returns (bool) {
    return methodId == keccak256("verifyCapabilities") ||
           methodId == keccak256("batchVerify") ||
           methodId == keccak256("issueAttestation");
}
```

## Implementation Guide

### Implementing a New Provider

**Step 1: Implement Interface**

```solidity
import "./IAttestationProvider.sol";

contract MyAttestationProvider is IAttestationProvider {
    // Implement required functions...
}
```

**Step 2: Implement verifyCapabilities**

```solidity
function verifyCapabilities(
    bytes calldata proof,
    address recipient,
    bytes32 documentHash,
    uint256 requiredCapability
) external view override returns (bool verified, uint256 grantedCapabilities) {
    // 1. Decode proof (provider-specific format)
    // 2. Verify proof authenticity
    // 3. Check recipient binding
    // 4. Check document binding
    // 5. Check revocation/expiration
    // 6. Extract capabilities
    // 7. Return results
}
```

**Step 3: Implement Metadata Functions**

```solidity
function getProviderInfo()
    external
    pure
    override
    returns (string memory name, string memory version, bytes32 providerType)
{
    return ("My Provider", "1.0.0", keccak256("MYPROVIDER"));
}

function supportsMethod(bytes32 methodId) external pure override returns (bool) {
    return methodId == keccak256("verifyCapabilities");
}
```

**Step 4: Register Provider**

```solidity
// Deploy provider
MyAttestationProvider provider = new MyAttestationProvider();

// Register in registry
bytes32 providerId = keccak256("MYPROVIDER_V1");
providerRegistry.registerProvider(
    providerId,
    address(provider),
    "MYPROVIDER",
    "My Attestation Provider V1"
);
```

### Security Checklist

**Required Validations**:

- [ ] Proof authenticity verified
- [ ] Recipient binding enforced (proof.recipient == recipient parameter)
- [ ] Document binding enforced (proof.documentHash == documentHash parameter)
- [ ] Revocation status checked
- [ ] Expiration checked (if applicable)
- [ ] Capabilities extracted correctly
- [ ] Return values are deterministic (same inputs → same outputs)

**Recommended Validations**:

- [ ] Issuer authorization checked
- [ ] Chain ID validated (prevent cross-chain replay)
- [ ] Contract binding validated (prevent cross-contract replay)
- [ ] Proof format validated
- [ ] Reentrancy protection (if making external calls)

### Testing Guide

**Test Categories**:

1. **Happy Path**:
   ```javascript
   it("should verify valid attestation", async () => {
       const proof = createValidProof();
       const [verified, caps] = await provider.verifyCapabilities(
           proof, user, documentHash, requiredCap
       );
       expect(verified).to.be.true;
       expect(caps).to.equal(expectedCaps);
   });
   ```

2. **Authentication Failures**:
   ```javascript
   it("should reject invalid proof", async () => {
       const proof = createInvalidProof();
       await expect(
           provider.verifyCapabilities(proof, user, documentHash, requiredCap)
       ).to.be.reverted;
   });
   ```

3. **Binding Failures**:
   ```javascript
   it("should reject proof for different recipient", async () => {
       const proof = createProofForUser(alice);
       await expect(
           provider.verifyCapabilities(proof, bob, documentHash, requiredCap)
       ).to.be.reverted;
   });
   ```

4. **Revocation**:
   ```javascript
   it("should reject revoked proof", async () => {
       const proof = createValidProof();
       await revokeProof(proof);
       await expect(
           provider.verifyCapabilities(proof, user, documentHash, requiredCap)
       ).to.be.reverted;
   });
   ```

## Usage Examples

### Provider Discovery

```solidity
contract ProviderManager {
    AttestationProviderRegistryV7_Immutable public registry;

    function getProviderDetails(bytes32 providerId)
        external
        view
        returns (
            string memory name,
            string memory version,
            bytes32 providerType,
            bool active
        )
    {
        address providerAddr = registry.getProvider(providerId);

        if (providerAddr == address(0)) {
            return ("", "", bytes32(0), false);
        }

        IAttestationProvider provider = IAttestationProvider(providerAddr);
        (name, version, providerType) = provider.getProviderInfo();

        return (name, version, providerType, true);
    }
}
```

### Multi-Provider Verification

```solidity
contract MultiProviderVerifier {
    AttestationProviderRegistryV7_Immutable public registry;

    function verifyWithAnyProvider(
        bytes32[] calldata providerIds,
        bytes[] calldata proofs,
        address recipient,
        bytes32 documentHash,
        uint256 requiredCapability
    ) external view returns (bool) {
        for (uint i = 0; i < providerIds.length; i++) {
            address providerAddr = registry.getProvider(providerIds[i]);
            if (providerAddr == address(0)) continue;

            try IAttestationProvider(providerAddr).verifyCapabilities(
                proofs[i],
                recipient,
                documentHash,
                requiredCapability
            ) returns (bool verified, uint256 caps) {
                if (verified) {
                    return true;
                }
            } catch {
                continue;
            }
        }

        return false;
    }
}
```

### Capability Aggregation

```solidity
contract CapabilityAggregator {
    function aggregateCapabilities(
        bytes32[] calldata providerIds,
        bytes[] calldata proofs,
        address recipient,
        bytes32 documentHash
    ) external view returns (uint256 aggregatedCapabilities) {
        for (uint i = 0; i < providerIds.length; i++) {
            address providerAddr = registry.getProvider(providerIds[i]);
            if (providerAddr == address(0)) continue;

            try IAttestationProvider(providerAddr).verifyCapabilities(
                proofs[i],
                recipient,
                documentHash,
                0  // No specific requirement
            ) returns (bool verified, uint256 caps) {
                if (verified) {
                    aggregatedCapabilities |= caps;  // OR capabilities
                }
            } catch {
                continue;
            }
        }
    }
}
```

## Best Practices

### For Provider Implementers

1. **Validate All Inputs**:
   ```solidity
   require(proof.length > 0, "Empty proof");
   require(recipient != address(0), "Zero recipient");
   require(documentHash != bytes32(0), "Zero document");
   ```

2. **Use Deterministic Logic**:
   ```solidity
   // Good: Deterministic
   function verify(bytes calldata proof) external view returns (bool) {
       return keccak256(proof) == expectedHash;
   }

   // Bad: Non-deterministic
   function verify(bytes calldata proof) external view returns (bool) {
       return block.timestamp % 2 == 0;  // Random!
   }
   ```

3. **Implement Graceful Degradation**:
   ```solidity
   function verifyCapabilities(...)
       external
       view
       returns (bool verified, uint256 grantedCapabilities)
   {
       try this._internalVerify(...) returns (uint256 caps) {
           return (true, caps);
       } catch {
           return (false, 0);  // Graceful failure
       }
   }
   ```

4. **Optimize Gas Costs**:
   ```solidity
   // Cache storage reads
   address issuer = documentIssuers[documentHash];

   // Use memory for repeated access
   Attestation memory att = eas.getAttestation(uid);
   ```

### For Provider Users

1. **Handle address(0) from Registry**:
   ```solidity
   address provider = registry.getProvider(providerId);
   require(provider != address(0), "Provider unavailable");
   ```

2. **Check Verification Results**:
   ```solidity
   (bool verified, uint256 caps) = provider.verifyCapabilities(...);
   require(verified, "Verification failed");
   require(NAMESPACE.hasCapability(caps, required), "Insufficient caps");
   ```

3. **Use Feature Discovery**:
   ```solidity
   if (provider.supportsMethod(keccak256("batchVerify"))) {
       // Use optimized batch method
   } else {
       // Use standard method
   }
   ```

## References

- [Layer 0 Overview](./overview.md)
- [AttestationAccessControlV7](./AttestationAccessControlV7.md)
- [EASAttestationProviderV7](./EASAttestationProviderV7.md)
- [AttestationProviderRegistryV7_Immutable](./AttestationProviderRegistryV7_Immutable.md)
- [CapabilityNamespaceV7_Immutable](./CapabilityNamespaceV7_Immutable.md)
