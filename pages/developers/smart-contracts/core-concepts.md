# Core Concepts

Understanding these fundamental concepts will help you build effectively with Integra.

## Document Hashing

### What is a Hash?

A **hash** is like a unique fingerprint for data. It's a fixed-length string generated from any input (text, file, image, etc.).

**Key Properties:**
- **Deterministic**: Same input = same hash
- **Unique**: Different inputs = different hashes (practically impossible to collide)
- **One-way**: Cannot reverse a hash to get original data
- **Fixed size**: Always the same length regardless of input size

### Example

```javascript
const { ethers } = require('ethers');

// Hash a string
const text = "Hello, Integra!";
const hash = ethers.id(text);
console.log(hash);
// Output: 0x8f3f4f5c9d2e1a3b7c6d8e9f0a1b2c3d...

// Hash file content
const fs = require('fs');
const fileBuffer = fs.readFileSync('document.pdf');
const fileHash = ethers.keccak256(fileBuffer);
```

### Why Hash Documents?

Storing entire documents on blockchain would be:
- **Expensive**: Gas costs scale with data size
- **Slow**: Larger transactions take longer
- **Inefficient**: Blockchain isn't designed for file storage

Instead, we:
1. Store the document off-chain (IPFS, your server, etc.)
2. Store only the hash on-chain
3. Anyone can verify the document matches the hash

## Attestations

### What is an Attestation?

An **attestation** is a signed statement that something is true. Think of it as a digital signature from a trusted party.

**Real-world analogy**: A notary stamp on a document is an attestation that you signed it in their presence.

### Ethereum Attestation Service (EAS)

Integra uses **EAS**, an industry-standard protocol for creating and verifying attestations.

**EAS provides:**
- **Schemas**: Templates defining what data an attestation contains
- **On-chain**: Attestations stored directly on blockchain
- **Off-chain**: Attestations signed but stored elsewhere (cheaper)
- **Revocation**: Ability to invalidate attestations

### Attestation Structure

```javascript
{
  schema: "0x...",           // What type of attestation
  recipient: "0x1234...",    // Who it's about
  attester: "0x5678...",     // Who made it
  data: {                    // The actual claims
    documentHash: "0x...",
    timestamp: 1234567890,
    documentType: "Contract"
  },
  revocable: true,          // Can be revoked?
  expirationTime: 0         // When it expires (0 = never)
}
```

### Example Use Cases

**Document Notarization**
```
Attester: Notary Service
Recipient: Document Owner
Claims: "This document existed on [date]"
```

**Academic Credential**
```
Attester: University
Recipient: Graduate
Claims: "Earned Bachelor's Degree in CS, GPA 3.8"
```

**Supply Chain Verification**
```
Attester: Manufacturer
Recipient: Product NFT
Claims: "Authentic product, manufactured [date]"
```

## Namespaces & Capabilities

### What is a Namespace?

A **namespace** is a permission boundary that controls who can do what with documents.

Think of it like **folders with access control**:
- Each namespace has specific capabilities
- Only authorized addresses can perform actions
- Hierarchical structure (parent/child namespaces)

### Capabilities Explained

**Capabilities** are specific permissions within a namespace:

| Capability | What it allows |
|-----------|----------------|
| `REGISTER` | Create new document attestations |
| `VERIFY` | Mark documents as verified |
| `REVOKE` | Invalidate existing attestations |
| `TRANSFER` | Change document ownership |
| `ADMIN` | Manage namespace settings |

### Example Structure

```
Company Namespace (Root)
├── HR Department
│   ├── REGISTER (issue employment letters)
│   └── VERIFY (confirm documents)
├── Legal Department
│   ├── REGISTER (create contracts)
│   ├── VERIFY (approve contracts)
│   └── REVOKE (invalidate contracts)
└── Finance Department
    └── REGISTER (issue invoices)
```

### Code Example

```javascript
// Check if address can register in namespace
const hasPermission = await namespace.hasCapability(
  "0x1234...address",
  ethers.id("REGISTER")
);

if (hasPermission) {
  // Proceed with registration
}
```

## Token Standards (Simplified)

Integra uses standard Ethereum token types. Here's what you need to know:

### ERC-721: Unique Items (NFTs)

**What it is**: Each token is unique and indivisible

**Use for:**
- Single ownership documents (real estate deed)
- Unique credentials (diploma)
- One-of-a-kind assets

**Example:**
```javascript
// Mint unique document token
await nft.mint(ownerAddress, documentId);
// Token #1 belongs to Alice
// Token #2 belongs to Bob
```

### ERC-1155: Multi-Tokens

**What it is**: Can represent both unique and fungible tokens in one contract

**Use for:**
- Multiple copies of same document (event tickets)
- Mixed asset types (1000 common shares + 1 preferred share)
- Game items or collectibles with quantities

**Example:**
```javascript
// Mint 100 copies of document type #5
await multiToken.mint(ownerAddress, documentId: 5, amount: 100);
// Can transfer 10 to someone else, keep 90
```

### ERC-20: Fungible Tokens

**What it is**: All tokens are identical and divisible

**Use for:**
- Shares/ownership units (1000 shares of property)
- Rights tokens (100 usage credits)
- Reward points

**Example:**
```javascript
// Mint 1000 divisible tokens
await token.mint(ownerAddress, 1000);
// Can transfer 100.5 tokens to someone
```

### ERC-6909: Minimal Multi-Tokens

**What it is**: Lightweight version of ERC-1155, more gas-efficient

**Use for:**
- Same as ERC-1155 but when gas costs matter
- High-frequency trading of document rights

## Trust Graph

### What is it?

A **trust graph** is a network of verifiable relationships and credentials.

**Analogy**: Think of LinkedIn endorsements, but cryptographically verifiable and immutable.

### How it Works

```
University → Attests → "Alice has CS Degree"
                ↓
          Alice's Profile
                ↓
Employer → Verifies → Alice's credentials
```

### Building Reputation

```javascript
// University creates attestation
const credential = await eas.attest({
  schema: EDUCATION_SCHEMA,
  recipient: aliceAddress,
  data: {
    degree: "Bachelor of Science",
    major: "Computer Science",
    graduationYear: 2024
  }
});

// Anyone can verify
const isValid = await eas.isAttestationValid(credential.uid);
```

### Use Cases

- **Professional Credentials**: Verifiable work history
- **Identity Verification**: KYC without central database
- **Supply Chain**: Track product authenticity through multiple parties
- **Reputation Systems**: Build trust scores based on verified actions

## Smart Contract Immutability

### What Does "Ossified" Mean?

**Ossified** means a smart contract cannot be changed or upgraded. Once deployed, the code is permanent.

**Why this matters:**
- ✅ **Security**: No one can change the rules
- ✅ **Trust**: Users know exactly what the contract does
- ❌ **No fixes**: Bugs cannot be patched
- ❌ **No features**: Cannot add new functionality

### Integra's Approach

Integra uses **ossified contracts** for core registries:
- Document Registry: Immutable record-keeping
- Namespace Registry: Permanent capability structure
- Attestation Provider: Unchangeable attestation logic

**Benefits:**
- Trustless operation
- No rug-pull risk
- Predictable behavior forever

**How we handle updates:**
- New versions deployed as separate contracts
- Users can migrate if they choose
- Old contracts continue working indefinitely

## Gas and Transactions

### What is Gas?

**Gas** is the fee paid to execute transactions on blockchain.

**Analogy**: Like postage stamps - more complex operations cost more gas.

### Gas Costs by Operation

| Operation | Approx. Cost | USD (at $0.50/gwei) |
|-----------|-------------|---------------------|
| Simple transfer | 21,000 gas | ~$0.01 |
| Register document | 80,000 gas | ~$0.04 |
| Create attestation | 120,000 gas | ~$0.06 |
| Mint NFT | 100,000 gas | ~$0.05 |

*Costs vary by network and congestion*

### Optimizing Gas

```javascript
// ❌ Expensive: Multiple transactions
await contract.register(hash1);
await contract.register(hash2);
await contract.register(hash3);

// ✅ Cheaper: Batch operation
await contract.registerBatch([hash1, hash2, hash3]);
```

## Next Steps

Now that you understand the concepts:

1. **[Document Registration](./document-registration)**: Put theory into practice
2. **[Document Verification](./document-verification)**: Verify document authenticity
3. **[Working with Tokens](./working-with-tokens)**: Tokenize documents
4. **[Code Examples](./code-examples)**: See complete implementations

---

**Questions?** Check our [FAQ](./faq) or reach out to developers@integraledger.com
