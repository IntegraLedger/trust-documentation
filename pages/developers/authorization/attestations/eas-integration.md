# EAS Reference - Ethereum Attestation Service

## Overview

The Ethereum Attestation Service (EAS) is an open-source, permissionless attestation infrastructure that serves as the foundation for Integra's access control and trust graph systems. EAS enables cryptographically-signed, revocable, and expirable attestations on-chain, providing a decentralized identity and capability management layer.

### Why Integra Uses EAS

Integra leverages EAS for three critical functions:

1. **Attestation-Based Access Control**: Document capabilities are granted through cryptographically-signed EAS attestations, providing secure, revocable permissions without on-chain role assignments
2. **Trust Graph Credentials**: Anonymous trust credentials are issued via EAS when document workflows complete, building verifiable reputation
3. **Chain Context Security**: V6.2+ schemas include chain ID, EAS contract, and document contract validation to prevent cross-chain replay attacks

By using EAS, Integra inherits:
- Battle-tested attestation infrastructure deployed across 16+ chains
- Cryptographic signature verification with EIP-712 support
- Native revocation and expiration mechanisms
- Public transparency and auditability
- Zero vendor lock-in (open protocol)

## EAS Contract Summary

EAS consists of two core immutable contracts:

### EAS.sol - Core Attestation Service

The main attestation contract that stores all attestations on-chain. Key features:

- **Cryptographic Signatures**: EIP-712 typed data signatures for off-chain attestation delegation
- **Revocation**: Attesters can revoke attestations at any time
- **Expiration**: Time-based automatic expiration for temporary permissions
- **References**: Attestations can reference other attestations (attestation graphs)
- **Value Transfer**: Supports ETH transfers with attestations

### SchemaRegistry.sol - Schema Definition Registry

Manages attestation schemas (data structure definitions). Key features:

- **Schema Registration**: Anyone can register new schemas (permissionless)
- **Resolver Support**: Optional custom validation logic via resolver contracts
- **Revocability Control**: Schemas define if attestations can be revoked
- **Immutable Schemas**: Schemas cannot be modified after registration

Both contracts are **non-upgradeable** and **immutable** by design, ensuring permanent trust infrastructure.

## Official Documentation

For comprehensive EAS documentation, implementation details, and SDKs:

**Official EAS Documentation**: [https://docs.attest.org/docs/welcome](https://docs.attest.org/docs/welcome)

Additional resources:
- **EAS GitHub**: [https://github.com/ethereum-attestation-service/eas-contracts](https://github.com/ethereum-attestation-service/eas-contracts)
- **EAS Website**: [https://attest.org](https://attest.org)
- **EAS SDK**: [https://docs.attest.org/docs/developer-tools/eas-sdk](https://docs.attest.org/docs/developer-tools/eas-sdk)

## EAS and BAS Addresses by Chain

Integra V6.2 is deployed across 16 chains, using either official EAS deployments, BAS (BNB's EAS fork), or Integra-deployed canonical EAS contracts.

### Official EAS Deployments (8 Chains)

These chains use official EAS contracts deployed by the EAS team.

| Chain | Chain ID | EAS Contract | SchemaRegistry |
|-------|----------|-------------|----------------|
| **Base** | 8453 | `0x4200000000000000000000000000000000000021` | `0x4200000000000000000000000000000000000020` |
| **Worldchain** | 480 | `0x4200000000000000000000000000000000000021` | `0x4200000000000000000000000000000000000020` |
| **Optimism** | 10 | `0x4200000000000000000000000000000000000021` | `0x4200000000000000000000000000000000000020` |
| **Arbitrum** | 42161 | `0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458` | `0xA310da9c5B885E7fb3fbA9D66E9Ba6Df512b78eB` |
| **Celo** | 42220 | `0x4200000000000000000000000000000000000021` | `0x4200000000000000000000000000000000000020` |
| **Soneium** | 1868 | `0x4200000000000000000000000000000000000021` | `0x4200000000000000000000000000000000000020` |
| **Ink** | 57073 | `0x4200000000000000000000000000000000000021` | `0x4200000000000000000000000000000000000020` |
| **Unichain** | 130 | `0x4200000000000000000000000000000000000021` | `0x4200000000000000000000000000000000000020` |

**Note**: 7 of these chains use the OP Stack standard predeploy address (`0x42000...21`).

### BAS Deployment (1 Chain)

BNB Chain uses BAS (BNB Attestation Service), a fork of EAS with an identical interface.

| Chain | Chain ID | BAS Contract | SchemaRegistry |
|-------|----------|-------------|----------------|
| **BNB Chain** | 56 | `0x247Fe62d887bc9410c3848DF2f322e52DA9a51bC` | `0x5e905F77f59491F03eBB78c204986aaDEB0C6bDa` |

**BAS Compatibility**: BAS is interface-compatible with EAS. Integra contracts work seamlessly with both.

### Integra-Deployed EAS (7 Chains)

These chains did not have official EAS deployments, so Integra deployed canonical EAS v1.4.0 contracts.

| Chain | Chain ID | EAS Contract | SchemaRegistry |
|-------|----------|-------------|----------------|
| **Polygon** | 137 | `0x5E634ef5355f45A855d02D66eCD687b1502AF790` | `0x7876EEF51A891E737AF8ba5A5E0f0Fd29073D5a7` |
| **Avalanche** | 43114 | `0x79c4B3645e90aCa23e7f26aA2f8D1Af5ec130C5D` | `0xA1cDF1AFfF5E0219A94ff3616C0484a84804CcA4` |
| **Sonic** | 146 | `0xf2a9d30Cd1f92a8150A3D68D7b35E71F6b8CEeeE` | `0xf528822DBc2c86Ddf1e8B79A00969E2c0a4acba5` |
| **Cronos** | 25 | `0xb7EC2525947C28a631a73083B2E72b9F8328127f` | `0x2DE75384407dbB5Da317c17fF7Fa30E0C1DD2bC2` |
| **Sei** | 1329 | `0x66E353728bc97Fcc78d4ca8E547cCf4236Bc4fc0` | `0xbB6eF920b68EAB7FFdB9a3baf233bf75308c772F` |
| **Humanity** | 6985385 | `0xf528822DBc2c86Ddf1e8B79A00969E2c0a4acba5` | `0xb27AD7935edf1e7531E728270be5a6cc730Bb7F3` |
| **Monad Testnet** | 10143 | `0xcea6Ea33826c8CD56Bb0D2eC7792257dD8ea88Eb` | `0x7184ADABdE21dB8175D3C70C2F50a83141898242` |

**Integra Deployment Notes**:
- Uses official EAS v1.4.0 source code (commit: `9c5ffa8b4c79e78361e1b3526257a7945dde0d61`)
- Bytecode verified to match official Ethereum deployment
- No modifications - canonical implementation
- All contracts verified on respective block explorers

## Integration with Integra

### 1. AttestationAccessControlV6_2

Integra's core access control system uses EAS attestations to grant and verify document capabilities.

#### Schema Definition (V6.2)

```solidity
string public constant SCHEMA_V6_2 =
    "bytes32 documentHash,"
    "uint256 tokenId,"
    "uint256 capabilities,"
    "string verifiedIdentity,"
    "string verificationMethod,"
    "uint256 verificationDate,"
    "string contractRole,"
    "string legalEntityType,"
    "string notes,"
    "uint256 sourceChainId,"        // V6.2: Chain context
    "address sourceEASContract,"    // V6.2: EAS contract validation
    "address documentContract,"     // V6.2: Document contract binding
    "uint64 issuedAt,"             // V6.2: Issuance timestamp
    "bytes32 attestationVersion";  // V6.2: Schema version
```

#### Security Model

AttestationAccessControlV6_2 implements **13-step verification**:

1. Fetch attestation from EAS contract
2. Verify attestation exists (UID not zero)
3. Check attestation not revoked
4. Check attestation not expired
5. Verify schema matches expected schema UID
6. Verify recipient matches caller (front-running protection)
7. Verify attester is authorized document issuer
8. **Decode attestation data** (14 fields)
9. **Verify source chain ID matches current chain** (cross-chain replay prevention)
10. **Verify source EAS contract matches** (EAS spoofing prevention)
11. **Verify document contract matches** (contract spoofing prevention)
12. **Verify attestation version matches V6.2** (schema version validation)
13. **Verify document hash matches expected document**
14. **Verify attestation age** (optional, prevents stale attestations)
15. Check capabilities include required capability

**Attack Vectors Prevented**:
- Cross-chain replay attacks (attestation from Chain A used on Chain B)
- EAS contract spoofing (fake EAS issuing unauthorized attestations)
- Document contract spoofing (attestation for Contract A used on Contract B)
- Attestation forgery (EAS cryptographic signatures)
- Front-running (recipient address binding)
- Schema confusion (version validation)
- Stale attestations (optional age limits)

### 2. Capability System

Integra uses bitmask capabilities for fine-grained permissions:

```solidity
uint256 public constant CAPABILITY_CLAIM_TOKEN = 1 << 0;      // 0x01
uint256 public constant CAPABILITY_TRANSFER_TOKEN = 1 << 1;   // 0x02
uint256 public constant CAPABILITY_REQUEST_PAYMENT = 1 << 2;  // 0x04
uint256 public constant CAPABILITY_APPROVE_PAYMENT = 1 << 3;  // 0x08
uint256 public constant CAPABILITY_UPDATE_METADATA = 1 << 4;  // 0x10
uint256 public constant CAPABILITY_DELEGATE_RIGHTS = 1 << 5;  // 0x20
uint256 public constant CAPABILITY_REVOKE_ACCESS = 1 << 6;    // 0x40
uint256 public constant CAPABILITY_ADMIN = 1 << 7;            // 0x80
```

**Combined Capabilities**:
```solidity
// Grant both claim and transfer
uint256 capabilities = CAPABILITY_CLAIM_TOKEN | CAPABILITY_TRANSFER_TOKEN;

// Grant admin (all permissions)
uint256 adminCaps = CAPABILITY_ADMIN;
```

### 3. Trust Graph Credentials

`TrustGraphIntegration` mixin issues anonymous credentials via EAS when document workflows complete.

#### Trust Credential Flow

1. **Party Tracking**: When users interact with documents (claim tokens, approve payments), they're tracked
2. **Completion Detection**: Tokenizer checks if document workflow is complete
3. **Credential Issuance**: If complete, anonymous credentials issued to all parties via EAS
4. **Off-chain Attribution**: Indexer attributes ephemeral credentials to primary wallets

#### Trust Credential Schema

```solidity
bytes32 credentialHash = keccak256(abi.encode(
    integraHash,
    recipient,
    block.timestamp,
    block.chainid
));

// Registered on EAS with 180-day expiration
easContract.attest(
    IEAS.AttestationRequest({
        schema: credentialSchema,
        data: IEAS.AttestationRequestData({
            recipient: recipient,
            expirationTime: uint64(block.timestamp + 180 days),
            revocable: true,
            refUID: bytes32(0),
            data: abi.encode(credentialHash),
            value: 0
        })
    })
);
```

**Privacy Features**:
- Credentials issued to ephemeral addresses
- Off-chain indexer derives primary wallet (deterministic)
- No on-chain linkage between parties
- Credential hash reveals no document details

### 4. Payment Attestations

While Integra V6.2 focuses on capability attestations, future versions may use EAS for:

- Payment request attestations
- Payment approval attestations
- Dispute resolution attestations
- Compliance certification attestations

## Schema Information

### Access Capability Schema V6.2

**Schema UID**: Set during contract initialization (chain-specific)

**Schema Definition**:
```
bytes32 documentHash,
uint256 tokenId,
uint256 capabilities,
string verifiedIdentity,
string verificationMethod,
uint256 verificationDate,
string contractRole,
string legalEntityType,
string notes,
uint256 sourceChainId,
address sourceEASContract,
address documentContract,
uint64 issuedAt,
bytes32 attestationVersion
```

**Field Descriptions**:

| Field | Type | Purpose |
|-------|------|---------|
| `documentHash` | bytes32 | Integra document hash (integraHash) |
| `tokenId` | uint256 | Associated token ID (if applicable) |
| `capabilities` | uint256 | Bitmask of granted capabilities |
| `verifiedIdentity` | string | KYC/identity verification result |
| `verificationMethod` | string | Verification provider/method |
| `verificationDate` | uint256 | Timestamp of identity verification |
| `contractRole` | string | Role in contract (buyer, seller, etc.) |
| `legalEntityType` | string | Entity type (individual, company, etc.) |
| `notes` | string | Additional context or metadata |
| `sourceChainId` | uint256 | Chain ID where attestation is valid |
| `sourceEASContract` | address | Expected EAS contract address |
| `documentContract` | address | Document contract this applies to |
| `issuedAt` | uint64 | Issuance timestamp (for age validation) |
| `attestationVersion` | bytes32 | Schema version (`INTEGRA_CAPABILITY_V6.2`) |

**Schema Properties**:
- **Revocable**: Yes (issuer can revoke access)
- **Resolver**: None (validation in contract logic)
- **Registration**: Must be registered on each chain's SchemaRegistry

### Trust Credential Schema

**Schema UID**: Set in TrustGraphIntegration initialization

**Schema Definition**: Simple credential hash
```
bytes32 credentialHash
```

**Field Descriptions**:

| Field | Type | Purpose |
|-------|------|---------|
| `credentialHash` | bytes32 | Keccak256 hash of (documentHash, recipient, timestamp, chainId) |

**Schema Properties**:
- **Revocable**: Yes
- **Expiration**: 180 days from issuance
- **Resolver**: None
- **Privacy**: Hash reveals no document or party details

## Usage Examples

### Example 1: Verify Capability (Read-Only)

```solidity
// Check if user has claim token capability
(bool hasCapability, uint256 grantedCaps, ) = documentRegistry.checkCapability(
    userAddress,
    integraHash,
    CAPABILITY_CLAIM_TOKEN,
    attestationUID
);

if (hasCapability) {
    // User has permission
    // grantedCaps shows all capabilities (may be more than just CLAIM_TOKEN)
}
```

### Example 2: Require Capability (State-Changing)

```solidity
// Function requiring transfer capability
function transferToken(
    bytes32 integraHash,
    address to,
    bytes32 attestationUID
) external requiresCapability(
    integraHash,
    CAPABILITY_TRANSFER_TOKEN,
    attestationUID
) {
    // Transfer logic here
    // If user lacks capability, transaction reverts
}
```

### Example 3: Query Attestation from EAS

```solidity
import "./layer0/interfaces/IEAS.sol";

// Get EAS address for current chain
IEAS eas = IEAS(documentRegistry.getEASAddress());

// Fetch attestation
IEAS.Attestation memory attestation = eas.getAttestation(attestationUID);

// Check attestation properties
bool isRevoked = attestation.revocationTime != 0;
bool isExpired = attestation.expirationTime != 0 &&
                 attestation.expirationTime < block.timestamp;
address attester = attestation.attester;
address recipient = attestation.recipient;
bytes32 schema = attestation.schema;
bytes memory data = attestation.data;
```

### Example 4: Issue Access Capability (Backend)

```javascript
// Using EAS SDK (JavaScript)
import { EAS, SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";

const eas = new EAS(EAS_CONTRACT_ADDRESS);
eas.connect(signer);

// Encode V6.2 attestation data
const schemaEncoder = new SchemaEncoder(
  "bytes32 documentHash,uint256 tokenId,uint256 capabilities," +
  "string verifiedIdentity,string verificationMethod," +
  "uint256 verificationDate,string contractRole," +
  "string legalEntityType,string notes,uint256 sourceChainId," +
  "address sourceEASContract,address documentContract," +
  "uint64 issuedAt,bytes32 attestationVersion"
);

const encodedData = schemaEncoder.encodeData([
  { name: "documentHash", value: integraHash, type: "bytes32" },
  { name: "tokenId", value: 1, type: "uint256" },
  { name: "capabilities", value: 0x03, type: "uint256" }, // CLAIM + TRANSFER
  { name: "verifiedIdentity", value: "John Doe", type: "string" },
  { name: "verificationMethod", value: "KYC:Provider", type: "string" },
  { name: "verificationDate", value: Date.now(./ 1000, type: "uint256" },
  { name: "contractRole", value: "Buyer", type: "string" },
  { name: "legalEntityType", value: "Individual", type: "string" },
  { name: "notes", value: "", type: "string" },
  { name: "sourceChainId", value: 8453, type: "uint256" }, // Base
  { name: "sourceEASContract", value: EAS_CONTRACT_ADDRESS, type: "address" },
  { name: "documentContract", value: DOCUMENT_REGISTRY_ADDRESS, type: "address" },
  { name: "issuedAt", value: Math.floor(Date.now(./ 1000), type: "uint64" },
  { name: "attestationVersion", value: ethers.utils.id("INTEGRA_CAPABILITY_V6.2"), type: "bytes32" }
]);

// Issue attestation
const tx = await eas.attest({
  schema: ACCESS_CAPABILITY_SCHEMA_UID,
  data: {
    recipient: userAddress,
    expirationTime: 0, // No expiration
    revocable: true,
    data: encodedData,
  },
});

const attestationUID = await tx.wait();
console.log("Attestation UID:", attestationUID);
```

### Example 5: Revoke Access

```javascript
// Revoke attestation (issuer only)
const tx = await eas.revoke({
  schema: ACCESS_CAPABILITY_SCHEMA_UID,
  data: {
    uid: attestationUID
  }
});

await tx.wait();
console.log("Attestation revoked");
```

## Resources

### Official EAS Resources

- **Documentation**: [https://docs.attest.org/docs/welcome](https://docs.attest.org/docs/welcome)
- **GitHub Repository**: [https://github.com/ethereum-attestation-service/eas-contracts](https://github.com/ethereum-attestation-service/eas-contracts)
- **EAS SDK**: [https://www.npmjs.com/package/@ethereum-attestation-service/eas-sdk](https://www.npmjs.com/package/@ethereum-attestation-service/eas-sdk)
- **Website**: [https://attest.org](https://attest.org)

### EAS Explorers (by Chain)

- **Base**: [https://base.easscan.org](https://base.easscan.org)
- **Optimism**: [https://optimism.easscan.org](https://optimism.easscan.org)
- **Arbitrum**: [https://arbitrum.easscan.org](https://arbitrum.easscan.org)
- **Polygon**: [https://polygon.easscan.org](https://polygon.easscan.org)

### Integra Integration Guides

- **[AttestationAccessControlV6_2](./layer0/attestation-access-control)** - Access control implementation
- **[Security Patterns](./patterns/security)** - Security best practices
- **[Access Control Patterns](./patterns/access-control)** - Multi-layer authorization

### Integra EAS Deployment Documentation

- **EAS Setup**: `/repos/smart-contracts-evm-v6_2/EAS-SETUP-COMPLETE.md`
- **Deployment Guide**: `/repos/smart-contracts-evm-v6_2/src/layer-EAS/README-EAS-DEPLOYMENT.md`
- **Address Reference**: `/repos/smart-contracts-evm-v6_2/deployment-addresses/final-addresses/EAS_BAS_ADDRESSES.md`

### Developer Tools

- **EAS SDK (JavaScript)**: [@ethereum-attestation-service/eas-sdk](https://www.npmjs.com/package/@ethereum-attestation-service/eas-sdk)
- **EAS Contracts (Solidity)**: Available in Integra repo at `/src/layer-EAS/`
- **Schema Encoder**: Included in EAS SDK
- **Indexer**: EAS provides GraphQL indexer for attestation queries

## Version Information

- **EAS Version**: v1.4.0
- **Integra Version**: V6.2
- **Solidity Version**: 0.8.28 (Integra), 0.8.19 (EAS)
- **Document Version**: 1.0
- **Last Updated**: 2025-11-17

## Security Considerations

### EAS Immutability

EAS and SchemaRegistry contracts are **non-upgradeable** and **immutable** by design. This ensures:
- Permanent trust infrastructure
- No central points of failure
- Attestations remain valid indefinitely
- Transparent, auditable code

**CRITICAL**: Integra contracts MUST NOT change EAS address after initialization. Changing EAS would:
- Break the attestation trust model
- Invalidate all existing attestations
- Create attack vectors for malicious substitution

### Chain Context Validation

V6.2 introduced mandatory chain context validation:

```solidity
// Prevents cross-chain replay
if (sourceChainId != block.chainid) {
    revert WrongChain(block.chainid, sourceChainId);
}

// Prevents EAS spoofing
if (sourceEASContract != address(eas)) {
    revert WrongEASContract(address(eas), sourceEASContract);
}

// Prevents contract spoofing
if (documentContract != address(this)) {
    revert WrongDocumentContract(address(this), documentContract);
}
```

This prevents attackers from:
1. Reusing attestations across chains
2. Creating fake EAS contracts
3. Using attestations for wrong contracts

### Best Practices

1. **Always Validate Chain Context**: Include `sourceChainId`, `sourceEASContract`, `documentContract` in schemas
2. **Use Revocable Schemas**: Enable revocation unless there's a specific reason not to
3. **Set Appropriate Expirations**: Temporary permissions should have expiration times
4. **Verify Attester**: Always check attestation.attester matches expected issuer
5. **Check Revocation Status**: Verify attestation.revocationTime == 0
6. **Validate Recipient**: Ensure attestation.recipient matches expected user (front-running protection)
7. **Use Try/Catch for Trust Credentials**: Trust credential failures should not block document operations

## Support

For questions or issues related to EAS integration:

- **Technical Questions**: dev@integra.global
- **Security Issues**: security@integra.global
- **EAS Community**: [EAS Discord](https://discord.gg/eas) (verify link)
