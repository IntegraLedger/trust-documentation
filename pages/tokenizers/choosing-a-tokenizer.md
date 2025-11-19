# Tokenizer Comparison Guide

## Overview

This guide helps you choose the right tokenizer for your use case by comparing all 11 tokenizer implementations in Integra V7.

## Quick Selection Matrix

| Use Case | Recommended Tokenizer | Token Standard |
|----------|----------------------|----------------|
| Real estate deed (single owner) | OwnershipTokenizerV7 | ERC-721 |
| Purchase agreement (buyer + seller) | MultiPartyTokenizerV7 | ERC-1155 |
| High-volume multi-party docs | MultiPartyTokenizerV7Lite | ERC-6909 |
| Company shares (fractional) | SharesTokenizerV7 | ERC-20 |
| Music royalties (revenue split) | RoyaltyTokenizerV7 | ERC-1155 |
| Property rental (time-based) | RentalTokenizerV7 | ERC-1155 |
| Course completion badges | BadgeTokenizerV7 | ERC-1155 |
| University degree (credential) | SoulboundTokenizerV7 | ERC-721 SBT |
| Escrow agreement | VaultTokenizerV7 | ERC-721 |
| Regulated securities | SecurityTokenTokenizerV7 | ERC-20 |
| Event tickets (semi-fungible) | SemiFungibleTokenizerV7 | ERC-1155 |

## Feature Comparison

| Feature | Ownership | MultiParty | MP Lite | Shares | Royalty | Rental | Badge | Soulbound | Vault | Security | SemiFungible |
|---------|-----------|------------|---------|--------|---------|--------|-------|-----------|-------|----------|--------------|
| **Token Standard** | ERC-721 | ERC-1155 | ERC-6909 | ERC-20 | ERC-1155 | ERC-1155 | ERC-1155 | ERC-721 | ERC-721 | ERC-20 | ERC-1155 |
| **Transferable** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| **Multi-Party** | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ |
| **Fractional** | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| **Trust Graph** | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ |
| **Anonymous Reservation** | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| **Gas Efficiency** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Holder Tracking** | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Unique Per Doc** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ |

## Detailed Comparison

### 1. OwnershipTokenizerV7

**Token Standard**: ERC-721
**Best For**: Single-owner documents

**Characteristics**:
- One NFT per document
- Non-divisible ownership
- Transferable via standard ERC-721
- Simple ownership model

**Use Cases**:
- Real estate deeds
- Vehicle titles
- Copyright ownership
- Exclusive licenses

**Pros**:
- Simple and well-understood
- Maximum composability (works with all NFT infrastructure)
- Clear ownership semantics

**Cons**:
- Cannot split ownership
- Not suitable for multi-party documents

**Gas Costs**: ⭐⭐⭐ (Efficient)

### 2. MultiPartyTokenizerV7

**Token Standard**: ERC-1155
**Best For**: Multi-stakeholder documents

**Characteristics**:
- Token IDs represent roles (1: buyer, 2: seller)
- Anonymous reservations with encrypted labels
- Trust credentials issued when all parties claim
- Bitmap optimization for completion tracking

**Use Cases**:
- Purchase agreements (buyer + seller)
- Lease contracts (tenant + landlord + guarantor)
- Partnership agreements
- Multi-party contracts

**Pros**:
- Full ERC-1155 compatibility
- Privacy-preserving role discovery
- Trust graph integration
- Holder tracking

**Cons**:
- Higher gas costs than Lite version
- Complexity for simple use cases

**Gas Costs**: ⭐⭐ (Standard)
**Gas Optimization**: Bitmap completion check (95% savings)

### 3. MultiPartyTokenizerV7Lite

**Token Standard**: ERC-6909
**Best For**: Gas-sensitive multi-party documents

**Characteristics**:
- ERC-6909 (50% cheaper than ERC-1155)
- No mandatory callbacks
- Simpler approval system
- No holder tracking (gas savings)

**Use Cases**:
- High-volume multi-party docs
- Gas-sensitive applications
- Simple multi-stakeholder scenarios

**Pros**:
- 50% gas savings vs ERC-1155
- Used by Uniswap V4 (battle-tested)
- Simpler implementation

**Cons**:
- Fewer features than full MultiParty
- Less ecosystem support than ERC-1155
- No holder tracking

**Gas Costs**: ⭐⭐⭐⭐ (Very Efficient)

### 4. SharesTokenizerV7

**Token Standard**: ERC-20
**Best For**: Fractional ownership

**Characteristics**:
- Fungible shares
- Proportional ownership
- Standard ERC-20 transfers
- No anonymous reservations (ERC-20 limitation)

**Use Cases**:
- Company shares/equity
- Partnership interests
- Cooperative memberships
- Fractional real estate

**Pros**:
- Universal ERC-20 support
- Easy DeFi integration
- Simple fractional model

**Cons**:
- No role differentiation
- Cannot use anonymous reservations
- Less suitable for distinct parties

**Gas Costs**: ⭐⭐⭐ (Efficient)

### 5. RoyaltyTokenizerV7

**Token Standard**: ERC-1155
**Best For**: Revenue split agreements

**Characteristics**:
- Token amounts = basis points (10000 = 100%)
- Enforces 100% total allocation
- Proportional revenue distribution
- Multiple stakeholders with % splits

**Use Cases**:
- Music royalties (artist 40%, producer 30%, label 30%)
- Content revenue splits
- IP licensing with multiple rights holders
- Partnership profit sharing

**Pros**:
- Built-in percentage validation
- Clear revenue split model
- Supports multiple parties

**Cons**:
- Requires 100% allocation (can't partially allocate)
- Basis points may be confusing initially

**Gas Costs**: ⭐⭐ (Standard)
**Special Validation**: Total allocation must equal 10,000 (100%)

### 6. RentalTokenizerV7

**Token Standard**: ERC-1155
**Best For**: Time-based access rights

**Characteristics**:
- Time-limited access rights
- Expiration tracking per token
- Revocable after expiration

**Use Cases**:
- Property rentals
- Equipment leases
- Subscription access
- Temporary licenses

**Pros**:
- Time-based access model
- Expiration tracking
- Suitable for recurring agreements

**Cons**:
- Requires time management
- Additional complexity vs simple tokens

**Gas Costs**: ⭐⭐ (Standard)

### 7. BadgeTokenizerV7

**Token Standard**: ERC-1155
**Best For**: Achievement badges and credentials

**Characteristics**:
- Non-fungible achievement tokens
- Multiple badge types per document
- Trust credentials for verifiable achievements
- Transferable (unlike Soulbound)

**Use Cases**:
- Course completion badges
- Skill credentials
- Access levels (bronze, silver, gold)
- Event attendance badges

**Pros**:
- Trust graph integration
- Multiple badge types
- Transferable (can gift/sell)

**Cons**:
- If transferability is unwanted, use Soulbound instead

**Gas Costs**: ⭐⭐ (Standard)

### 8. SoulboundTokenizerV7

**Token Standard**: ERC-721 (Non-Transferable)
**Best For**: Non-transferable credentials

**Characteristics**:
- Cannot be transferred (soulbound)
- Permanently tied to recipient
- Implements transfer blocking via `_update` override
- One credential per document

**Use Cases**:
- University degrees
- Professional certifications
- Identity documents
- Verified memberships

**Pros**:
- Permanent binding to recipient
- Cannot be sold or transferred
- Clear credential semantics

**Cons**:
- No transfer means no secondary market
- Cannot recover if wallet lost

**Gas Costs**: ⭐⭐⭐ (Efficient)
**Security**: Blocks all transfers (from != 0 && to != 0)

### 9. VaultTokenizerV7

**Token Standard**: ERC-721
**Best For**: Custody and escrow agreements

**Characteristics**:
- Represents custody rights
- Optional vault value tracking
- Standard NFT transfers
- One custody token per document

**Use Cases**:
- Escrow agreements
- Custody documents
- Vault access rights
- Collateral agreements

**Pros**:
- Clear custody semantics
- Value tracking built-in
- Simple model

**Cons**:
- Basic implementation (extend for complex escrow logic)

**Gas Costs**: ⭐⭐⭐ (Efficient)

### 10. SecurityTokenTokenizerV7

**Token Standard**: ERC-20
**Best For**: Regulatory-compliant securities

**Characteristics**:
- ERC-20 fungible tokens
- Compliance via attestation-based access control
- Transfer restrictions via capability requirements
- No anonymous reservations

**Use Cases**:
- Regulated stocks/bonds
- Compliant token offerings
- Accredited investor shares
- Transfer-restricted assets

**Pros**:
- Built-in compliance model
- Attestation-based restrictions
- Standard ERC-20 base

**Cons**:
- Requires compliance infrastructure
- More complex than basic shares

**Gas Costs**: ⭐⭐⭐ (Efficient)
**Compliance**: Capability attestations control transfers

### 11. SemiFungibleTokenizerV7

**Token Standard**: ERC-1155
**Best For**: Semi-fungible tokens

**Characteristics**:
- Hybrid fungible/non-fungible
- Token IDs represent types
- Quantities per type
- Similar to MultiParty but quantity-focused

**Use Cases**:
- Event tickets (VIP, General, etc.)
- Game items (Sword Class 1, 2, 3)
- Limited editions (Series A, B, C)

**Pros**:
- Flexible fungibility model
- Efficient for quantity-based types
- Well-suited for gaming/tickets

**Cons**:
- Complexity if simple NFT suffices

**Gas Costs**: ⭐⭐ (Standard)

## Decision Tree

```
Do you need transferable tokens?
├─ NO → SoulboundTokenizerV7 (credentials, degrees)
└─ YES
   ├─ Single owner or multiple parties?
   │  ├─ SINGLE → OwnershipTokenizerV7 (deeds, titles)
   │  └─ MULTIPLE
   │     ├─ Distinct roles (buyer/seller)?
   │     │  ├─ YES → MultiPartyTokenizerV7 (contracts, agreements)
   │     │  │  └─ Need extreme gas efficiency?
   │     │  │     └─ YES → MultiPartyTokenizerV7Lite (high volume)
   │     │  └─ NO
   │     │     ├─ Revenue split needed?
   │     │     │  └─ YES → RoyaltyTokenizerV7 (music, IP)
   │     │     └─ Fractional ownership?
   │     │        ├─ YES → SharesTokenizerV7 (company shares)
   │     │        └─ NO → SemiFungibleTokenizerV7 (tickets, items)
   │     │
   │     └─ Time-based access needed?
   │        └─ YES → RentalTokenizerV7 (leases, subscriptions)
   │
   ├─ Achievement/badge system?
   │  └─ YES → BadgeTokenizerV7 (credentials, achievements)
   │
   ├─ Custody/escrow scenario?
   │  └─ YES → VaultTokenizerV7 (escrow, custody)
   │
   └─ Regulatory compliance needed?
      └─ YES → SecurityTokenTokenizerV7 (securities, regulated assets)
```

## Trust Graph Integration

**Tokenizers WITH Trust Graph**:
- MultiPartyTokenizerV7
- MultiPartyTokenizerV7Lite
- SharesTokenizerV7
- RoyaltyTokenizerV7
- RentalTokenizerV7
- BadgeTokenizerV7
- SecurityTokenTokenizerV7
- SemiFungibleTokenizerV7

**Tokenizers WITHOUT Trust Graph**:
- OwnershipTokenizerV7 (single party - no reputation needed)
- SoulboundTokenizerV7 (credentials, not transactions)
- VaultTokenizerV7 (custody, not completion-based)

**Why?** Trust graph issues credentials when document operations complete with multiple parties. Single-party or credential tokenizers don't need this.

## Gas Cost Comparison

**Most Efficient** (⭐⭐⭐⭐):
- MultiPartyTokenizerV7Lite (ERC-6909)

**Very Efficient** (⭐⭐⭐):
- OwnershipTokenizerV7 (ERC-721)
- SharesTokenizerV7 (ERC-20)
- SoulboundTokenizerV7 (ERC-721 SBT)
- VaultTokenizerV7 (ERC-721)
- SecurityTokenTokenizerV7 (ERC-20)

**Standard** (⭐⭐):
- MultiPartyTokenizerV7 (ERC-1155 with bitmap optimization)
- RoyaltyTokenizerV7 (ERC-1155)
- RentalTokenizerV7 (ERC-1155)
- BadgeTokenizerV7 (ERC-1155)
- SemiFungibleTokenizerV7 (ERC-1155)

**Why ERC-1155 is less efficient**: Mandatory callbacks, complex approval system

## Upgradeability

**All tokenizers**:
- UUPS pattern
- Governor-controlled upgrades
- Storage gap preservation
- Proxy-based deployment

## Security Features

**All tokenizers inherit**:
- BaseTokenizerV7 access control
- Per-document executor authorization
- Attestation-based claim verification
- Process hash correlation
- Emergency pause functionality

**Soulbound-specific**:
- Transfer blocking via `_update` override
- Permanent credential binding

**Royalty-specific**:
- 100% allocation enforcement
- Basis points validation

**Security-specific**:
- Compliance attestation requirements
- Transfer restrictions

## Code Reduction

**V6 Style** (duplicated code):
- Each tokenizer: ~700 lines
- Total: ~7,700 lines (11 tokenizers)

**V7 Style** (shared base):
- BaseTokenizerV7: ~315 lines (shared)
- TrustGraphIntegration: ~340 lines (shared)
- Each tokenizer: ~250-350 lines (unique logic)
- Total: ~3,405 lines
- **Reduction**: 56% less code

## Anonymous Reservation Support

**Supported**:
- OwnershipTokenizerV7
- MultiPartyTokenizerV7
- MultiPartyTokenizerV7Lite
- RoyaltyTokenizerV7
- RentalTokenizerV7
- BadgeTokenizerV7
- SoulboundTokenizerV7
- VaultTokenizerV7
- SemiFungibleTokenizerV7

**Not Supported** (ERC-20 limitation):
- SharesTokenizerV7
- SecurityTokenTokenizerV7

**Why?** ERC-20 doesn't support anonymous reservations well (no token IDs, just balances).

## Integration Examples

### Single Owner Document

```solidity
// Use OwnershipTokenizerV7
ownershipTokenizer.reserveToken(integraHash, 0, buyerAddress, 1, processHash);
ownershipTokenizer.claimToken(integraHash, tokenId, attestationUID, processHash);
// Result: Buyer owns ERC-721 NFT
```

### Multi-Party Contract

```solidity
// Use MultiPartyTokenizerV7
multiPartyTokenizer.reserveTokenAnonymous(integraHash, 1, 1, encrypt("buyer"), processHash);
multiPartyTokenizer.reserveTokenAnonymous(integraHash, 2, 1, encrypt("seller"), processHash);
// Each party claims with their attestation
// Result: Both parties have ERC-1155 tokens, trust credentials issued
```

### Royalty Split

```solidity
// Use RoyaltyTokenizerV7
royaltyTokenizer.reserveToken(integraHash, 1, artistAddress, 4000, processHash);  // 40%
royaltyTokenizer.reserveToken(integraHash, 2, producerAddress, 3000, processHash); // 30%
royaltyTokenizer.reserveToken(integraHash, 3, labelAddress, 3000, processHash);    // 30%
// Total: 10000 (100%)
// Result: Proportional revenue split tokens
```

### Soulbound Credential

```solidity
// Use SoulboundTokenizerV7
soulboundTokenizer.reserveToken(integraHash, 0, graduateAddress, 1, processHash);
soulboundTokenizer.claimToken(integraHash, tokenId, attestationUID, processHash);
// Result: Non-transferable credential NFT
// graduate.transferFrom() → REVERTS
```

## Recommendations by Industry

### Real Estate
- Deeds: **OwnershipTokenizerV7**
- Fractional RE: **SharesTokenizerV7**
- Rentals: **RentalTokenizerV7**
- Escrow: **VaultTokenizerV7**

### Finance
- Company shares: **SharesTokenizerV7**
- Securities: **SecurityTokenTokenizerV7**
- Revenue splits: **RoyaltyTokenizerV7**

### Education
- Degrees: **SoulboundTokenizerV7**
- Certificates: **BadgeTokenizerV7**
- Course completion: **BadgeTokenizerV7**

### Media & Entertainment
- Music royalties: **RoyaltyTokenizerV7**
- Event tickets: **SemiFungibleTokenizerV7**
- Content licensing: **MultiPartyTokenizerV7**

### Gaming
- Items: **SemiFungibleTokenizerV7**
- Achievements: **BadgeTokenizerV7**
- Unique assets: **OwnershipTokenizerV7**

### Legal
- Contracts: **MultiPartyTokenizerV7**
- Escrow: **VaultTokenizerV7**
- Compliance docs: **SecurityTokenTokenizerV7**

## Migration Guide

Upgrading from V6 → V7:

**Changes**:
- processHash added to all functions
- Provider abstraction (EAS + future systems)
- Bitmap optimization (MultiParty)
- New tokenizers (Lite, Badge, etc.)

**Breaking**:
- Function signatures changed (processHash parameter)
- Access control model updated

**Compatible**:
- Event structure preserved
- Token standards unchanged (ERC-20/721/1155)

## Further Reading

- [Tokenization Overview](./overview.md) - Full architecture
- Individual tokenizer docs (see below)

## Individual Tokenizer Documentation

- [OwnershipTokenizerV7](./OwnershipTokenizerV7.md)
- [MultiPartyTokenizerV7](./MultiPartyTokenizerV7.md)
- [MultiPartyTokenizerV7Lite](./MultiPartyTokenizerV7Lite.md)
- [SharesTokenizerV7](./SharesTokenizerV7.md)
- [RoyaltyTokenizerV7](./RoyaltyTokenizerV7.md)
- [RentalTokenizerV7](./RentalTokenizerV7.md)
- [BadgeTokenizerV7](./BadgeTokenizerV7.md)
- [SoulboundTokenizerV7](./SoulboundTokenizerV7.md)
- [VaultTokenizerV7](./VaultTokenizerV7.md)
- [SecurityTokenTokenizerV7](./SecurityTokenTokenizerV7.md)
- [SemiFungibleTokenizerV7](./SemiFungibleTokenizerV7.md)
