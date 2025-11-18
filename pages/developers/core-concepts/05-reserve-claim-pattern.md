# Reserve-Claim Pattern: Onboarding Non-Blockchain Users

## Overview

Integra's **Reserve-Claim Pattern** solves a fundamental blockchain adoption problem: **How do you tokenize agreements with people who don't have crypto wallets?**

This pattern enables token issuance for counterparties whose wallet addresses aren't known at contract creation time, making blockchain accessible to mainstream users who've never touched crypto.

### The Problem

Traditional blockchain token issuance:
```
Problem: Need recipient's wallet address BEFORE minting
Blocker: Most people don't have wallets
Result: Can't tokenize real-world agreements with normal people
```

**Real-world scenario:**
- You sell a house to someone who's never used crypto
- You want the deed as an NFT
- Buyer doesn't have a wallet yet
- Traditional approach: BLOCKED (need address to mint)

### Integra's Solution

The Reserve-Claim pattern:
```
1. RESERVE token (address unknown or known)
2. Create CLAIM ATTESTATION (secure permission)
3. Buyer creates wallet (whenever they're ready)
4. CLAIM token using attestation
5. Token MINTED to their new wallet
```

**Result:** Blockchain adoption without requiring upfront crypto knowledge.

## How It Works

### The Document as Identity Anchor

The key innovation: **The blockchain-registered document serves as the identity anchor** for all parties, even before they have wallets.

```solidity
// Step 1: Register the real-world contract (property sale)
bytes32 integraHash = documentRegistry.registerDocument(
    propertySaleDeedHash,  // The real document
    ipfsCID,
    ownershipTokenizer,
    ...
);
```

**This creates:**
- ✅ Permanent document identity (integraHash)
- ✅ Proof of the agreement (documentHash)
- ✅ Owner on record (seller)
- ✅ Identity anchor for future token claims

### Three Reservation Methods

#### Method 1: Named Reservation (Address Known)

**When to use:** Counterparty has a wallet already

```solidity
// Reserve for specific address
ownershipTokenizer.reserveToken(
    integraHash,           // Which document
    0,                     // tokenId (auto-assigned)
    buyerWalletAddress,    // Known address
    1,                     // amount
    processHash
);
```

#### Method 2: Anonymous Reservation (Address Unknown)

**When to use:** Counterparty doesn't have wallet yet

```solidity
// Reserve for unknown address
ownershipTokenizer.reserveTokenAnonymous(
    integraHash,           // Which document
    0,                     // tokenId (auto-assigned)
    1,                     // amount
    encryptedLabel,        // "New Owner" encrypted
    processHash
);
```

**The `encryptedLabel`:**
```javascript
// Off-chain: Encrypt role label
const label = "Property Buyer - John Smith";
const key = keccak256(buyerEmailAddress);  // Or other secret
const encryptedLabel = encrypt(label, key);

// On-chain: Store encrypted
// Later: Buyer can decrypt to see their role
```

#### Method 3: Approval-Based Reservation

**When to use:** Pre-approve multiple potential recipients

```solidity
// Create claim attestation without specific reservation
// Anyone with valid attestation can claim
bytes32 attestationUID = createClaimAttestation(
    integraHash,
    tokenId,
    anyEligibleAddress  // Broader approval
);
```

## The Complete Flow

### Scenario: House Sale with Non-Crypto Buyer

**Setup:**
- Seller (Alice): Has crypto wallet, owns property
- Buyer (Bob): Never used crypto, wants to buy house
- Problem: Bob has no wallet address

**Step 1: Seller Registers Deed**

```solidity
// Alice registers property deed on blockchain
bytes32 deedHash = documentRegistry.registerDocument(
    keccak256(physicalDeedPDF),
    ipfsHashOfDeed,
    ownershipTokenizer,
    executor,
    processHash,
    bytes32(0),
    contactResolverId,
    []
);
```

**Step 2: Seller Reserves Token (Anonymous)**

```solidity
// Alice reserves deed NFT for "the buyer" (address unknown)
ownershipTokenizer.reserveTokenAnonymous(
    deedHash,
    0,  // Auto-assign tokenId
    1,
    encryptedLabel,  // encrypt("Property Buyer - Bob", sharedSecret)
    processHash
);

// Returns: tokenId = 1 (auto-assigned)
```

**What's on-chain now:**
```
Document: deedHash
  ├─ Owner: Alice (0xAAA...)
  ├─ Tokenizer: OwnershipTokenizerV7
  └─ Reserved Token #1:
       ├─ For: address(0) (unknown)
       ├─ Label: 0x encrypted... (buyer can decrypt)
       └─ Status: Reserved (not claimed)
```

**Step 3: Seller Creates Claim Attestation**

```solidity
// Alice creates attestation for Bob's email
// (Bob will prove ownership of email to claim)

bytes32 attestationUID = eas.attest({
    schema: claimSchemaUID,
    data: {
        recipient: deriveAddressFromEmail(bobEmail),  // Deterministic
        data: abi.encode(deedHash, tokenId, CLAIM_CAPABILITY),
        expirationTime: 0,
        revocable: true
    }
});
```

**Step 4: Bob Creates Wallet (Weeks Later)**

```javascript
// Bob downloads MetaMask
// Creates wallet: 0xBBB...

// Proves ownership of email via off-chain system
// System generates claim signature
```

**Step 5: Bob Claims Token**

```solidity
// Bob claims the deed NFT
ownershipTokenizer.claimToken(
    deedHash,
    tokenId,
    attestationUID,  // Proves he's the buyer
    processHash
);
```

**What happens:**
1. ✅ Validates attestation (Bob = authorized recipient)
2. ✅ Validates token reserved for this document
3. ✅ Mints ERC-721 NFT to Bob's wallet (0xBBB...)
4. ✅ Bob now owns property deed as NFT
5. ✅ Trust credentials issued to both Alice and Bob

**Final state:**
```
Token #1 (ERC-721):
  ├─ Owner: Bob (0xBBB...)
  ├─ Bound to: deedHash
  └─ Represents: 123 Main Street property

Alice: Gets trust credential (completed sale as seller)
Bob: Gets trust credential (completed sale as buyer)
```

## The Power of Document-Anchored Identity

### Why This Works

**Traditional NFT approach:**
```
Mint(recipientAddress, tokenId)
  ↓
Requires: recipientAddress MUST exist before minting
Blocker: Can't tokenize if recipient has no wallet
```

**Integra's document-anchored approach:**
```
Register Document (creates identity anchor)
  ↓
Reserve Token (for document, not just address)
  ↓
Create Attestation (proves recipient rights)
  ↓
Recipient creates wallet (whenever ready)
  ↓
Claim Token (using attestation)
  ↓
Minting happens at claim time
```

**The document (integraHash) anchors the agreement, independent of wallet existence.**

### Anonymous Reservation Deep Dive

The anonymous reservation pattern solves multiple real-world challenges:

**Challenge 1: Recipient Unknown**
```solidity
// Property sale: Know buyer will claim, don't know wallet
reserveTokenAnonymous(deedHash, 0, 1, encrypt("Buyer"), processHash);
```

**Challenge 2: Privacy**
```solidity
// Don't want to reveal recipient on-chain yet
reserveTokenAnonymous(
    integraHash,
    tokenId,
    amount,
    encrypt("Board Member A"),  // Role, not identity
    processHash
);
```

**Challenge 3: Delegation**
```solidity
// Executor will determine recipient later
reserveTokenAnonymous(
    integraHash,
    tokenId,
    amount,
    encrypt("Winner of auction #123"),
    processHash
);
```

## Real-World Examples

### Example 1: Real Estate Transaction

**Scenario:** Traditional house sale where buyer uses title company, never touched crypto.

```javascript
// Title company flow
class TitleCompanyIntegration {
    async closePropertySale(saleData) {
        const { sellerWallet, buyerEmail, propertyDeed } = saleData;

        // 1. Register deed (seller has wallet)
        const integraHash = await this.registerDeed(
            propertyDeed,
            sellerWallet
        );

        // 2. Reserve for buyer (NO WALLET YET)
        const label = `Property Buyer - ${buyerEmail}`;
        const encryptedLabel = this.encryptLabel(label, buyerEmail);

        const tokenId = await this.reserveTokenAnonymous(
            integraHash,
            encryptedLabel
        );

        // 3. Create claim attestation tied to email
        const attestationUID = await this.createEmailAttestation(
            integraHash,
            tokenId,
            buyerEmail
        );

        // 4. Send email to buyer
        await this.sendEmail(buyerEmail, {
            subject: "Your property deed is ready to claim",
            body: `
                Your property deed for ${propertyDeed.address} is registered on the blockchain.

                To claim your digital deed:
                1. Create a wallet at https://metamask.io
                2. Click this link: ${claimURL}
                3. Prove ownership of this email
                4. Claim your deed NFT

                You can do this anytime - no rush!
            `,
            claimURL: `https://integra.io/claim/${integraHash}/${tokenId}`,
            attestationUID
        });

        return { integraHash, tokenId, attestationUID };
    }
}
```

**Months later, buyer creates wallet and claims:**

```javascript
// Buyer clicks claim link, creates MetaMask wallet
// Proves email ownership via OAuth
// System generates claim transaction

await ownershipTokenizer.claimToken(
    integraHash,
    tokenId,
    attestationUID,  // Linked to proven email
    processHash
);

// Buyer now has property deed NFT in their brand new wallet
```

### Example 2: Employment Stock Options

**Scenario:** Company grants stock options to employees without crypto wallets.

```javascript
// Company grants options to 100 employees
class StockOptionPlan {
    async grantOptions(employees) {
        const companySharesHash = await this.registerShareDocument();

        for (const employee of employees) {
            // Reserve shares (employees don't have wallets)
            const encryptedLabel = this.encryptLabel(
                `Employee - ${employee.name} - ${employee.shares} shares`,
                employee.email
            );

            const tokenId = await sharesTokenizer.reserveTokenAnonymous(
                companySharesHash,
                0,  // Auto-assign
                employee.shares,  // Amount
                encryptedLabel,
                processHash
            );

            // Create claim attestation
            const attestationUID = await this.createEmployeeAttestation(
                companySharesHash,
                tokenId,
                employee.email,
                employee.hireDate + VESTING_PERIOD
            );

            // Store for employee
            await db.stockGrants.create({
                employeeId: employee.id,
                integraHash: companySharesHash,
                tokenId,
                shares: employee.shares,
                attestationUID,
                vestingDate: employee.hireDate + VESTING_PERIOD,
                claimed: false
            });

            // Email notification
            await this.emailEmployee(employee, {
                shares: employee.shares,
                vestingDate: vestingDate,
                claimURL: `https://company.com/claim-shares/${tokenId}`
            });
        }
    }
}
```

**Employee claims after vesting:**

```javascript
// 1 year later, employee creates wallet
// Proves email ownership
// Claims shares

await sharesTokenizer.claimToken(
    companySharesHash,
    tokenId,
    attestationUID,
    processHash
);

// Employee now has ERC-20 company shares in wallet
```

### Example 3: Multi-Party Business Agreement

**Scenario:** 5-person partnership where some partners are crypto-native, others aren't.

```javascript
// Partnership formation
const partners = [
    { name: "Alice", wallet: "0xAAA...", role: "CEO" },
    { name: "Bob", wallet: null, role: "CTO" },      // No wallet
    { name: "Carol", wallet: "0xCCC...", role: "CFO" },
    { name: "Dave", wallet: null, role: "COO" },      // No wallet
    { name: "Eve", wallet: null, role: "CMO" }        // No wallet
];

// Register partnership agreement
const agreementHash = await documentRegistry.registerDocument(
    partnershipAgreementHash,
    ipfsCID,
    multiPartyTokenizer,
    ...
);

// Reserve tokens for all partners
for (let i = 0; i < partners.length; i++) {
    const partner = partners[i];
    const tokenId = i + 1;

    if (partner.wallet) {
        // Has wallet: Named reservation
        await multiPartyTokenizer.reserveToken(
            agreementHash,
            tokenId,
            partner.wallet,
            1,
            processHash
        );
    } else {
        // No wallet: Anonymous reservation
        const label = `${partner.role} - ${partner.name}`;
        const encryptedLabel = encrypt(label, partner.email);

        await multiPartyTokenizer.reserveTokenAnonymous(
            agreementHash,
            tokenId,
            1,
            encryptedLabel,
            processHash
        );
    }

    // Create claim attestation for each
    await createClaimAttestation(agreementHash, tokenId, partner);
}
```

**What happens:**
- Alice & Carol: Can claim immediately (have wallets)
- Bob, Dave, Eve: Claim later when they create wallets
- Agreement valid on-chain regardless
- All parties eventually get tokens and trust credentials

## The Approval Step: Attestation-Based Claims

### Why Attestations?

The reserve-claim pattern uses **TokenClaimResolverV7** to ensure security:

**Without attestations (insecure):**
```solidity
// Anyone could claim
function claimToken(bytes32 integraHash, uint256 tokenId) external {
    _mint(msg.sender, tokenId);  // ❌ No authorization!
}
```

**With attestations (secure):**
```solidity
// Only authorized recipient can claim
function claimToken(
    bytes32 integraHash,
    uint256 tokenId,
    bytes32 attestationUID  // ← Proof of authorization
) external {
    // Validates:
    // 1. Attestation exists and is valid
    // 2. Attestation was created by document owner/executor
    // 3. Attestation recipient is msg.sender
    // 4. Attestation grants CLAIM capability for this document

    _mint(msg.sender, tokenId);  // ✅ Authorized!
}
```

### Creating Claim Attestations

**As document owner:**

```solidity
// Option 1: Specific recipient (known wallet)
bytes32 attestationUID = eas.attest({
    schema: claimSchemaUID,
    data: {
        recipient: buyerWallet,  // Specific address
        data: abi.encode(integraHash, tokenId, CLAIM_CAPABILITY)
    }
});

// Option 2: Derived address (email, phone, SSN, etc.)
bytes32 deterministicAddress = keccak256(abi.encode(
    "buyer-email@example.com",
    block.chainid
));

bytes32 attestationUID = eas.attest({
    schema: claimSchemaUID,
    data: {
        recipient: deterministicAddress,  // Derived from email
        data: abi.encode(integraHash, tokenId, CLAIM_CAPABILITY)
    }
});
```

## Integration Patterns

### Pattern 1: Email-Based Claims

**Flow:**
```
1. Reserve token anonymously
2. Create attestation for deterministic address derived from email
3. Email user with claim link
4. User proves email ownership (OAuth, magic link, etc.)
5. Backend generates claim transaction with correct wallet
6. User signs and claims
```

**Implementation:**

```javascript
// Backend service
class EmailClaimService {
    // Step 1: Reserve and notify
    async reserveForEmail(integraHash, recipientEmail) {
        // Derive deterministic address from email
        const deterministicAddr = keccak256(
            abiEncode(["string", "uint256"], [recipientEmail, chainId])
        );

        // Reserve token
        const encryptedLabel = encrypt(
            `Buyer - ${recipientEmail}`,
            keccak256(recipientEmail)
        );

        const tx = await tokenizer.reserveTokenAnonymous(
            integraHash,
            0,
            1,
            encryptedLabel,
            processHash
        );

        const tokenId = await this.getTokenIdFromEvent(tx);

        // Create attestation
        const attestationUID = await eas.attest({
            schema: claimSchemaUID,
            data: {
                recipient: deterministicAddr,
                data: abi.encode(integraHash, tokenId, CLAIM_CAPABILITY)
            }
        });

        // Store claim info
        await db.pendingClaims.create({
            email: recipientEmail,
            integraHash,
            tokenId,
            attestationUID,
            deterministicAddress: deterministicAddr
        });

        // Email user
        await this.sendClaimEmail(recipientEmail, integraHash, tokenId);
    }

    // Step 2: User proves email and claims
    async processEmailClaim(email, userWallet, emailProof) {
        // Verify email ownership
        await this.verifyEmailProof(email, emailProof);

        // Get pending claim
        const claim = await db.pendingClaims.findOne({ email });

        // Execute claim (user signs with their wallet)
        const tx = await tokenizer.claimToken(
            claim.integraHash,
            claim.tokenId,
            claim.attestationUID,
            processHash
        );

        // Mark as claimed
        await db.pendingClaims.update(
            { email },
            { claimed: true, claimedBy: userWallet, claimedAt: Date.now() }
        );

        return tx;
    }
}
```

### Pattern 2: SMS-Based Claims

**For mobile-first users:**

```javascript
// Reserve for phone number
const phoneNumber = "+1-555-0123";
const deterministicAddr = keccak256(
    abiEncode(["string"], [phoneNumber])
);

await tokenizer.reserveTokenAnonymous(integraHash, 0, 1, encrypted, processHash);
await createAttestation(integraHash, tokenId, deterministicAddr);

// SMS to user
await sendSMS(phoneNumber, `
    You have a blockchain asset waiting!
    Click: ${claimURL}
    No crypto knowledge needed - we'll guide you.
`);
```

### Pattern 3: QR Code Claims

**For in-person onboarding:**

```javascript
// Event: Conference giving NFT badges to attendees

// 1. Pre-register badges
const badgeHash = await registerBadgeDocument();

// 2. Reserve 1000 anonymous badges
for (let i = 0; i < 1000; i++) {
    await badgeTokenizer.reserveTokenAnonymous(
        badgeHash,
        i,
        1,
        encrypt(`Attendee ${i}`),
        processHash
    );
}

// 3. Generate unique QR codes
for (let i = 0; i < 1000; i++) {
    const claimSecret = generateSecret();
    const attestationUID = await createAttestation(
        badgeHash,
        i,
        deriveAddress(claimSecret)
    );

    const qrCode = generateQRCode({
        url: `https://event.com/claim/${i}`,
        secret: claimSecret,
        attestation: attestationUID
    });

    printBadge(i, qrCode);
}

// 4. Attendee scans QR
// 5. Creates wallet or connects existing
// 6. Claims badge NFT
```

## Encrypted Labels: Privacy-Preserving Role Identification

### What are Encrypted Labels?

When reserving anonymously, you can attach an encrypted label that describes the recipient's role:

```javascript
// Plain text
const label = "Property Buyer - Lot 5 - John Smith";

// Encrypt with shared secret
const key = keccak256(buyerEmail);  // Deterministic key
const encryptedLabel = encrypt(label, key);

// Store on-chain
await tokenizer.reserveTokenAnonymous(
    integraHash,
    tokenId,
    amount,
    encryptedLabel,  // Encrypted blob
    processHash
);
```

**Benefits:**
- ✅ On-chain: Encrypted (no one can read)
- ✅ Off-chain: Buyer can decrypt with key
- ✅ Identifies role without revealing identity
- ✅ Useful for UX (show user their pending claims)

### Decryption Flow

```javascript
// Buyer retrieves encrypted labels for their email
const pendingReservations = await tokenizer.queryFilter(
    tokenizer.filters.TokenReservedAnonymous(integraHash)
);

// Try decrypting each
for (const reservation of pendingReservations) {
    const key = keccak256(myEmail);
    try {
        const label = decrypt(reservation.encryptedLabel, key);
        console.log(`You have a pending claim: ${label}`);
        // Shows: "Property Buyer - Lot 5 - John Smith"
    } catch {
        // Not for this user
    }
}
```

## Comparison with Traditional Approaches

### Approach 1: Require Wallet Upfront

```
Traditional dApp:
  "Connect wallet to continue"
  ↓
  User leaves if they don't have wallet
  ↓
  Adoption failure: 95% drop-off
```

### Approach 2: Custodial Wallets

```
Centralized exchange approach:
  "We'll create a wallet for you"
  ↓
  Custodial (exchange controls keys)
  ↓
  Not self-custody, defeats blockchain purpose
```

### Approach 3: Integra Reserve-Claim

```
Integra approach:
  "We'll reserve your token, claim when ready"
  ↓
  User creates wallet at their own pace
  ↓
  Self-custody, full blockchain benefits
  ↓
  Adoption success: Low friction onboarding
```

## Security Model

### Authorization Flow

```
Reserve (Owner/Executor required):
  ├─ Validates: msg.sender is document owner OR executor
  ├─ Creates: Reservation record
  └─ Emits: TokenReserved or TokenReservedAnonymous

Attestation Creation (Owner/Executor required):
  ├─ Validates: Via TokenClaimResolver
  ├─ Checks: Creator is authorized for document
  ├─ Creates: EAS attestation
  └─ Binds: Attestation to specific recipient

Claim (Recipient required):
  ├─ Validates: Attestation exists and valid
  ├─ Checks: msg.sender is attestation recipient
  ├─ Verifies: Attestation grants CLAIM capability
  ├─ Mints: Token to msg.sender
  └─ Emits: TokenClaimed event
```

### Attack Prevention

**Attack 1: Unauthorized Claim**
```
Attacker tries: claimToken(integraHash, tokenId, fakeAttestation)
Prevention: TokenClaimResolver validates attestation
Result: ❌ Claim reverted (invalid attestation)
```

**Attack 2: Malicious Reservation**
```
Attacker tries: reserveToken(victimDocument, tokenId, attackerAddr)
Prevention: requireOwnerOrExecutor modifier
Result: ❌ Transaction reverted (not authorized)
```

**Attack 3: Attestation Theft**
```
Attacker tries: Use someone else's attestation UID
Prevention: Attestation specifies recipient address
Result: ❌ Claim reverted (wrong recipient)
```

## Integration Benefits

### For Traditional Businesses

1. **No Blockchain Expertise Required** from end users
2. **Gradual Adoption** - users join when ready
3. **Familiar UX** - email/SMS based claims
4. **Self-Custody** - users eventually control keys
5. **Compliance Ready** - audit trail via processHash

### For Developers

1. **Simple API** - reserve + attest + claim
2. **Flexible** - named or anonymous reservations
3. **Secure** - attestation-based authorization
4. **Integrated** - processHash links to your workflows
5. **Standard** - ERC tokens work everywhere after claim

### For Users

1. **No Upfront Wallet** - create when ready
2. **Guided Onboarding** - step-by-step claim process
3. **Email Notifications** - familiar communication
4. **True Ownership** - self-custody after claim
5. **Portable** - standard tokens work everywhere

## Summary

Integra's Reserve-Claim Pattern:

1. **Enables** token issuance for users without wallets
2. **Uses** blockchain-registered document as identity anchor
3. **Supports** both named (address known) and anonymous (address unknown) reservations
4. **Secures** claims via attestation-based authorization (TokenClaimResolver)
5. **Preserves** privacy via encrypted labels
6. **Integrates** with traditional systems via processHash correlation
7. **Provides** gradual, low-friction blockchain onboarding

This makes Integra **the bridge** between traditional business processes and blockchain technology, enabling mainstream adoption without requiring upfront crypto expertise.

## Learn More

- [TokenClaimResolverV7](/developers/document-registration/token-claim-resolver.md) - Attestation validation
- [Document-Token Binding](/developers/document-token-binding.md) - Document identity architecture
- [ProcessHash Integration](/developers/process-hash-integration.md) - Workflow correlation
- [Trust Graph](/developers/trust-graph/overview.md) - Reputation building
- [Integration Guide](/developers/guides/integration.md) - Complete integration examples
