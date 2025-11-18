# Privacy Architecture: Public Proof of Private Information

## The Foundational Problem

### Why Integra Exists

Integra was created to solve a fundamental privacy paradox in document automation:

**The Problem:**
```
Two parties need to collaborate on a contract
  ↓
Document contains sensitive information (PII, terms, financials)
  ↓
Cloud SaaS platforms require uploading to shared space
  ↓
BLOCKED: Privacy and security policies prohibit sharing raw documents
  ↓
Result: Manual processes, no automation possible
```

**Real-world scenarios:**
- Healthcare providers can't share patient records in DocuSign
- Law firms can't upload privileged documents to cloud platforms
- Financial institutions can't share transaction details in collaboration tools
- Government agencies can't share classified documents in shared systems

### The Foundational Insight

**Parties don't need to share the document - they need to share a reference to the document.**

Instead of:
```
Upload document to shared cloud → Privacy breach
```

Use:
```
Register document hash on blockchain → Shared immutable identifier
Each party keeps document → Privacy preserved
Coordinate using blockchain identifier → Automation enabled
```

## The Core Philosophy: Public Proof of Private Information

Integra's entire architecture follows this pattern:

```
Private Information → Cryptographic Proof → Public Blockchain

Document content → Document hash → integraHash (on-chain)
User identity → Attestation → EAS attestation (on-chain)
Payment details → Encrypted payload → Payment signal (on-chain)
```

**What's public:** Proofs, hashes, encrypted references
**What's private:** Actual documents, identities, payment details
**What's enabled:** Coordination, automation, verification

## Privacy Layers in Integra

### Layer 1: Document Privacy

#### Document Hash (Content Proof)

```solidity
// Private: Actual document content
const document = readFile("purchase-agreement.pdf");
const documentContent = document.bytes;

// Public: Cryptographic proof
const documentHash = keccak256(documentContent);
// = 0xabc123... (proves content without revealing it)

// On-chain: Just the hash
documentRegistry.registerDocument(
    documentHash,  // ← Hash only, not content
    ...
);
```

**What this achieves:**
- ✅ Proves document exists and is specific content
- ✅ Parties can verify they have the same document (compare hashes)
- ✅ Cannot reverse-engineer document from hash
- ✅ No sensitive data on public blockchain

#### Encrypted Reference Field

```solidity
// Private: Document location
const ipfsCID = "QmYwAPJzv5CZsnA..."; // Private IPFS
const encryptionKey = keccak256(sharedSecret);
const encryptedReference = encrypt(ipfsCID, encryptionKey);

// On-chain: Encrypted reference
documentRegistry.registerDocument(
    documentHash,
    encryptedReference,  // ← Encrypted, not plaintext
    ...
);
```

**What this achieves:**
- ✅ Document location on-chain (for authorized parties)
- ✅ Encrypted (only parties with key can access)
- ✅ Prevents on-chain correlation (can't link documents)
- ✅ Enables document retrieval without exposing location publicly

#### Random Document ID (integraHash)

```solidity
// Not just hash of content!
integraHash = keccak256(abi.encodePacked(
    documentHash,
    referenceHash,
    msg.sender,
    block.timestamp  // ← Randomness from timing
));
```

**Why randomness matters:**
```
Without randomness:
  - Same document → same integraHash
  - Can correlate across registrations
  - Privacy leak

With randomness:
  - Same document → different integraHash each time
  - Cannot correlate registrations
  - Privacy preserved
```

### Layer 2: Identity Privacy

#### Ephemeral Wallets Per Document

**Concept:** Use a new wallet address for each document

```javascript
// User's primary wallet (known identity)
const primaryWallet = "0x123...";

// Generate ephemeral wallet for each document
const ephemeral1 = deriveEphemeralWallet(primaryWallet, documentIndex: 1);
const ephemeral2 = deriveEphemeralWallet(primaryWallet, documentIndex: 2);
const ephemeral3 = deriveEphemeralWallet(primaryWallet, documentIndex: 3);

// Use ephemeral for document operations
await documentRegistry.registerDocument(..., { from: ephemeral1 });
await tokenizer.claimToken(..., { from: ephemeral2 });
```

**Privacy achieved:**
```
On-chain view:
  - Address 0xAAA... registered document
  - Address 0xBBB... claimed token
  - Address 0xCCC... received payment
  ✅ No visible link between addresses
  ✅ Cannot determine these are same person
  ✅ Cannot build complete profile of user's activities

Off-chain (user chooses to prove):
  - All three addresses belong to Alice
  - Alice has 3 contracts
  - Selective disclosure when needed
```

#### Deterministic Ephemeral Wallets

**For private correlation:**

```javascript
// Derive ephemeral wallet deterministically
function deriveEphemeralWallet(primaryWallet, documentIndex, secret) {
    const derivationPath = keccak256(
        abi.encode(primaryWallet, documentIndex, secret)
    );
    return ethereumWallet.fromPrivateKey(derivationPath);
}

// User can:
// ✅ Regenerate same ephemeral for document access
// ✅ Prove ownership of ephemeral (via signature)
// ✅ Maintain private correlation (only user knows link)

// Public observers:
// ❌ Cannot link ephemerals to primary
// ❌ Cannot correlate user's activities
// ❌ Cannot build comprehensive profile
```

### Layer 3: Attestation Privacy (Off-Chain Identity, On-Chain Proof)

#### The EAS Pattern

```solidity
// Private: User identity and capabilities
{
    userName: "Alice Johnson",
    email: "alice@example.com",
    capabilities: ["CLAIM", "TRANSFER"],
    documentId: "contract-123",
    role: "Buyer"
}

// Public: Cryptographic attestation
EAS Attestation:
  ├─ schema: 0xSCHEMA...
  ├─ recipient: 0xAAA... (ephemeral)
  ├─ data: abi.encode(capabilityBitmask, integraHash)
  └─ issuer: 0xISSUER...

// ✅ Proves: Recipient has capabilities
// ❌ Reveals: Nothing about who they are
```

**What's on-chain:**
- Attestation UID
- Recipient address (ephemeral)
- Capability bits (encoded)
- Schema reference
- Issuer address

**What's NOT on-chain:**
- User's real name
- User's email
- User's primary wallet
- Document contents
- Specific role details

#### Attestation-Based Authorization

```solidity
function claimToken(
    bytes32 integraHash,
    uint256 tokenId,
    bytes32 attestationUID  // ← Just a reference
) external {
    // Validates attestation exists and grants capability
    // Never reveals who issued it or why
    // Just proves: msg.sender is authorized
}
```

### Layer 4: Payment Privacy

#### Encrypted Payment Signals

```solidity
// Private: Payment details
{
    amount: "$2,500.00",
    dueDate: "2024-12-01",
    paymentMethod: "Wire to account #12345",
    memo: "Rent for December"
}

// Encrypt for requestor and payer
const encryptedForRequestor = encrypt(details, requestorPublicKey);
const encryptedForPayer = encrypt(details, payerPublicKey);

// Public: Payment signal on-chain
integraSignal.sendPaymentRequest(
    integraHash,
    requestorTokenId,
    payerTokenId,
    payerAddress,
    encryptedForPayer,     // ← Encrypted payload
    encryptedForRequestor, // ← Encrypted payload
    attestationUID,         // ← Proof of authorization
    invoiceRef,            // ← Reference hash
    displayAmount,         // ← Approximate (for UX)
    currency,
    processHash,
    timeoutDays
);
```

**Privacy achieved:**
```
On-chain:
  ✅ Payment request exists
  ✅ Links to document (integraHash)
  ✅ Links to payer/requestor tokens
  ❌ Amount hidden (encrypted)
  ❌ Payment instructions hidden (encrypted)
  ❌ Account details hidden (encrypted)

Off-chain:
  ✅ Requestor decrypts with their key
  ✅ Payer decrypts with their key
  ✅ No one else can read payment details
```

## The Document-Centric Privacy Model

### Documents as Privacy Boundaries

Each document creates an **isolated privacy context**:

```
Document A (integraHash: 0xAAA...):
  ├─ Parties: Alice (ephemeral: 0xA1), Bob (ephemeral: 0xB1)
  ├─ Document hash: 0xDOC_A
  └─ Reference: encrypted_ref_A

Document B (integraHash: 0xBBB...):
  ├─ Parties: Alice (ephemeral: 0xA2), Carol (ephemeral: 0xC1)
  ├─ Document hash: 0xDOC_B
  └─ Reference: encrypted_ref_B

On-chain observer cannot determine:
  ❌ Alice participated in both contracts
  ❌ Documents are related
  ❌ What documents contain
  ❌ Where documents are stored
```

### Zero-Knowledge Coordination

Parties coordinate using shared identifiers without revealing content:

```javascript
// Alice and Bob negotiate contract off-chain
// Each has full document privately

// Alice: "I'll register our agreement"
const documentHash = keccak256(agreementPDF);
const integraHash = await documentRegistry.registerDocument(
    documentHash,
    encryptedIPFSReference,
    ...
);

// Alice tells Bob off-chain: "integraHash is 0xAAA..."

// Bob verifies he has the same document
const bobsHash = keccak256(hisCopyOfAgreementPDF);
const onChainHash = await documentRegistry.getDocumentHash(integraHash);

if (bobsHash === onChainHash) {
    // ✅ Confirmed: Same document
    // ✅ Both can now coordinate using integraHash
    // ✅ No document content shared
}

// Bob claims his token
await tokenizer.claimToken(integraHash, bobTokenId, attestation, processHash);
```

## Privacy-Preserving Workflows

### Workflow 1: Confidential Business Agreement

```
Scenario: Two companies create joint venture agreement
Privacy requirements:
  - Terms must remain confidential
  - Counter-party relationship must be private
  - Each company has strict data governance policies

Integra solution:
  1. Each party keeps document in their own secure storage
  2. Compute document hash independently
  3. One party registers hash on-chain (integraHash created)
  4. Both verify hashes match
  5. Use integraHash to coordinate automation
  6. Use ephemeral wallets (no public link to corporations)
  7. Payment signals encrypted
  8. Trust credentials issued to ephemerals

Result:
  ✅ Document coordination enabled
  ✅ No document content on-chain
  ✅ No public link to corporate identities
  ✅ Full automation possible
  ✅ Audit trail via processHash
```

### Workflow 2: Healthcare Record Consent

```
Scenario: Patient authorizes provider access to medical records
Privacy requirements:
  - HIPAA compliance (no PHI on public blockchain)
  - Patient controls access
  - Provider needs verifiable authorization

Integra solution:
  1. Patient registers consent document hash
  2. Medical record stays in patient's encrypted storage
  3. Patient creates claim attestation for provider's ephemeral
  4. Provider claims token (proves authorization)
  5. Provider uses integraHash to request document off-chain
  6. Patient's system verifies provider has token
  7. Document shared privately, peer-to-peer

On-chain:
  ✅ Consent exists (integraHash)
  ✅ Provider authorized (has token)
  ❌ No medical records
  ❌ No patient identity
  ❌ No provider identity
  ❌ No correlation between patients
```

### Workflow 3: Real Estate Transaction

```
Scenario: Property sale with title company
Privacy requirements:
  - Property details private
  - Purchase price confidential
  - Buyer/seller identities protected

Integra solution:
  1. Title company registers deed hash (not deed)
  2. Reference encrypted (only parties can access)
  3. Buyer and seller use ephemeral wallets
  4. Payment signal with encrypted amount
  5. Token transfer represents ownership transfer
  6. Trust credentials to ephemerals (not primary wallets)

On-chain:
  ✅ Property deed verified (hash)
  ✅ Ownership transferred
  ❌ Property address not visible
  ❌ Purchase price not visible
  ❌ Real identities not linked
  ❌ Cannot correlate to other properties
```

## The "Shared Immutable Identifier" Pattern

### Traditional Collaboration (Privacy Problem)

```
Option 1: Cloud collaboration (Dropbox, Google Drive)
  ├─ Upload document to shared space
  ├─ Both parties access same file
  ├─ Problem: Document in third-party hands
  └─ Blocked: Security policies prohibit

Option 2: Email back and forth
  ├─ Send document via email
  ├─ Version confusion (which is current?)
  ├─ Problem: No shared state
  └─ Result: Manual, error-prone
```

### Integra's Solution (Privacy Preserved)

```
Blockchain as coordination layer:

Party A's Environment:
  ├─ Document in secure storage (encrypted)
  ├─ Generates: documentHash
  └─ Registers: integraHash on-chain

Party B's Environment:
  ├─ Document in secure storage (encrypted)
  ├─ Generates: documentHash (same!)
  └─ Verifies: Matches on-chain hash

Shared coordination:
  ├─ Both use integraHash to coordinate
  ├─ Automate workflows using identifier
  ├─ Neither party shares actual document
  └─ Privacy policies satisfied
```

## Privacy Techniques in Detail

### 1. Hash-Based Document Proof

**What's registered:**
```solidity
bytes32 documentHash = keccak256(documentContent);
```

**Properties:**
- One-way: Cannot derive document from hash
- Deterministic: Same document = same hash
- Verifiable: Parties can verify independently
- Collision-resistant: Different documents = different hashes

**Privacy guarantee:** Document content never touches blockchain.

### 2. Encrypted Reference Field

**Purpose:** Enable document association without on-chain correlation

```solidity
// Private: IPFS CID or document URL
const reference = "QmYwAPJzv5CZsnA...";

// Encrypt with shared secret
const key = keccak256(abi.encode(
    documentHash,
    sharedSecret
));
const encryptedReference = encrypt(reference, key);

// On-chain: Encrypted blob
documentRegistry.registerDocument(
    documentHash,
    encryptedReference,  // ← Cannot be read publicly
    ...
);
```

**Privacy achieved:**
- ✅ Parties with key can access document
- ✅ Public observers cannot
- ✅ Cannot correlate documents by reference
- ✅ Each document has unique encrypted reference

**Use cases:**
- Link to private IPFS
- Link to party's secure server
- Link to encrypted storage (Arweave, Filecoin)
- Link to document management system

### 3. Randomized Document Identifier (integraHash)

**Non-deterministic generation:**

```solidity
integraHash = keccak256(abi.encodePacked(
    documentHash,
    referenceHash,
    msg.sender,
    block.timestamp  // ← Random element
));
```

**Why this matters:**

```
Deterministic approach (BAD):
  integraHash = keccak256(documentHash)
  ↓
  Problem: Same document → same integraHash
  Privacy leak: Can correlate registrations
  Example: "This is the 5th registration of this template"

Random approach (GOOD):
  integraHash = keccak256(documentHash + timestamp + ...)
  ↓
  Benefit: Same document → different integraHash each time
  Privacy win: Cannot correlate registrations
  Example: Cannot tell if documents are related
```

### 4. Ephemeral Wallet Architecture

**One wallet per document:**

```javascript
// User's primary wallet (long-term identity)
const primaryWallet = "0x123...";

// Generate unique ephemeral for each document
const ephemeral1 = deriveWallet(primary, seed, index: 1);
const ephemeral2 = deriveWallet(primary, seed, index: 2);
const ephemeral3 = deriveWallet(primary, seed, index: 3);

// Use ephemeral for all document operations
await registerDocument({ from: ephemeral1 });
await claimToken({ from: ephemeral2 });
await sendPayment({ from: ephemeral3 });
```

**Privacy achieved:**

```
On-chain analysis:
  - Address 0xAAA... has 1 document
  - Address 0xBBB... has 1 document
  - Address 0xCCC... has 1 document
  ❌ Cannot determine these are same person
  ❌ Cannot build user's complete document history
  ❌ Cannot track user across contracts

User knows:
  ✅ All ephemerals are mine
  ✅ Can prove ownership when needed
  ✅ Can correlate privately (off-chain)
```

### 5. Off-Chain Identity, On-Chain Proof

**Identity data stays off-chain:**

```javascript
// Private: User identity information
const userIdentity = {
    name: "Alice Johnson",
    email: "alice@example.com",
    ssn: "123-45-6789",
    accreditation: "Verified by SEC",
    kycProvider: "IdentityProvider Inc"
};

// Off-chain: KYC provider verifies

// On-chain: Just the attestation
const attestationUID = await eas.attest({
    schema: kycSchemaUID,
    data: {
        recipient: aliceEphemeralWallet,
        data: abi.encode(
            keccak256(abi.encode(userIdentity)),  // ← Hash only!
            expirationDate,
            verificationType
        )
    }
});
```

**What's on-chain:**
- ✅ Attestation exists
- ✅ Recipient address
- ✅ Hash of identity data
- ✅ Expiration date

**What's NOT on-chain:**
- ❌ Name
- ❌ Email
- ❌ SSN
- ❌ KYC details

**Verification process:**
```solidity
// Smart contract checks
function requireKYC(address user) internal view {
    // Just verifies attestation exists
    require(hasValidKYCAttestation(user), "KYC required");
    // Doesn't know WHO the user is
    // Just knows they're KYC verified
}
```

### 6. Encrypted Payment Details

**Payment requests with privacy:**

```solidity
// Private: Full payment details
const paymentDetails = {
    amount: "$2,500.00 USD",
    bankAccount: "Account #123-456-789",
    routingNumber: "987654321",
    memo: "November rent payment",
    instructions: "Wire transfer by 1st of month"
};

// Encrypt for each party
const encryptedForRequestor = encrypt(details, requestorKey);
const encryptedForPayer = encrypt(details, payerKey);

// On-chain: Encrypted payloads only
integraSignal.sendPaymentRequest(
    integraHash,
    requestorTokenId,
    payerTokenId,
    payerAddress,
    encryptedForPayer,      // ← Only payer can decrypt
    encryptedForRequestor,  // ← Only requestor can decrypt
    attestationUID,
    keccak256("invoice-123"), // Reference hash
    2500,                   // Display amount (for UX)
    "USD",
    processHash,
    30  // 30 days to pay
);
```

**Privacy achieved:**
```
On-chain:
  ✅ Payment request exists
  ✅ Linked to document and parties
  ✅ Approximate amount (for UX)
  ❌ Exact amount hidden
  ❌ Account numbers hidden
  ❌ Payment instructions hidden

Only requestor and payer can:
  ✅ Decrypt full payment details
  ✅ See account information
  ✅ Read payment instructions
```

## Privacy-Preserving Use Cases

### Use Case 1: Law Firm Document Automation

**Requirements:**
- Attorney-client privilege (documents are privileged)
- Cannot upload to third-party cloud
- Need workflow automation
- Multiple parties must coordinate

**Integra implementation:**

```javascript
// Law firm's secure environment
const privilegedDocument = loadFromSecureVault(caseId);
const documentHash = keccak256(privilegedDocument);

// Register hash only (not document)
const integraHash = await documentRegistry.registerDocument(
    documentHash,
    encryptReference(vaultURL, clientKey),  // Only client can decrypt
    tokenizer,
    lawFirmExecutor,
    processHash,
    bytes32(0),
    contactResolverId,
    []
);

// Share integraHash with client (off-chain, secure channel)
sendSecureMessage(client, { integraHash });

// Client verifies independently
const clientHash = keccak256(theirCopyOfDocument);
const matches = (clientHash === documentHash);
// ✅ Verified: Same document, never shared on-chain

// Coordinate using integraHash
// Automate using processHash
// Privacy preserved: Document stays in law firm's vault
```

### Use Case 2: Healthcare Record Management

**Requirements:**
- HIPAA compliance (no PHI on blockchain)
- Patient controls access
- Providers need verifiable authorization
- Audit trail required

**Integra implementation:**

```javascript
// Patient's encrypted health record
const medicalRecord = {
    patientId: "P123456",
    diagnosis: "...",
    treatment: "...",
    prescriptions: [...]
};

// Hash only (not content)
const recordHash = keccak256(JSON.stringify(medicalRecord));

// Patient registers consent
const consentHash = await documentRegistry.registerDocument(
    recordHash,
    encryptReference(recordStorageURL, patientKey),
    accessTokenizer,  // Tracks authorized providers
    patientAutomation,
    processHash,
    bytes32(0),
    bytes32(0),
    []
);

// Patient authorizes provider (ephemeral wallet)
await accessTokenizer.reserveToken(
    consentHash,
    providerTokenId,
    providerEphemeralWallet,
    1,
    processHash
);

// Provider claims authorization token
await accessTokenizer.claimToken(
    consentHash,
    providerTokenId,
    attestationUID,
    processHash
);

// On-chain proof:
  ✅ Consent exists
  ✅ Provider authorized
  ✅ Audit trail (processHash)

// Privacy preserved:
  ❌ No medical records on-chain
  ❌ No patient identity visible
  ❌ No provider identity visible
  ❌ No diagnosis/treatment details
```

### Use Case 3: Financial Transaction Privacy

**Requirements:**
- Transaction amounts confidential
- Account numbers private
- Counterparty relationship hidden
- Regulatory audit trail

**Integra implementation:**

```javascript
// Private transaction
const transaction = {
    amount: 1500000,  // $1.5M
    fromAccount: "Bank A - Account #987654",
    toAccount: "Bank B - Account #123456",
    purpose: "Asset acquisition"
};

const txHash = keccak256(JSON.stringify(transaction));

// Register on-chain (hash only)
const integraHash = await documentRegistry.registerDocument(
    txHash,
    encryptedReference,
    ownershipTokenizer,
    financialExecutor,
    processHash,
    bytes32(0),
    auditResolverId,  // Audit trail
    [complianceResolverId]
);

// Payment signal (encrypted)
await integraSignal.sendPaymentRequest(
    integraHash,
    sellerTokenId,
    buyerTokenId,
    buyerEphemeral,
    encryptedPaymentDetails,  // Account numbers encrypted
    encryptedForSeller,
    attestationUID,
    invoiceHash,
    0,  // Amount hidden (set to 0)
    "USD",
    processHash,
    7  // 7 days
);

// On-chain:
  ✅ Transaction registered
  ✅ Payment requested
  ✅ Audit trail (events + processHash)
  ❌ Amount not visible
  ❌ Accounts not visible
  ❌ Parties not identifiable
```

## Selective Disclosure Architecture

### User Controls Privacy Level

**Level 1: Full Privacy (Default)**
```
Public view:
  - Address 0xAAA... has attestation
  - Nothing else

User reveals: Nothing
```

**Level 2: Selective Statistics**
```
Public view:
  - Same as Level 1

User reveals:
  - "I have 5 completed contracts"
  - "I have 3 rental agreements as tenant"

Proof: Show attestation count, not details
```

**Level 3: Category Disclosure**
```
Public view:
  - Same as Level 1

User reveals:
  - "I completed rental at 123 Main St"
  - Proves: integraHash corresponds to property
  - Off-chain proof linking ephemeral to claim

Privacy preserved: Other contracts still private
```

**Level 4: Full Disclosure**
```
User reveals:
  - All document hashes
  - Links between ephemerals and primary
  - Complete contract history

Use case: Court order, audit, verification
Proof: Cryptographic proof of ownership
```

## Privacy by Default, Proof When Needed

### The Privacy Model

```
Default state:
  ✅ Everything encrypted or hashed
  ✅ Ephemeral wallets (no correlation)
  ✅ Off-chain identity
  ✅ Private document storage

When proof needed:
  ✅ User can selectively prove
  ✅ Cryptographic verification available
  ✅ User controls what to reveal
  ✅ No trust required (math-based proof)
```

### Verification Without Revelation

**Scenario:** Landlord wants to verify tenant's rental history

**Without revealing specifics:**

```javascript
// Tenant proves: "I have 3 completed rentals as tenant"
const proof = {
    attestationCount: 3,
    role: "TENANT",
    allCompleted: true,
    // NO: addresses, properties, dates
};

// Landlord verifies attestations exist
for (attestation of proof.attestations) {
    const valid = await eas.isAttestationValid(attestation.uid);
    const isTenantRole = await checkAttestationRole(attestation, "TENANT");
    const isCompleted = await checkCompletionStatus(attestation);

    // ✅ Verified: Tenant has history
    // ❌ Unknown: Which properties, when, who with
}
```

## Comparison with Other Privacy Approaches

### zkSNARKs/zkSTARKs (Full Zero-Knowledge)

```
Approach: Cryptographic proof of computation
Privacy: Maximum (prove without revealing anything)
Complexity: High (requires circuit design)
Gas cost: Very high (proof verification)

Integra: Selective approach
  - Use ZK where critical (processHash proofs in messaging)
  - Use encryption for most cases (simpler, cheaper)
  - Use hashing for document proofs (efficient)
```

### Encrypted Blockchains (Secret Network, Oasis)

```
Approach: Entire blockchain state encrypted
Privacy: Strong (all data private)
Complexity: Different execution environment
Interoperability: Limited (not standard EVM)

Integra: Public blockchain with privacy layers
  - Standard EVM (works everywhere)
  - Selective encryption (only what needs privacy)
  - Interoperable (standard ERCs, standard attestations)
```

### Permissioned Blockchains (Hyperledger, Corda)

```
Approach: Private blockchain network
Privacy: Strong (controlled participants)
Complexity: Infrastructure overhead
Decentralization: None (controlled network)

Integra: Public blockchain with privacy techniques
  - Fully decentralized
  - No infrastructure needed
  - Privacy via cryptography, not access control
```

## Privacy Guarantees

### What Integra Guarantees

**Document Privacy:**
- ✅ Document content never on-chain
- ✅ Document location encrypted
- ✅ Cannot correlate documents by content
- ✅ Each registration has unique identifier

**Identity Privacy:**
- ✅ Real identities off-chain
- ✅ Ephemeral wallets per document
- ✅ Cannot build comprehensive user profiles
- ✅ Selective disclosure controlled by user

**Transaction Privacy:**
- ✅ Payment amounts encrypted
- ✅ Account details encrypted
- ✅ Only parties can decrypt
- ✅ No public transaction graph

**Coordination Enabled:**
- ✅ Parties can verify document match
- ✅ Automation possible via integraHash
- ✅ Audit trails via processHash
- ✅ Trust credentials without identity exposure

### What's Intentionally Public

**For verifiability:**
- ✅ Document hash (proves content)
- ✅ integraHash (coordination identifier)
- ✅ Attestation existence (proves authorization)
- ✅ Token ownership (proves rights)
- ✅ Transaction events (proves operations occurred)

**This enables:**
- Third-party verification
- Immutable audit trails
- Decentralized trust
- Dispute resolution

## Privacy Best Practices

### For Developers

**1. Always use ephemeral wallets for documents:**
```javascript
// Generate new ephemeral for each document
const ephemeral = deriveEphemeralWallet(primary, documentIndex);
```

**2. Encrypt reference fields:**
```javascript
// Never store plaintext IPFS CIDs
const encrypted = encrypt(ipfsCID, sharedSecret);
```

**3. Use processHash for correlation, not document details:**
```javascript
// Good
processHash = keccak256("workflow-12345");

// Bad
processHash = keccak256("patient-ssn-123-45-6789");  // ❌ PII
```

**4. Minimize on-chain data:**
```javascript
// Store only what's needed for coordination
// Keep everything else off-chain
```

### For Users

**1. Use different wallets per document (maximum privacy)**

**2. Control disclosure:**
```javascript
// Reveal only what's necessary
// Default: Reveal nothing
```

**3. Encrypt payment details:**
```javascript
// Always use encrypted payment signals
// Never post account numbers publicly
```

## Summary

Integra's privacy architecture:

1. **Born from privacy necessity** - Enables collaboration without document sharing
2. **Uses blockchain for coordination** - Not storage
3. **Public proofs of private information** - Hashes, not content
4. **Encrypted references** - Prevent on-chain correlation
5. **Ephemeral wallets** - Prevent identity tracking
6. **Off-chain identity** - On-chain authorization
7. **Encrypted payments** - Private financial details
8. **Selective disclosure** - User controls revelation

**Core principle:** The blockchain provides **shared immutable identifiers** for coordination while actual sensitive data remains in parties' secure environments.

This enables **automation with privacy** - the foundational insight that makes Real World Contracts possible.

## Learn More

- [Document-Token Binding](/developers/document-token-binding.md) - How documents and tokens connect
- [Trust Graph](/developers/trust-graph/overview.md) - Privacy-preserving reputation
- [Reserve-Claim Pattern](/developers/reserve-claim-pattern.md) - Wallet-less onboarding
- [ProcessHash Integration](/developers/process-hash-integration.md) - Workflow correlation
- [Privacy Overview](/developers/privacy/overview.md) - Privacy features summary
