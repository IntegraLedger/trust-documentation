# Document-Token Binding Pattern

## Overview

Integra's **Document-Token Binding Pattern** is a novel architecture that connects ERC token standards (ERC-20, ERC-721, ERC-1155) to real-world documents through a permanent registry. This creates tokens that represent verifiable ownership of physical or digital assets - what we call **Real World Contracts (RWC)**.

## The Problem with Traditional Tokenization

### Traditional NFT/Token Approach
```
Token Contract
  ├─ tokenId: 1 → metadata URI → JSON
  ├─ tokenId: 2 → metadata URI → JSON
  └─ tokenId: 3 → metadata URI → JSON
```

**Limitations:**
- No connection to real-world documents
- Metadata can change or disappear
- No standardized document identity
- No way to attach services (resolvers) to tokens
- Each token contract is isolated

### Integra's Document-Bound Approach

<div style="display: flex; justify-content: center; margin: 2rem 0;">
  <img src="/diagrams/document-bound-1.png" alt="Integra's Document-Bound Approach" style="width: 90%; height: auto;" />
</div>

```
Document Registry (Immutable Identity Layer)
  ├─ integraHash: 0xabc... → Document Record
  │    ├─ documentHash (content proof)
  │    ├─ owner
  │    ├─ tokenizer → OwnershipTokenizerV7
  │    └─ resolvers (contact, lifecycle, etc.)
  │
  └─ Tokenizer Contract (ERC Standard Layer)
       └─ tokenId: 1 → bound to integraHash: 0xabc...
```

**Benefits:**
- Token permanently linked to document identity
- Document can't be changed (immutable hash)
- Services attach to document, not token
- Standard ERC interfaces work everywhere
- Multiple tokenizers can reference same documents

## How It Works

### Step 1: Document Registration

First, a document is registered in the **IntegraDocumentRegistryV7_Immutable**:

```solidity
bytes32 integraHash = documentRegistry.registerDocument(
    keccak256(documentContent),  // documentHash - proves document content
    ipfsCID,                     // referenceHash - where to find document
    address(ownershipTokenizer), // which tokenizer will create tokens
    address(0),                  // optional executor
    bytes32(0),                  // processHash
    bytes32(0),                  // identityExtension
    bytes32(0),                  // primaryResolverId
    new bytes32[](0)            // additionalResolvers
);
```

**What happens:**
1. System generates unique `integraHash` = `keccak256(documentHash + referenceHash + owner + timestamp)`
2. Stores immutable record: owner, document proof, tokenizer address
3. Returns `integraHash` as permanent document identifier

**This creates a permanent document identity that:**
- Can never be changed
- Proves the document's content (via hash)
- Links to a specific tokenizer
- Can have services attached (resolvers)

### Step 2: Token Creation (Bound to Document)

Now the tokenizer creates ERC tokens **bound to the integraHash**:

```solidity
// Owner reserves token for recipient
ownershipTokenizer.reserveToken(
    integraHash,      // Links token to document
    0,                // tokenId (auto-assigned)
    recipientAddress,
    1,                // amount
    processHash
);

// Recipient claims with capability attestation
ownershipTokenizer.claimToken(
    integraHash,              // Token bound to this document
    tokenId,
    capabilityAttestationUID,
    processHash
);
```

**What happens:**
1. Tokenizer validates `integraHash` exists in registry
2. Tokenizer validates caller is document owner (from registry)
3. ERC-721 token minted with internal `integraHash` binding
4. Token now represents ownership of the real-world document

### Step 3: The Binding Lives Forever

The token-document binding is permanent:

```solidity
// Anyone can verify what document a token represents
bytes32 docHash = tokenizer.getDocumentHash(tokenId);
// Returns the integraHash this token is bound to

// And what tokenizer a document uses
address tokenizerAddr = documentRegistry.getTokenizer(integraHash);
// Returns which tokenizer contract manages this document's tokens
```

## The Architecture

### Two-Layer System

**Layer 1: Document Identity (Immutable)**
```
IntegraDocumentRegistryV7_Immutable
  - Pure identity storage
  - Document hash (content proof)
  - Owner address
  - Tokenizer address (which contract creates tokens)
  - Resolver references (services)
  - NEVER changes after creation
```

**Layer 2: Token Standard (ERC-Compliant)**
```
Tokenizer Contract (e.g., OwnershipTokenizerV7)
  - Implements ERC-721/1155/20
  - Creates tokens bound to integraHash
  - All tokens reference back to document registry
  - Tokens work with any ERC-compatible system
```

### The Binding Mechanism

Each tokenizer stores the `integraHash` for every token:

```solidity
// Inside OwnershipTokenizerV7 (ERC-721)
struct TokenData {
    bytes32 integraHash;  // ← Document binding
    address owner;
    bool minted;
    // ... other token data
}

mapping(uint256 => TokenData) private tokenData;
mapping(bytes32 => uint256) public integraHashToTokenId;
```

This creates bidirectional references:
- **Token → Document**: `tokenData[tokenId].integraHash`
- **Document → Token**: `integraHashToTokenId[integraHash]`

## Why This Matters

### 1. Verifiable Real-World Ownership

Traditional NFT:
```
"This token represents a house"
```
*How do you verify? You can't.*

Integra RWC:
```
Token #123 → integraHash 0xabc...
  → documentHash: 0x def... (SHA-256 of deed)
  → owner: 0x789...
  → registered: 2024-11-18
```
*Anyone can verify the document hash matches the real deed.*

### 2. Tokens Work Everywhere (Standard ERCs)

Because tokenizers implement standard ERCs:
- ✅ Works in MetaMask, Ledger, any wallet
- ✅ Can trade on OpenSea, Blur, any marketplace
- ✅ Composable with DeFi (collateral, lending)
- ✅ Standard transfer/approval mechanisms

But ALSO connected to real documents:
- ✅ Proves what the token represents
- ✅ Links to document services (contact info, lifecycle)
- ✅ Immutable document identity

### 3. Services Attach to Documents, Not Tokens

Traditional approach:
```
Each tokenizer must implement resolvers,
contact storage, lifecycle management, etc.
```

Integra approach:
```
Document Registry
  └─ integraHash → resolvers
       ├─ Contact Resolver (encrypted contact info)
       ├─ Lifecycle Resolver (expiry, renewal)
       └─ Custom Resolver (your logic)

Any tokenizer for this document can access these services
```

### 4. Multiple Tokenization Strategies

Because document identity is separate from tokenization:

```solidity
// Register document once
bytes32 integraHash = documentRegistry.registerDocument(..., tokenizerA);

// Later, can change tokenization strategy
documentRegistry.setTokenizer(integraHash, tokenizerB);
```

Example: Start with single-owner token (ERC-721), later fractionalize into shares (ERC-20).

### 5. Cross-Chain Document Identity

The `integraHash` is deterministic and can be replicated cross-chain:

```
Polygon:   integraHash 0xabc... → OwnershipTokenizer (ERC-721)
Ethereum:  integraHash 0xabc... → SharesTokenizer (ERC-20)
Base:      integraHash 0xabc... → MultiPartyTokenizer (ERC-1155)
```

Same document, different tokenization per chain.

## Real-World Example: Property Deed

### Step-by-Step Flow

**1. Property owner registers deed:**
```solidity
bytes32 deedHash = keccak256(physicalDeedPDF);
bytes32 ipfsCID = "Qm..."; // Uploaded to IPFS

bytes32 integraHash = documentRegistry.registerDocument(
    deedHash,                         // Proves deed content
    ipfsCID,                         // Where to find full deed
    address(ownershipTokenizer),     // Use ERC-721 NFT
    address(0),
    bytes32(0),
    bytes32(0),
    contactResolverId,               // Add contact resolver
    new bytes32[](0)
);
```

Registry stores:
- `integraHash`: `0xabc123...`
- `documentHash`: `0xdef456...` (deed SHA-256)
- `owner`: `0x789...` (property owner)
- `tokenizer`: `0xOwnershipTokenizer`
- `resolver`: Contact info resolver

**2. Owner creates NFT for buyer:**
```solidity
// Reserve deed NFT for buyer
ownershipTokenizer.reserveToken(
    integraHash,     // Links NFT to deed
    0,              // Auto-assign tokenId
    buyerAddress,
    1,
    saleProcessHash
);

// Create claim attestation (via TokenClaimResolver)
bytes32 attestationUID = createClaimAttestation(
    integraHash,
    tokenId,
    buyerAddress
);
```

**3. Buyer claims deed NFT:**
```solidity
ownershipTokenizer.claimToken(
    integraHash,        // Claims token for this deed
    tokenId,
    attestationUID,
    saleProcessHash
);
```

**Result:**
- ✅ Buyer now owns ERC-721 token
- ✅ Token permanently bound to deed integraHash
- ✅ Anyone can verify: token → deed hash → actual deed
- ✅ Token works in any ERC-721 wallet/marketplace
- ✅ Contact resolver attached to document
- ✅ Deed ownership on-chain, verifiable, transferable

### Verification by Third Party

Anyone can verify the token represents the real deed:

```solidity
// 1. Get integraHash from token
bytes32 integraHash = ownershipTokenizer.getDocumentHash(tokenId);

// 2. Look up document in registry
(address owner, bytes32 documentHash, , , ) =
    documentRegistry.getDocumentInfo(integraHash);

// 3. Compare documentHash with actual deed
bytes32 actualDeedHash = keccak256(physicalDeedPDF);
require(documentHash == actualDeedHash, "Deed doesn't match!");

// 4. Verified: This token definitely represents this deed
```

## Comparison with Other Approaches

### Approach 1: Metadata-Only NFTs (OpenSea standard)
```
Token → tokenURI → { "name": "My House", "description": "..." }
```
**Problems:**
- ❌ No proof of document authenticity
- ❌ Metadata can change
- ❌ No services (resolvers)
- ❌ No real-world document link

### Approach 2: Document Hash in NFT
```
Token → metadata includes documentHash
```
**Better, but:**
- ❌ Each tokenizer reinvents the wheel
- ❌ No standardized document identity
- ❌ No resolver services
- ❌ Can't change tokenization strategy

### Approach 3: Integra Document-Token Binding
```
Document Registry (integraHash) ↔ Tokenizer (ERC tokens)
```
**Advantages:**
- ✅ Permanent document identity
- ✅ Cryptographic document proof
- ✅ Standard ERC tokens (universal compatibility)
- ✅ Resolver services
- ✅ Flexible tokenization
- ✅ Cross-chain support

## Technical Benefits

### For Smart Contract Developers

**1. Reusable Document Identity**
```solidity
// Use integraHash across multiple contracts
contract MyContract {
    function processDocument(bytes32 integraHash) external {
        // Verify document exists
        require(documentRegistry.exists(integraHash));

        // Get document owner
        address owner = documentRegistry.getDocumentOwner(integraHash);

        // Get tokenizer
        address tokenizer = documentRegistry.getTokenizer(integraHash);

        // Your custom logic...
    }
}
```

**2. Composability with DeFi**
```solidity
// Use as collateral (because it's standard ERC-721)
lendingProtocol.depositCollateral(tokenId);

// But backed by real document
bytes32 integraHash = tokenizer.getDocumentHash(tokenId);
bytes32 documentHash = documentRegistry.getDocumentHash(integraHash);
// Can verify collateral is real property deed
```

**3. Service Discovery**
```solidity
// Get contact info for document holder
bytes32 integraHash = tokenizer.getDocumentHash(tokenId);
bytes32 resolverId = documentRegistry.getPrimaryResolver(integraHash);
address resolver = integraRegistry.getComponent(resolverId);
bytes memory contactData = IDocumentResolver(resolver).resolve(integraHash);
```

### For Application Developers

**1. Standard Wallet Integration**
- Tokens are standard ERC-721/1155/20
- Work in MetaMask, WalletConnect, etc.
- No custom wallet support needed

**2. Marketplace Integration**
- List on OpenSea, Blur, etc.
- Standard approval/transfer mechanisms
- But can show real document verification

**3. Document Verification**
- Query registry for document proof
- Show "Verified Document" badge
- Link to IPFS for full document

## Advanced Patterns

### Pattern 1: Multi-Tokenizer Documents

One document, multiple tokenization strategies:

```solidity
// Polygon: Single owner (ERC-721)
documentRegistry.registerDocument(
    documentHash,
    ipfsCID,
    ownershipTokenizer,  // ERC-721
    ...
);

// Ethereum: Fractionalized (ERC-20)
// Use same documentHash + owner = same integraHash cross-chain
documentRegistry.registerDocument(
    documentHash,        // Same hash
    ipfsCID,            // Same reference
    sharesTokenizer,    // ERC-20 for fractions
    ...
);
```

### Pattern 2: Document Evolution

Start simple, evolve over time:

```solidity
// Phase 1: Simple NFT ownership
registerDocument(..., ownershipTokenizer);

// Phase 2: Add rental capability
documentRegistry.setTokenizer(integraHash, rentalTokenizer);

// Phase 3: Add royalty distribution
documentRegistry.setTokenizer(integraHash, royaltyTokenizer);
```

### Pattern 3: Service Composition

Add services to documents without changing tokenizer:

```solidity
// Start with basic document
registerDocument(..., basicTokenizer, NO_RESOLVER);

// Later: Add contact resolver
documentRegistry.setPrimaryResolver(integraHash, contactResolverId);

// Later: Add lifecycle resolver
documentRegistry.addAdditionalResolver(integraHash, lifecycleResolverId);

// Later: Add payment automation
documentRegistry.addAdditionalResolver(integraHash, paymentResolverId);
```

## Security Considerations

### Immutable Document Hash

Once registered, the `documentHash` can never change:
- ✅ Permanent proof of document content
- ✅ Can't be tampered with
- ✅ Historical verification possible

### Tokenizer Validation

Tokenizers must validate with registry:
```solidity
// Inside tokenizer
function _validateDocument(bytes32 integraHash) internal view {
    require(documentRegistry.exists(integraHash), "Document not found");
    require(
        documentRegistry.getTokenizer(integraHash) == address(this),
        "Wrong tokenizer for document"
    );
}
```

### Owner Controls

Document owner controls:
- Who can claim tokens (via attestations)
- Which resolver services are attached
- Executor authorization
- But CANNOT change document hash

## Summary

Integra's Document-Token Binding Pattern:

1. **Separates** document identity from tokenization
2. **Links** ERC tokens to permanent document records
3. **Enables** standard wallet/marketplace compatibility
4. **Provides** verifiable proof of real-world asset ownership
5. **Supports** flexible tokenization strategies
6. **Allows** services to attach to documents
7. **Works** cross-chain with consistent identity

This is what makes Integra's tokens **Real World Contracts** - they're not just NFTs with metadata, they're cryptographically bound to verifiable real-world documents with permanent on-chain identity.

## Learn More

- [Document Registry Documentation](/core-contracts/document-registry/IntegraDocumentRegistryV7)
- [Tokenizer Overview](/tokenizers/overview)
- [Architecture Guide](/architecture/overview)
- [Purpose: Why Integra Exists](/introduction/why-real-world-contracts)
