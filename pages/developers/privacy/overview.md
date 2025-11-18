# Privacy: Protecting Sensitive Information on a Public Blockchain

## The Privacy Challenge

Blockchains are public by design. Every transaction, every state change, every piece of data is visible to anyone. This transparency is a feature for financial transactions, but it's a problem for real-world documents that contain:

- Personal identifiable information (PII)
- Medical records
- Financial details
- Trade secrets
- Confidential agreements

**How do we leverage blockchain's benefits while protecting sensitive information?**

## Integra's Privacy Architecture

We solve the privacy challenge through multiple layers of protection:

### 1. Hash-Based References

**What Goes On-Chain**: Cryptographic hash (fingerprint) of the document
**What Stays Off-Chain**: Actual document content

```
Document → SHA-256 Hash → Stored On-Chain
           (32 bytes)

Actual Document → Stored Off-Chain (IPFS, private storage, etc.)
```

The blockchain proves:
- ✅ The document existed at a specific time
- ✅ The document hasn't been modified
- ✅ Who owns or controls the document

The blockchain does NOT reveal:
- ❌ Document contents
- ❌ Personal information
- ❌ Sensitive details

### 2. Selective Disclosure

With Integra, you control who sees what:

**Public Layer** (On-Chain):
- Document hash
- Ownership
- Timestamp
- Smart contract rules

**Private Layer** (Off-Chain, Encrypted):
- Document content
- Metadata
- Attachments
- Annotations

**Access Control** (Smart Contract):
- Owner defines access rules
- Encrypted access tokens
- Time-limited permissions
- Revocable access

### Example: Medical Record

```solidity
On-Chain (Public):
- documentHash: 0x7d2a...  (SHA-256 hash)
- owner: 0xAlice...
- tokenizer: MedicalRecordToken
- timestamp: 2024-01-15

Off-Chain (Encrypted):
- Patient name
- Diagnosis
- Treatment plan
- Lab results
- Doctor notes

Access Rules (Smart Contract):
- Alice (patient): Full access
- Dr. Smith: Read-only, expires 2024-12-31
- Insurance: Specific fields only
- Researcher: Anonymized data only
```

### 3. Zero-Knowledge Proofs

Prove facts about data without revealing the data itself:

**Scenario**: Prove you're over 18 without revealing your birthdate

**Traditional**:
```
User: "Here's my birthdate: 1990-05-15"
Verifier: "Calculates age... yes, over 18"
Problem: Verifier now knows exact birthdate
```

**Zero-Knowledge**:
```
User: "Here's a proof I'm over 18" (cryptographic proof)
Verifier: "Proof is valid, age confirmed"
Result: Verifier knows ONLY that user is 18+
```

Integra uses ZK proofs for:
- Age verification
- Income ranges
- Credential validation
- Compliance checks
- Eligibility confirmation

### 4. Encrypted Metadata

Some information needs to be partially accessible. We use encryption layers:

**Level 1 - Public Metadata**:
```json
{
  "type": "real-estate",
  "category": "residential",
  "chain": "polygon"
}
```

**Level 2 - Encrypted Metadata** (Owner Only):
```json
{
  "address": "123 Main St",
  "sqft": 2500,
  "bedrooms": 3
}
```

**Level 3 - Highly Sensitive** (Multi-Sig Access):
```json
{
  "purchasePrice": 450000,
  "ssn": "***-**-****",
  "bankAccount": "***"
}
```

## Privacy Features in Action

### Document Registration

When you register a document with Integra:

1. **Local Hashing**: Document is hashed on your device
2. **Off-Chain Storage**: Document stored in your chosen location (IPFS, private server, etc.)
3. **On-Chain Record**: Only the hash goes on the blockchain
4. **Access Control**: You define who can access what

```solidity
// What goes on-chain
registerDocument(
  documentHash: 0x7d2a...,      // SHA-256 hash only
  referenceHash: 0x3f1b...,     // Reference to off-chain storage
  owner: 0xYourAddress,
  // ... other non-sensitive params
)
```

### Sharing with Permission

When sharing a document:

1. **Encryption**: Document encrypted with recipient's public key
2. **Access Token**: Smart contract issues access permission
3. **Verification**: Recipient proves ownership of access token
4. **Decryption**: Recipient decrypts with their private key

**You maintain control**:
- Revoke access anytime
- Set expiration dates
- Limit scope of access
- Track who accessed when

### Resolver Privacy

Integra's resolver system allows privacy-preserving services:

**Public Resolver**:
```
Location: On-chain registry
Data: Non-sensitive contact info
Access: Anyone can read
```

**Private Resolver**:
```
Location: Off-chain service
Data: Encrypted contact details
Access: Permission required
```

**Encrypted URL Resolver**:
```solidity
// SimpleContactResolverV7
encryptedURL = "encrypted://aes256:..."
// Only authorized parties can decrypt
```

## Privacy Best Practices

### For Document Owners

1. **Never put sensitive data on-chain** - Use hashes and references
2. **Encrypt metadata** - Even "less sensitive" data should be encrypted
3. **Use strong access controls** - Define clear permission rules
4. **Regularly rotate keys** - Update encryption keys periodically
5. **Monitor access** - Track who accesses your documents

### For Developers

1. **Hash before storing** - Always hash sensitive data
2. **Validate access** - Always check permissions before revealing data
3. **Use proven encryption** - Stick to AES-256, RSA-2048+
4. **Implement key management** - Secure key storage and rotation
5. **Audit access logs** - Track and monitor all access

### For Organizations

1. **Privacy by design** - Build privacy into workflows
2. **Minimal on-chain data** - Only store what's necessary
3. **Compliance first** - GDPR, HIPAA, SOC2 compliance
4. **Regular audits** - Security and privacy reviews
5. **User education** - Train users on privacy features

## Compliance & Regulations

### GDPR (General Data Protection Regulation)

**Challenge**: "Right to be forgotten" conflicts with blockchain immutability

**Integra Solution**:
- Personal data never on-chain (only hashes)
- Off-chain data can be deleted
- Access control enforces consent
- Audit trails for compliance

### HIPAA (Health Insurance Portability and Accountability Act)

**Requirements**:
- Encryption of health data
- Access controls
- Audit trails
- Minimum necessary disclosure

**Integra Implementation**:
- ✅ All health data encrypted off-chain
- ✅ Smart contract access controls
- ✅ Immutable audit trail on-chain
- ✅ Selective disclosure mechanisms

### CCPA (California Consumer Privacy Act)

**Requirements**:
- Right to know what data is collected
- Right to delete data
- Right to opt-out of data sales

**Integra Implementation**:
- ✅ Transparent on-chain records
- ✅ Off-chain data deletion
- ✅ User-controlled permissions

## Privacy Technologies Used

### Cryptographic Hashing
- **SHA-256**: Document fingerprints
- **Keccak-256**: Ethereum-compatible hashing
- **IPFS CID**: Content addressing

### Encryption
- **AES-256**: Symmetric encryption for data
- **RSA-2048**: Asymmetric encryption for keys
- **ECIES**: Elliptic curve integrated encryption

### Zero-Knowledge Proofs
- **zk-SNARKs**: Succinct non-interactive proofs
- **Groth16**: Efficient proof system
- **Custom circuits**: Application-specific proofs

### Access Control
- **EAS Attestations**: Verifiable credentials
- **Multi-sig**: Multi-party access control
- **Time-locks**: Temporary access grants

## Privacy Trade-offs

We believe in transparent trade-offs:

### Maximum Privacy
- ✅ Complete data privacy
- ❌ Limited transparency
- ❌ Harder to verify
- **Use case**: Personal medical records

### Balanced Privacy
- ✅ Good privacy protection
- ✅ Verifiable properties
- ✅ Regulatory compliance
- **Use case**: Most business documents

### Public Transparency
- ✅ Full transparency
- ✅ Easy verification
- ❌ No privacy
- **Use case**: Public records, certificates

You choose the right balance for your use case.

## Real-World Examples

### Example 1: Real Estate Transaction

**Public On-Chain**:
- Property token ID
- Owner address
- Transfer history
- Smart contract terms

**Private Off-Chain**:
- Property address
- Purchase price
- Buyer/seller identities
- Financial details

**Result**: Provable ownership without revealing sensitive details

### Example 2: Educational Credential

**Public On-Chain**:
- Credential hash
- Issuing institution signature
- Issue date
- Revocation status

**Private Off-Chain**:
- Student name
- Grade details
- Course information

**Selective Sharing**:
- Employers verify credential without seeing grades
- Graduate schools see full details with permission

### Example 3: Supply Chain

**Public On-Chain**:
- Product hash
- Manufacturing date
- Transfer checkpoints

**Private Off-Chain**:
- Manufacturing details
- Quality control data
- Supplier information

**Result**: Authenticity verification without revealing trade secrets

## Privacy Resources

### Technical Documentation
- [Access Control Patterns →](/smart-contracts/patterns/access-control)
- [Resolver Privacy →](/smart-contracts/patterns/resolvers)
- [Security Guide →](/smart-contracts/guides/security)

### Implementation Guides
- [Integration Guide →](/smart-contracts/guides/integration)
- [Testing Privacy →](/smart-contracts/guides/testing)

### Related Topics
- [Security Architecture →](/smart-contracts/security/overview)
- [ERC Standards →](/smart-contracts/erc-standards/overview)
- [Purpose & Goals →](/smart-contracts/purpose/overview)

---

*Privacy isn't optional - it's fundamental to real-world blockchain adoption.*
