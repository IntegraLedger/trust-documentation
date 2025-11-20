# Integra V6.2 to V7 Migration Guide

Complete guide for migrating from Integra V6.2 to V7 smart contracts.

## Table of Contents

- [Overview](#overview)
- [Breaking Changes](#breaking-changes)
- [Migration Checklist](#migration-checklist)
- [Code Updates Required](#code-updates-required)
- [Provider Abstraction Changes](#provider-abstraction-changes)
- [Resolver Pattern Migration](#resolver-pattern-migration)
- [Testing Migration](#testing-migration)
- [Rollback Procedures](#rollback-procedures)

## Overview

Integra V7 represents a significant architectural evolution from V6.2, introducing provider abstraction, resolver composition, and progressive ossification. This guide helps you migrate existing integrations.

### Key Changes

1. **Provider Abstraction**: Hard-coded EAS → Pluggable attestation providers
2. **Resolver Composition**: Monolithic registry → Modular resolvers
3. **Progressive Ossification**: Fixed governance → Time-gated evolution
4. **Three-Tier Architecture**: Flat structure → Immutable/Ossifiable/Upgradeable tiers
5. **Enhanced Security**: Basic checks → Defense-in-depth
6. **Batch Operations**: Individual only → Optimized batch functions
7. **Trust Graph**: Separate system → Integrated credentials

### Migration Timeline

```
Week 1:     Planning and impact analysis
Week 2-3:   Code updates and testing
Week 4:     Testnet deployment
Week 5:     Integration testing
Week 6:     Mainnet migration
```

## Breaking Changes

### 1. Contract Address Changes

**V6.2**:
```javascript
const DOCUMENT_REGISTRY_V6 = "0x...";  // Single contract
```

**V7**:
```javascript
const ADDRESSES_V7 = {
    // Tier 1: Immutable Quad
    capabilityNamespace: "0x...",
    providerRegistry: "0x...",
    verifierRegistry: "0x...",
    resolverRegistry: "0x...",

    // Tier 2: Document Layer
    documentRegistry: "0x...",

    // Tier 3: Tokenizers
    ownershipTokenizer: "0x...",
    multiPartyTokenizer: "0x...",
    // ... etc
};
```

**Migration**: Update all contract addresses in your application

### 2. Function Signature Changes

#### Document Registration

**V6.2**:
```solidity
function registerDocument(
    bytes32 documentHash,
    bytes32 referenceHash,
    bytes32[3] calldata referenceProof
) external returns (bytes32 integraHash);
```

**V7**:
```solidity
function registerDocument(
    bytes32 integraHash,           // ← Now required as input
    bytes32 documentHash,
    bytes32 identityExtension,     // ← New: for ZK commitments, DIDs
    bytes32 referenceHash,
    bytes32 referenceProofA,       // ← Unpacked from array
    bytes32 referenceProofB,
    bytes32 referenceProofC,
    address tokenizer,             // ← New: tokenizer assignment
    bytes32 primaryResolverId,     // ← New: resolver composition
    address authorizedExecutor,    // ← New: executor delegation
    bytes32 processHash            // ← New: workflow correlation
) external;
```

**Migration**:
```javascript
// V6.2
const tx = await registryV6.registerDocument(
    documentHash,
    referenceHash,
    referenceProof
);

// V7
const integraHash = generateIntegraHash(documentHash, owner);

const tx = await registryV7.registerDocument(
    integraHash,          // Calculate externally
    documentHash,
    ethers.ZeroHash,      // identityExtension (optional)
    referenceHash,
    referenceProof[0],    // Unpack array
    referenceProof[1],
    referenceProof[2],
    tokenizerAddress,     // Specify tokenizer
    ethers.ZeroHash,      // primaryResolverId (optional)
    ethers.ZeroAddress,   // authorizedExecutor (optional)
    processHash           // For workflow tracking
);
```

#### Token Claiming

**V6.2**:
```solidity
function claimToken(
    bytes32 integraHash,
    bytes32 easUID
) external;
```

**V7**:
```solidity
function claimToken(
    bytes32 integraHash,
    uint256 tokenId,       // ← New: explicit token ID
    bytes32 easUID,
    bytes32 processHash    // ← New: workflow correlation
) external;
```

**Migration**:
```javascript
// V6.2
await tokenizerV6.claimToken(integraHash, easUID);

// V7
await tokenizerV7.claimToken(
    integraHash,
    0,            // tokenId (0 for ownership tokenizer)
    easUID,
    processHash   // Track workflow
);
```

### 3. EAS Schema Changes

**V6.2 Schema**:
```solidity
struct V6Schema {
    bytes32 documentHash;
    uint256 capabilities;
}
```

**V7 Schema** (Extended):
```solidity
struct V7Schema {
    bytes32 documentHash;
    uint256 capabilities;
    uint256 sourceChainId;          // ← New: cross-chain protection
    address sourceEASAddress;       // ← New: EAS spoofing protection
    address sourceDocumentContract; // ← New: contract spoofing protection
    uint8 schemaVersion;           // ← New: versioning
}
```

**Migration**: Re-issue attestations with V7 schema

### 4. Tokenizer Interface Changes

**V6.2**:
```solidity
interface ITokenizerV6 {
    function reserveToken(bytes32 integraHash, address recipient) external;
    function claimToken(bytes32 integraHash, bytes32 easUID) external;
}
```

**V7**:
```solidity
interface IDocumentTokenizer {
    function reserveToken(
        bytes32 integraHash,
        uint256 tokenId,
        address recipient,
        uint256 amount,
        bytes32 processHash
    ) external;

    function reserveTokenAnonymous(
        bytes32 integraHash,
        uint256 tokenId,
        uint256 amount,
        bytes calldata encryptedLabel,
        bytes32 processHash
    ) external;

    function claimToken(
        bytes32 integraHash,
        uint256 tokenId,
        bytes32 capabilityAttestation,
        bytes32 processHash
    ) external;

    function cancelReservation(
        bytes32 integraHash,
        uint256 tokenId,
        bytes32 processHash
    ) external;
}
```

**Migration**: Update tokenizer calls with new parameters

### 5. Access Control Changes

**V6.2**: Hard-coded EAS verification
```solidity
// V6.2: Direct EAS validation
function claimToken(bytes32 integraHash, bytes32 easUID) external {
    Attestation memory attestation = eas.getAttestation(easUID);
    require(attestation.recipient == msg.sender, "Not recipient");
    require(!attestation.revoked, "Revoked");
    // ... minimal checks
}
```

**V7**: Provider abstraction with 13-step verification
```solidity
// V7: Provider-based validation
modifier requiresCapability(
    bytes32 documentHash,
    uint256 requiredCapability,
    bytes calldata attestationProof
) {
    address provider = _getProviderForDocument(documentHash);
    (bool verified, uint256 granted) = IAttestationProvider(provider)
        .verifyCapabilities(
            attestationProof,
            msg.sender,
            documentHash,
            requiredCapability
        );
    require(verified && NAMESPACE.hasCapability(granted, requiredCapability));
    _;
}
```

**Migration**: Update to use provider abstraction

## Migration Checklist

### Pre-Migration

- [ ] Audit current V6.2 integration
- [ ] Identify all contract interactions
- [ ] Document custom modifications
- [ ] Export existing document data
- [ ] Test V7 on testnet
- [ ] Prepare rollback plan

### Code Changes

- [ ] Update contract addresses
- [ ] Update function signatures
- [ ] Add new parameters (processHash, etc.)
- [ ] Implement provider abstraction
- [ ] Update event listeners
- [ ] Handle new error types
- [ ] Update ABI imports

### Data Migration

- [ ] Export V6.2 documents
- [ ] Re-register on V7 (if needed)
- [ ] Migrate attestations to V7 schema
- [ ] Verify data integrity
- [ ] Update off-chain database

### Testing

- [ ] Unit test new code
- [ ] Integration test workflows
- [ ] Test on testnet
- [ ] Gas cost comparison
- [ ] Security audit changes
- [ ] Performance testing

### Deployment

- [ ] Deploy contracts (if self-hosting)
- [ ] Update frontend contracts
- [ ] Update backend services
- [ ] Migrate user data
- [ ] Monitor for issues
- [ ] Communicate to users

### Post-Migration

- [ ] Verify all features working
- [ ] Monitor error rates
- [ ] Collect user feedback
- [ ] Document lessons learned
- [ ] Update documentation

## Code Updates Required

### 1. Update Contract Initialization

**V6.2**:
```javascript
const documentRegistry = new ethers.Contract(
    DOCUMENT_REGISTRY_V6,
    RegistryABI_V6,
    signer
);

const tokenizer = new ethers.Contract(
    TOKENIZER_V6,
    TokenizerABI_V6,
    signer
);
```

**V7**:
```javascript
// Initialize all V7 contracts
const documentRegistry = new ethers.Contract(
    ADDRESSES_V7.documentRegistry,
    DocumentRegistryABI_V7,
    signer
);

const ownershipTokenizer = new ethers.Contract(
    ADDRESSES_V7.ownershipTokenizer,
    OwnershipTokenizerABI_V7,
    signer
);

const namespace = new ethers.Contract(
    ADDRESSES_V7.capabilityNamespace,
    CapabilityNamespaceABI,
    signer
);

const providerRegistry = new ethers.Contract(
    ADDRESSES_V7.providerRegistry,
    ProviderRegistryABI,
    signer
);
```

### 2. Update Document Registration

**V6.2**:
```javascript
async function registerDocument(documentContent) {
    const documentHash = ethers.keccak256(ethers.toUtf8Bytes(documentContent));

    const tx = await documentRegistry.registerDocument(
        documentHash,
        ethers.ZeroHash,  // No reference
        [ethers.ZeroHash, ethers.ZeroHash, ethers.ZeroHash]  // No proof
    );

    const receipt = await tx.wait();
    const event = receipt.logs.find(log => log.topics[0] === REGISTERED_EVENT);
    const integraHash = event.topics[1];

    return integraHash;
}
```

**V7**:
```javascript
async function registerDocument(documentContent, ownerAddress) {
    const documentHash = ethers.keccak256(ethers.toUtf8Bytes(documentContent));

    // Generate integraHash externally
    const integraHash = ethers.keccak256(
        ethers.solidityPacked(
            ["bytes32", "address", "uint256"],
            [documentHash, ownerAddress, Date.now()]
        )
    );

    const tx = await documentRegistry.registerDocument(
        integraHash,                          // Now input
        documentHash,
        ethers.ZeroHash,                      // identityExtension
        ethers.ZeroHash,                      // referenceHash
        ethers.ZeroHash,                      // referenceProofA
        ethers.ZeroHash,                      // referenceProofB
        ethers.ZeroHash,                      // referenceProofC
        ADDRESSES_V7.ownershipTokenizer,      // tokenizer
        ethers.ZeroHash,                      // primaryResolverId
        ethers.ZeroAddress,                   // authorizedExecutor
        ethers.keccak256(ethers.toUtf8Bytes("workflow-123"))  // processHash
    );

    await tx.wait();

    return integraHash;
}
```

### 3. Update Token Reservation

**V6.2**:
```javascript
async function reserveToken(integraHash, recipient) {
    const tx = await tokenizer.reserveToken(integraHash, recipient);
    await tx.wait();
}
```

**V7**:
```javascript
async function reserveToken(integraHash, recipient) {
    const processHash = ethers.keccak256(
        ethers.toUtf8Bytes(`reserve-${Date.now()}`)
    );

    const tx = await ownershipTokenizer.reserveToken(
        integraHash,
        0,          // tokenId
        recipient,
        1,          // amount
        processHash
    );

    await tx.wait();
}
```

### 4. Update Event Listeners

**V6.2**:
```javascript
documentRegistry.on("DocumentRegistered", (integraHash, owner) => {
    console.log("Document registered:", integraHash);
});
```

**V7**:
```javascript
documentRegistry.on("DocumentRegistered", (
    integraHash,
    owner,
    documentHash,
    tokenizer,
    processHash
) => {
    console.log("Document registered:", {
        integraHash,
        owner,
        documentHash,
        tokenizer,
        processHash  // New field
    });
});
```

### 5. Update Error Handling

**V6.2**:
```javascript
try {
    await documentRegistry.registerDocument(...);
} catch (error) {
    if (error.message.includes("already registered")) {
        // Handle duplicate
    }
}
```

**V7**:
```javascript
try {
    await documentRegistry.registerDocument(...);
} catch (error) {
    // V7 uses custom errors
    if (error.message.includes("DocumentAlreadyExists")) {
        const integraHash = extractFromError(error, "integraHash");
        console.error("Document already exists:", integraHash);
    } else if (error.message.includes("Unauthorized")) {
        const { caller, integraHash } = extractFromError(error);
        console.error("Unauthorized:", caller, integraHash);
    }
}
```

## Provider Abstraction Changes

### V6.2: Hard-Coded EAS

```javascript
// V6.2: Direct EAS interaction
const EAS_ADDRESS = "0x...";
const eas = new ethers.Contract(EAS_ADDRESS, EAS_ABI, signer);

// Create attestation
const tx = await eas.attest({
    schema: SCHEMA_UID,
    data: {
        recipient: userAddress,
        data: ethers.AbiCoder.defaultAbiCoder().encode(
            ["bytes32", "uint256"],
            [documentHash, capabilities]
        ),
    },
});
```

### V7: Provider Abstraction

```javascript
// V7: Provider-based system
const providerRegistry = new ethers.Contract(
    ADDRESSES_V7.providerRegistry,
    ProviderRegistryABI,
    signer
);

// Get default provider (EAS)
const providerId = ethers.keccak256(ethers.toUtf8Bytes("eas-v7"));
const providerAddress = await providerRegistry.getProvider(providerId);

// Use provider (same EAS interface for now)
const eas = new ethers.Contract(providerAddress, EAS_ABI, signer);

// Create attestation with V7 schema
const tx = await eas.attest({
    schema: V7_SCHEMA_UID,
    data: {
        recipient: userAddress,
        data: ethers.AbiCoder.defaultAbiCoder().encode(
            [
                "bytes32",  // documentHash
                "uint256",  // capabilities
                "uint256",  // sourceChainId
                "address",  // sourceEASAddress
                "address",  // sourceDocumentContract
                "uint8"     // schemaVersion
            ],
            [
                documentHash,
                capabilities,
                chainId,
                EAS_ADDRESS,
                ADDRESSES_V7.documentRegistry,
                1  // V7 schema version
            ]
        ),
    },
});
```

### Migration Benefits

1. **Future-Proof**: Can switch providers without contract upgrades
2. **Multi-Provider**: Support VCs, ZK proofs, DIDs simultaneously
3. **Per-Document**: Documents can choose their preferred provider
4. **Graceful Degradation**: Code hash verification prevents malicious upgrades

## Resolver Pattern Migration

### V6.2: Monolithic Registry

```javascript
// V6.2: All functionality in single contract
const documentRegistry = new ethers.Contract(
    DOCUMENT_REGISTRY_V6,
    RegistryABI_V6,
    signer
);

// Contact information stored directly
await documentRegistry.setContactInfo(integraHash, contactURL);

// Metadata stored directly
await documentRegistry.setMetadata(integraHash, metadata);
```

### V7: Resolver Composition

```javascript
// V7: Modular resolvers
const documentRegistry = new ethers.Contract(
    ADDRESSES_V7.documentRegistry,
    DocumentRegistryABI_V7,
    signer
);

const contactResolver = new ethers.Contract(
    ADDRESSES_V7.contactResolver,
    ContactResolverABI,
    signer
);

// Register document with resolver
const contactResolverId = ethers.keccak256(ethers.toUtf8Bytes("contact-v7"));

await documentRegistry.registerDocument(
    integraHash,
    documentHash,
    ethers.ZeroHash,
    ethers.ZeroHash,
    ethers.ZeroHash,
    ethers.ZeroHash,
    ethers.ZeroHash,
    tokenizerAddress,
    contactResolverId,  // ← Assign resolver
    ethers.ZeroAddress,
    processHash
);

// Set contact via resolver
await contactResolver.setContactURL(integraHash, encryptedURL);

// Add additional resolvers
await documentRegistry.addAdditionalResolver(integraHash, metadataResolverId);
```

### Migration Steps

1. **Identify resolver needs** for each document type
2. **Map V6.2 functionality** to V7 resolvers
3. **Deploy custom resolvers** if needed
4. **Register resolvers** in resolver registry
5. **Update documents** to use appropriate resolvers
6. **Test resolver hooks** during registration/updates

## Testing Migration

### Test Plan

```javascript
// 1. Test document registration
describe("V7 Migration: Document Registration", () => {
    it("should register document with V7 parameters", async () => {
        const integraHash = generateIntegraHash(documentHash, owner);

        await documentRegistry.registerDocument(
            integraHash,
            documentHash,
            ethers.ZeroHash,
            ethers.ZeroHash,
            ethers.ZeroHash,
            ethers.ZeroHash,
            ethers.ZeroHash,
            tokenizer,
            ethers.ZeroHash,
            ethers.ZeroAddress,
            processHash
        );

        expect(await documentRegistry.exists(integraHash)).to.be.true;
    });
});

// 2. Test attestation with V7 schema
describe("V7 Migration: Attestations", () => {
    it("should create attestation with V7 schema", async () => {
        const attestation = await createV7Attestation(
            recipient,
            documentHash,
            capabilities
        );

        expect(attestation.schema).to.equal(V7_SCHEMA_UID);
    });
});

// 3. Test provider abstraction
describe("V7 Migration: Provider Abstraction", () => {
    it("should verify capabilities via provider", async () => {
        const provider = await providerRegistry.getProvider(providerId);

        const { verified, granted } = await provider.verifyCapabilities(
            attestationProof,
            recipient,
            documentHash,
            requiredCapability
        );

        expect(verified).to.be.true;
    });
});

// 4. Test resolver composition
describe("V7 Migration: Resolver Composition", () => {
    it("should call resolver hook on registration", async () => {
        await documentRegistry.registerDocument(
            integraHash,
            documentHash,
            ethers.ZeroHash,
            ethers.ZeroHash,
            ethers.ZeroHash,
            ethers.ZeroHash,
            ethers.ZeroHash,
            tokenizer,
            contactResolverId,
            ethers.ZeroAddress,
            processHash
        );

        // Verify resolver was called
        expect(await contactResolver.wasCalledFor(integraHash)).to.be.true;
    });
});
```

### Integration Tests

```javascript
// End-to-end workflow test
describe("V7 Migration: Complete Workflow", () => {
    it("should complete document → token flow", async () => {
        // 1. Register document
        const integraHash = await registerDocument(documentContent, owner);

        // 2. Reserve token
        await reserveToken(integraHash, recipient);

        // 3. Issue capability
        const attestationUID = await issueCapability(recipient, integraHash);

        // 4. Claim token
        await claimToken(integraHash, attestationUID);

        // 5. Verify token minted
        expect(await tokenizer.ownerOf(0)).to.equal(recipient);
    });
});
```

## Rollback Procedures

### Rollback Strategy

If migration fails, follow these steps to rollback:

#### Step 1: Pause current version Contracts

```javascript
const governor = new ethers.Wallet(GOVERNOR_PRIVATE_KEY, provider);

// Pause all V7 contracts
await documentRegistry.connect(governor).pause();
await ownershipTokenizer.connect(governor).pause();
await multiPartyTokenizer.connect(governor).pause();
// ... pause all tokenizers
```

#### Step 2: Revert to V6.2

```javascript
// Update frontend to use V6.2 addresses
const ADDRESSES_V6 = {
    documentRegistry: "0x...",  // V6.2 address
    tokenizer: "0x...",         // V6.2 address
};

// Reinitialize contracts
const documentRegistry = new ethers.Contract(
    ADDRESSES_V6.documentRegistry,
    RegistryABI_V6,
    signer
);
```

#### Step 3: Restore Data

```javascript
// Re-import documents if needed
for (const doc of exportedDocuments) {
    await documentRegistry.registerDocument(
        doc.documentHash,
        doc.referenceHash,
        doc.referenceProof
    );
}
```

#### Step 4: Notify Users

```markdown
## Migration Rollback Notice

We've temporarily reverted to V6.2 contracts while we resolve migration issues.

**What this means**:
- All V6.2 functionality restored
- V7 features temporarily unavailable
- Your documents and tokens are safe
- No action required from users

**Timeline**:
- Issue identified: 10:00 AM
- Rollback completed: 10:30 AM
- Expected resolution: 2-4 hours

We apologize for the inconvenience.
```

#### Step 5: Investigate and Fix

```bash
# Analyze what went wrong
cast tx $FAILED_TX_HASH --trace

# Fix issues
# Test fixes on testnet
# Prepare for second migration attempt
```

### Rollback Checklist

- [ ] Pause current version contracts
- [ ] Revert frontend to V6.2
- [ ] Revert backend to V6.2
- [ ] Restore data if needed
- [ ] Notify users
- [ ] Investigate root cause
- [ ] Fix issues
- [ ] Test on testnet
- [ ] Plan second migration

## Migration Support

### Resources

- **Documentation**: https://docs.integra.io/v7/migration
- **GitHub Issues**: https://github.com/IntegraLedger/smart-contracts-evm-v7/issues
- **Discord**: https://discord.gg/integra (#migration-support)
- **Email**: migration@integra.io

### FAQ

**Q: Do I need to re-register all my documents?**
A: Not necessarily. V7 can reference V6.2 documents via the referenceHash field.

**Q: Will my existing attestations work with V7?**
A: No, you need to re-issue attestations using the V7 schema.

**Q: Can I use V6.2 and V7 simultaneously?**
A: Yes, during migration period you can use both.

**Q: How long does migration take?**
A: Typically 4-6 weeks depending on integration complexity.

**Q: What happens if migration fails?**
A: We have rollback procedures to revert to V6.2.

## Next Steps

- [Integration Guide](./integration.md) - Learn V7 integration
- [Deployment Guide](./deployment.md) - Deploy contracts
- [Architecture Guide](./architecture.md) - Understand V7 design
- [Testing Guide](./testing.md) - Test your migration
- [Security Guide](./security.md) - Secure your integration
