# Welcome to Integra Smart Contracts

<div className="rwc-hero" style="text-align: center;">
  <h2 style="font-size: 1.5rem; margin-bottom: 1rem; opacity: 0.9;">Introducing</h2>
  <div style="font-size: 35vh; font-weight: 800; line-height: 1; letter-spacing: -0.02em; margin: 0;">RWC</div>
  <h2 style="font-size: 3rem; margin-top: 1rem; opacity: 0.9;">Real World Contracts</h2>
</div>

## What is Integra?

Integra provides blockchain infrastructure for tokenizing real-world documents and assets. Our smart contracts enable you to bring legal documents, certificates, agreements, and other important records onto the blockchain with verifiable ownership, privacy controls, and automated workflows.

### The Revolutionary Concept: Blockchain as Global State Machine

Integra uses the **blockchain as a global state machine** to solve the impossible coordination problem: How do millions of parties with different software, security policies, and no trust coordinate contract execution?

**The foundational challenge Integra solves:**
```
Traditional approach: Requires shared systems
  → Cloud collaboration (violates privacy policies)
  → Point-to-point APIs (N² integration problem)
  → Manual processes (doesn't scale)

Integra approach: Blockchain as coordination layer
  → Each party keeps documents private
  → Register proofs (hashes) on global blockchain
  → Use shared identifiers (integraHash, processHash)
  → Any software can read/write global state
  → Ad hoc coordination across unlimited parties
```

**The breakthrough:** Privacy-preserving coordination at planetary scale - parties coordinate using blockchain identifiers without sharing documents, using any software, with no direct integrations.

[Learn about Blockchain as Global State Machine →](./core-concepts/blockchain-as-global-state-machine)

### Privacy-First Architecture

**Core principle:** Public proof of private information

Integra was born from the need to enable document automation when privacy/security policies prohibit document sharing:

- **Document hashes** (not content) on blockchain
- **Encrypted references** (no correlation)
- **Random identifiers** (no tracking)
- **Ephemeral wallets** (no identity linking)
- **Off-chain identity** with on-chain attestations
- **Encrypted payments** (private financials)

Each party keeps documents in their secure environment, coordinates using blockchain, preserves privacy.

[Learn about Privacy Architecture →](./privacy/architecture)

### The Unique Pattern: Document-Token Binding

Unlike traditional NFTs that only store metadata, Integra uses a **two-layer architecture** that permanently binds ERC tokens (ERC-721, ERC-1155, ERC-20) to real-world documents:

**Document Registry (Layer 1):**
- Permanent document identity (integraHash)
- Cryptographic proof of content (documentHash)
- Immutable ownership records
- Service attachment (resolvers)

**Tokenizers (Layer 2):**
- Standard ERC tokens (work everywhere)
- Bound to document identity
- Verifiable real-world representation

[Learn about Document-Token Binding →](./core-concepts/document-token-binding)

### Privacy-Preserving Trust Graph

When parties complete real-world contracts, Integra automatically issues **social attestations** that build verifiable reputation:

**How it works:**
- Smart contracts automatically attest to participant completion
- Attestations issued to privacy-preserving ephemeral wallets
- Users build trust scores from proven counterparty interactions
- Blockchain-registered contract acts as root credential

**Benefits:**
- Verifiable reputation (not self-attested)
- Privacy-preserving (selective disclosure)
- Counterparty validated (mutual attestation)
- Portable across platforms

[Learn about Trust Graph →](./core-concepts/07-trust-graphoverview)

### Resolver Composition: Unlimited Extensibility

Transform static documents into programmable contracts by attaching **resolver services**:

**What resolvers enable:**
- Automate workflows (expiry, renewal, notifications)
- Enforce compliance (accreditation, jurisdiction, KYC)
- Store metadata (contact info, audit trails)
- Trigger actions (payments, integrations)
- Custom business logic (unlimited possibilities)

**The power:**
- Attach up to 11 services per document (1 primary + 10 additional)
- Create custom resolvers for your specific needs
- No core contract modifications required
- Mix and match for any use case

[Learn about Resolver Composition →](./patterns/resolvers)

### ProcessHash: Universal Application Integration

Every Integra function includes a **processHash** field that correlates blockchain events with off-chain workflows:

**What it enables:**
- Link blockchain transactions to CRM/ERP workflows
- Query all blockchain events for a specific business process
- Track multi-step workflows across multiple contracts
- Integrate with any software system (Salesforce, SAP, DocuSign, etc.)
- Maintain audit trails linking on-chain and off-chain

**The power:**
- Simple correlation mechanism (just include processHash)
- Works across all Integra contracts
- Enables cross-chain workflow tracking
- No additional infrastructure required

[Learn about ProcessHash Integration →](./core-concepts/process-hash-integration)

### Reserve-Claim Pattern: Mainstream Blockchain Adoption

Tokenize agreements with people who don't have crypto wallets using the **reserve-claim pattern**:

**The challenge solved:**
- Most people don't have crypto wallets
- Traditional blockchain requires wallet addresses upfront
- Can't tokenize real-world agreements with normal people

**Integra's solution:**
- **Reserve** tokens for recipients (address unknown or known)
- Document serves as **identity anchor** for all parties
- Create **claim attestations** (secure authorization)
- Recipients create wallets **whenever ready** (days, weeks, months later)
- **Claim** tokens using attestation (self-custody achieved)

**The power:**
- Onboard mainstream users without crypto expertise
- Anonymous reservations with encrypted labels
- Email/SMS-based claims (familiar UX)
- Gradual adoption (claim when ready)

[Learn about Reserve-Claim Pattern →](./core-concepts/reserve-claim-pattern)

### Document vs Token Ownership: Sophisticated Dual-Ownership Model

Integra separates **document control** from **economic interests** - a critical distinction from traditional NFTs:

**Document Owner:**
- Controls registration, configuration, resolvers, executors
- Often a service provider (law firm, title company, platform)
- NOT necessarily the economic beneficiary
- Can transfer administrative control

**Token Holders:**
- Hold economic interests and contractual roles
- Represent parties to the agreement (buyer, seller, tenant, guarantor)
- Receive economic benefits and trust credentials
- The actual stakeholders

**Executors:**
- Automation agents authorized by document owner
- Enable workflow automation without requiring owner transactions
- Backend services, escrow contracts, workflow engines

**Philosophy:**
Integra binds blockchain functionality to traditional contracts - it doesn't replace them. Tokens represent roles and interests in real-world agreements, not speculative assets for trading.

[Learn about Document vs Token Ownership →](./core-concepts/document-vs-token-ownership)

## Why Smart Contracts Matter

Smart contracts are self-executing programs on the blockchain that run exactly as written, without the possibility of downtime, censorship, fraud, or third-party interference. For real-world documents and assets, this means:

- **Verifiable Ownership** - Cryptographic proof of who owns what
- **Immutable Records** - Documents that cannot be altered or lost
- **Automated Processes** - Workflows that execute automatically based on predefined conditions
- **Privacy & Security** - Control over who can access your information
- **Interoperability** - Standards that work across different platforms and chains

## Getting Started

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin: 2rem 0;">

<div style="padding: 1.5rem; border: 1px solid #e5e7eb; border-radius: 8px;">

### Learn the Purpose
Understand what problems Integra solves and how our smart contracts work.

[Explore Purpose →](./introduction/why-real-world-contracts)

</div>

<div style="padding: 1.5rem; border: 1px solid #e5e7eb; border-radius: 8px;">

### Privacy First
Learn how we protect sensitive information while leveraging blockchain transparency.

[Learn About Privacy →](./privacy/overview)

</div>

<div style="padding: 1.5rem; border: 1px solid #e5e7eb; border-radius: 8px;">

### Security Built-In
Discover our security architecture and how we protect your assets.

[Explore Security →](/smart-contracts/security/overview)

</div>

<div style="padding: 1.5rem; border: 1px solid #e5e7eb; border-radius: 8px;">

### Automation Powers
See how smart contracts automate complex workflows and business logic.

[Discover Automation →](/smart-contracts/automation/overview)

</div>

<div style="padding: 1.5rem; border: 1px solid #e5e7eb; border-radius: 8px;">

### ERC Standards
Understand the token standards that power interoperability.

[Learn Standards →](/smart-contracts/erc-standards/overview)

</div>

<div style="padding: 1.5rem; border: 1px solid #e5e7eb; border-radius: 8px;">

### Technical Overview
Dive into the technical architecture and contract details.

[View Architecture →](/smart-contracts/index)

</div>

</div>

## Core Features

### Document Tokenization
Convert real-world documents into blockchain tokens with verifiable ownership and transfer capabilities.

### Privacy Controls
Selective disclosure and encrypted metadata ensure sensitive information stays private while maintaining blockchain transparency.

### Automated Workflows
Smart contracts execute business logic automatically - from rent collection to royalty distribution.

### Cross-Chain Compatibility
Deploy once, work everywhere. Our contracts run on all major EVM-compatible chains.

### Enterprise Ready
Battle-tested patterns, formal verification, and comprehensive security audits.

## Use Cases

- **Real Estate** - Property deeds, titles, and rental agreements
- **Legal Documents** - Contracts, wills, and legal agreements
- **Credentials** - Certificates, licenses, and diplomas
- **Intellectual Property** - Patents, copyrights, and royalties
- **Supply Chain** - Bills of lading, certificates of origin
- **Healthcare** - Medical records and consent forms

## Philosophy

### 永久 (Permanent)
Our foundation contracts are immutable - deployed once and never upgraded. This provides long-term stability and trust.

### 優雅 (Elegant)
Beautiful, readable code with comprehensive documentation. Every line is auditable and understandable.

### 信頼 (Trusted)
Built on proven patterns from industry leaders like OpenZeppelin and EAS (Ethereum Attestation Service).

### 進化 (Evolving)
Upgradeable service layer allows innovation while the core remains stable and secure.

## Next Steps

<div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px; margin: 2rem 0;">

**New to blockchain?** Start with [Purpose](./introduction/why-real-world-contracts) to understand the fundamentals.

**Developer?** Check out the [Technical Overview](/smart-contracts/index) and [Integration Guides](/smart-contracts/guides/integration).

**Security focused?** Review our [Security Architecture](/smart-contracts/security/overview) and [Audit Reports](/smart-contracts/guides/security).

</div>

## Support

- **Documentation**: You're here!
- **GitHub**: [github.com/IntegraLedger/smart-contracts-evm-v7](https://github.com/IntegraLedger/smart-contracts-evm-v7)
- **Security**: [security@integra.io](mailto:security@integra.io)
- **Community**: Join our developer community

---

*Welcome to the future of real-world contracts on the blockchain.*
