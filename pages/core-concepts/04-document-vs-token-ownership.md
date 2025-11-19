# Document Ownership vs Token Ownership

## Overview

Integra implements a **sophisticated dual-ownership model** that separates document control from economic interests. This distinction is fundamental to understanding how Real World Contracts work and differs significantly from traditional NFT platforms.

### The Critical Distinction

**Document Owner:**
- Controls document **configuration and registration**
- Selects tokenizer, resolvers, executors
- Not necessarily the economic beneficiary
- Often a service provider (law firm, title company, platform)

**Token Holder:**
- Holds **economic interests or roles** in the contract
- Represents parties to the agreement (buyer, seller, tenant, guarantor, etc.)
- May have rights to payments, transfers, or specific actions
- The actual stakeholders in the real-world contract

### Why This Matters

Traditional NFT platforms conflate these concepts:
```
NFT Owner = Creator = Economic Beneficiary = Controller
```

Integra separates them for real-world applicability:
```
Document Owner = Registrar/Administrator
Token Holders = Economic Stakeholders
Executor = Automation Agent (optional)
```

## Document Ownership Explained

### What Document Owners Control

**1. Registration Configuration:**
```solidity
// Document owner chooses:
documentRegistry.registerDocument(
    documentHash,
    referenceHash,
    tokenizer,        // ← Which tokenization model
    executor,         // ← Who can automate operations
    processHash,
    identityExtension,
    primaryResolverId, // ← Which services to attach
    additionalResolvers
);
```

**2. Resolver Management:**
```solidity
// Add/remove services
documentRegistry.setPrimaryResolver(integraHash, newResolverId);
documentRegistry.addAdditionalResolver(integraHash, resolverId);
documentRegistry.lockResolvers(integraHash);  // Make immutable
```

**3. Executor Authorization:**
```solidity
// Delegate automation authority
documentRegistry.authorizeDocumentExecutor(integraHash, executorAddress);
```

**4. Ownership Transfer:**
```solidity
// Transfer document control
documentRegistry.transferDocumentOwnership(
    integraHash,
    newOwner,
    "Transferring from law firm to client"
);
```

### What Document Owners DON'T Control

Document owners **cannot**:
- ❌ Modify the document hash (immutable)
- ❌ Change token holders (only tokens can transfer)
- ❌ Access token economic benefits
- ❌ Transfer tokens on behalf of holders
- ❌ Revoke token ownership

## Token Ownership Explained

### What Token Holders Represent

Tokens represent **economic interests and roles** in the underlying contract, NOT just "ownership":

**Economic Interests:**
- Property ownership (buyer gets deed NFT)
- Fractional shares (shareholders get ERC-20 tokens)
- Royalty rights (artists get royalty distribution tokens)
- Rental rights (tenant gets time-based access token)

**Roles & Rights:**
- Guarantor (holds guarantor token, obligated if default)
- Observer (holds observer token, receives notifications)
- Notice recipient (holds notice token, must be informed)
- Voter (holds voting token, participates in decisions)
- Beneficiary (holds beneficiary token, receives distributions)

### Token Holders Control

**1. Their Own Tokens:**
```solidity
// Standard ERC transfers (if transferable)
nft.transferFrom(currentHolder, newHolder, tokenId);
erc20.transfer(recipient, amount);
```

**2. Economic Benefits:**
```solidity
// Claim royalties
royaltyTokenizer.claimRoyalties(tokenId);

// Receive rent payments
rentalTokenizer.collectRentPayment(tokenId);
```

**3. Participatory Rights:**
```solidity
// Vote on matters
governanceTokenizer.vote(proposalId, tokenId, choice);

// Approve actions
multiSigTokenizer.approveAction(actionId, tokenId);
```

## Real-World Ownership Scenarios

### Scenario 1: Law Firm Creating Contract for Client

**Document Owner:** Law Firm
**Token Holders:** Client + Counterparty

```solidity
// Law firm (document owner) registers client's purchase agreement
bytes32 agreementHash = documentRegistry.registerDocument(
    purchaseAgreementHash,
    ipfsCID,
    multiPartyTokenizer,    // Buyer + Seller tokens
    lawFirmExecutor,         // Law firm can automate
    processHash,
    bytes32(0),
    contactResolverId,
    [complianceResolverId]
);

// Document owner: Law firm (0xLAW...)
// Controls: Configuration, resolvers, executor

// Reserve tokens for actual parties
multiPartyTokenizer.reserveToken(
    agreementHash,
    1,  // Buyer token
    clientAddress,  // Client (not law firm)
    1,
    processHash
);

multiPartyTokenizer.reserveToken(
    agreementHash,
    2,  // Seller token
    counterpartyAddress,
    1,
    processHash
);

// Token holders: Client + Counterparty
// Get: Economic interests, trust credentials
// Law firm: Gets nothing (just service provider)

// Later: Transfer document ownership to client
documentRegistry.transferDocumentOwnership(
    agreementHash,
    clientAddress,
    "Transaction complete - transferring control to client"
);
```

### Scenario 2: Title Company Facilitating Property Transfer

**Document Owner:** Title Company
**Token Holders:** Buyer (gets property deed)

```solidity
// Title company registers property deed
bytes32 deedHash = documentRegistry.registerDocument(
    propertyDeedHash,
    ipfsCID,
    ownershipTokenizer,
    titleCompanyExecutor,  // Title company automates
    processHash,
    bytes32(0),
    contactResolverId,
    []
);

// Document owner: Title Company
// Controls: Registry configuration, can update resolvers

// Reserve deed NFT for buyer
ownershipTokenizer.reserveTokenAnonymous(
    deedHash,
    0,
    1,
    encrypt("Property Buyer"),
    processHash
);

// Token holder (after claim): Buyer
// Gets: Property ownership NFT, can sell/transfer property

// Title company gets: Nothing
// Role: Service provider, not economic participant
```

### Scenario 3: Company Issuing Stock to Employees

**Document Owner:** Company (/developers/Finance)
**Token Holders:** Employees (shareholders)

```solidity
// Company registers share document
bytes32 sharesHash = documentRegistry.registerDocument(
    stockCertificateHash,
    ipfsCID,
    sharesTokenizer,
    companyExecutor,  // Automated by company backend
    processHash,
    bytes32(0),
    bytes32(0),
    [complianceResolverId, auditResolverId]
);

// Document owner: Company
// Controls: Share issuance configuration, compliance resolvers

// Issue shares to 100 employees
for (employee of employees) {
    await sharesTokenizer.reserveToken(
        sharesHash,
        0,
        employee.wallet,
        employee.shareAmount,
        processHash
    );
}

// Token holders: Employees
// Get: Company shares (ERC-20), dividends, voting rights

// Company retains document ownership
// Can: Add compliance resolvers, authorize new executor
// Cannot: Take back shares, transfer employee tokens
```

### Scenario 4: Platform Facilitating Multi-Party Agreements

**Document Owner:** Platform
**Token Holders:** Agreement parties

```solidity
// Platform (like DocuSign, but on blockchain)
contract AgreementPlatform {
    function createAgreement(
        bytes32 documentHash,
        address[] parties,
        string[] roles
    ) external returns (bytes32 integraHash) {
        // Platform registers document
        integraHash = documentRegistry.registerDocument(
            documentHash,
            ipfsCID,
            multiPartyTokenizer,
            platformExecutor,  // Platform automates workflow
            processHash,
            bytes32(0),
            contactResolverId,
            [notificationResolverId, auditResolverId]
        );

        // Document owner: Platform
        // Role: Facilitator, automation provider

        // Reserve tokens for all parties
        for (uint i = 0; i < parties.length; i++) {
            multiPartyTokenizer.reserveToken(
                integraHash,
                i + 1,
                parties[i],
                1,
                processHash
            );
        }

        // Token holders: Actual agreement parties
        // Get: Participation tokens, trust credentials

        // Platform gets: Service fees (off-chain)
        // Not: Economic interest in agreement
    }
}
```

## Executor Pattern: Delegated Automation

### What Executors Are

**Executor = Automation Agent** authorized by document owner to execute operations:

```solidity
// Document owner authorizes executor
documentRegistry.authorizeDocumentExecutor(
    integraHash,
    executorContractAddress
);
```

**Executor can:**
- ✅ Reserve tokens (on behalf of document owner)
- ✅ Cancel reservations
- ✅ Call tokenizer functions marked `requireOwnerOrExecutor`
- ✅ Automate workflows programmatically

**Executor cannot:**
- ❌ Change document configuration (resolvers, etc.)
- ❌ Transfer document ownership
- ❌ Claim tokens (only recipients can)
- ❌ Access economic benefits

### Real-World Executor Use Cases

**Use Case 1: Company Backend Automation**

```solidity
// Company authorizes backend service as executor
documentRegistry.authorizeDocumentExecutor(
    employeeSharesDocument,
    companyBackendExecutor  // Smart contract controlled by backend
);

// Backend can now automate stock grants
contract CompanyBackendExecutor {
    function grantEmployeeShares(
        bytes32 sharesHash,
        address employee,
        uint256 amount
    ) external onlyBackendService {
        // Executor reserves shares (no manual transaction from owner)
        sharesTokenizer.reserveToken(
            sharesHash,
            0,
            employee,
            amount,
            processHash
        );

        // Create claim attestation
        // ...
    }
}
```

**Use Case 2: Escrow Service Automation**

```solidity
// Real estate platform authorizes escrow executor
documentRegistry.authorizeDocumentExecutor(
    deedHash,
    escrowExecutor
);

contract EscrowExecutor {
    function releaseOnPayment(
        bytes32 integraHash,
        uint256 tokenId,
        address buyer
    ) external payable {
        require(msg.value >= purchasePrice, "Insufficient payment");

        // Executor reserves token on payment receipt
        ownershipTokenizer.reserveToken(
            integraHash,
            tokenId,
            buyer,
            1,
            processHash
        );

        // Forward payment to seller
        payable(documentOwner).transfer(msg.value);
    }
}
```

**Use Case 3: Workflow Engine Integration**

```solidity
// Document owner authorizes Temporal/Camunda executor
documentRegistry.authorizeDocumentExecutor(
    documentHash,
    workflowEngineExecutor
);

// Workflow engine can automate multi-step processes
contract WorkflowExecutor {
    function executeWorkflowStep(
        bytes32 integraHash,
        string memory stepName,
        bytes memory stepData
    ) external onlyWorkflowEngine {
        if (stepName == "reserve_tokens") {
            // Automated token reservation
            (address[] memory recipients, uint256[] memory amounts) =
                abi.decode(stepData, (address[], uint256[]));

            for (uint i = 0; i < recipients.length; i++) {
                tokenizer.reserveToken(
                    integraHash,
                    i + 1,
                    recipients[i],
                    amounts[i],
                    processHash
                );
            }
        }
    }
}
```

## Tokens Represent Roles, Not Just Assets

### Traditional NFT Model

```
NFT = Asset ownership
  ├─ One token = one asset
  ├─ Transfer = sell asset
  └─ Ownership = economic value

Examples: CryptoPunks, Bored Apes, art NFTs
```

### Integra's Sophisticated Model

```
Token = Role/Interest in multi-party contract
  ├─ Multiple tokens per document (different roles)
  ├─ Transfer = role assignment (not always economic)
  ├─ Ownership = rights and obligations
  └─ Focus: Bind blockchain functionality to traditional contracts

Examples:
```

#### Real Estate Rental

```solidity
Document: Lease Agreement (integraHash: 0xLEASE...)
  ├─ Document Owner: Property Management Company
  │    └─ Controls: Registration, resolvers, automation
  │
  └─ Token Holders (represent roles):
       ├─ Token #1 (Landlord): Property owner
       │    ├─ Rights: Receive rent, end lease
       │    └─ Obligations: Maintain property
       │
       ├─ Token #2 (Tenant): Renter
       │    ├─ Rights: Occupy property, renew lease
       │    └─ Obligations: Pay rent, maintain condition
       │
       └─ Token #3 (Guarantor): Co-signer
            ├─ Rights: Notice of default
            └─ Obligations: Pay if tenant defaults
```

**None of these tokens are "traded" - they represent contractual positions.**

#### Business Partnership

```solidity
Document: Partnership Agreement (integraHash: 0xPART...)
  ├─ Document Owner: Incorporating attorney
  │    └─ Controls: Initial setup, later transferred to partners
  │
  └─ Token Holders (represent partners):
       ├─ Token #1 (Managing Partner - 40% shares)
       ├─ Token #2 (Partner A - 30% shares)
       └─ Token #3 (Partner B - 30% shares)
            ├─ Rights: Profit distribution, voting, management
            └─ Obligations: Capital contributions, fiduciary duties
```

#### Complex Transaction

```solidity
Document: Commercial Property Sale (integraHash: 0xSALE...)
  ├─ Document Owner: Title company
  │    └─ Controls: Transaction workflow, resolvers
  │
  └─ Token Holders (multiple roles):
       ├─ Token #1 (Buyer): Future property owner
       ├─ Token #2 (Seller): Current property owner
       ├─ Token #3 (Lender): Mortgage provider
       ├─ Token #4 (Title Insurance): Risk bearer
       └─ Token #5 (Escrow Agent): Holds funds
            └─ Each has specific rights/obligations in transaction
```

**The token holders are parties to the transaction. The title company (document owner) is the facilitator.**

## Document Ownership Transfer

### When and Why to Transfer Document Ownership

**Scenario 1: Service Provider → Client**

```solidity
// Law firm creates contract for client
bytes32 contractHash = lawFirm.registerClientContract(
    contractHash,
    ipfsCID,
    tokenizer,
    lawFirmExecutor,
    ...
);

// Document owner: Law firm (initially)

// After transaction closes, transfer control to client
documentRegistry.transferDocumentOwnership(
    contractHash,
    clientAddress,
    "Transaction complete - client now controls document configuration"
);

// Document owner: Client (now)
// Client can: Change resolvers, authorize new executor, etc.
```

**Scenario 2: Platform → DAO**

```solidity
// Platform registers DAO governance document
bytes32 daoHash = platform.registerDAODocument(...);

// Document owner: Platform (initially)

// Once DAO established, transfer control
documentRegistry.transferDocumentOwnership(
    daoHash,
    daoMultisigAddress,
    "DAO governance transition - community control"
);

// Document owner: DAO (now)
// DAO controls: Configuration changes via governance
```

**Scenario 3: Individual → Corporation**

```solidity
// Founder registers company shares personally
bytes32 sharesHash = founder.registerShares(...);

// After incorporation, transfer to corporation
documentRegistry.transferDocumentOwnership(
    sharesHash,
    corporationAddress,
    "Post-incorporation - corporate entity control"
);
```

## The Executor Pattern: Delegated Operations

### Executors Enable Automation Without Ownership

**Key concept:** Executors can perform operations on behalf of document owner without being the owner.

**Authorization:**
```solidity
// Document owner authorizes executor
documentRegistry.authorizeDocumentExecutor(
    integraHash,
    executorContractAddress
);

// Later: Revoke authorization
documentRegistry.authorizeDocumentExecutor(
    integraHash,
    address(0)  // Revoke by setting to zero address
);
```

### Executor Capabilities

Executors have **operational authority** but **not ownership**:

```solidity
modifier requireOwnerOrExecutor(bytes32 integraHash) {
    address owner = documentRegistry.getDocumentOwner(integraHash);
    address executor = documentRegistry.getDocumentExecutor(integraHash);

    require(
        msg.sender == owner || msg.sender == executor,
        "Not authorized"
    );
    _;
}

// Functions using this modifier:
function reserveToken(...) external requireOwnerOrExecutor(integraHash) {
    // Both owner and executor can reserve
}

function cancelReservation(...) external requireOwnerOrExecutor(integraHash) {
    // Both can cancel
}
```

**Executors CANNOT:**
```solidity
// These require actual document ownership
function transferDocumentOwnership(...) external {
    require(msg.sender == owner);  // ❌ Executor cannot do this
}

function setPrimaryResolver(...) external {
    require(msg.sender == owner);  // ❌ Executor cannot do this
}
```

### Real-World Executor Examples

**Example 1: Property Management Platform**

```javascript
// Platform manages 1000 rental properties
class PropertyManagementPlatform {
    async setupRentalAutomation(propertyOwner, property) {
        // Owner registers deed, authorizes platform executor
        const deedHash = await documentRegistry.registerDocument(
            property.deedHash,
            property.ipfsCID,
            rentalTokenizer,
            platformExecutorAddress,  // ← Platform authorized
            processHash,
            bytes32(0),
            contactResolverId,
            [lifecycleResolverId, paymentResolverId]
        );

        // Document owner: Property owner
        // Executor: Platform
        // Platform can now automate:
        //   - Reserve tokens for new tenants
        //   - Process rent payments
        //   - Handle lease renewals
        // Without requiring manual transactions from owner
    }

    // Automated tenant onboarding
    async onboardNewTenant(deedHash, tenantEmail) {
        // Platform executor reserves token
        const tx = await rentalTokenizer.reserveTokenAnonymous(
            deedHash,
            2,  // Tenant token
            1,
            encrypt("Tenant", tenantEmail),
            processHash
        );

        // Platform executor creates claim attestation
        // Sends email to tenant
        // Tenant claims when ready
    }
}
```

**Example 2: Corporate Stock Management System**

```solidity
// Corporation authorizes HRIS system as executor
contract CorporateStockExecutor {
    // Authorized executor for company shares document

    function grantOptionsOnVesting() external onlyHRIS {
        // Automatically triggered by HRIS on vesting dates
        Employee[] memory vestedToday = getVestedEmployees(today);

        for (employee in vestedToday) {
            // Executor reserves shares
            sharesTokenizer.reserveToken(
                companySharesHash,
                0,
                employee.wallet,
                employee.vestedAmount,
                processHash
            );

            // Create claim attestation
            createAttestation(
                companySharesHash,
                tokenId,
                employee.wallet
            );

            // Employee can claim shares
        }
    }

    // Called by payroll system
    function processDividend(uint256 totalDividend) external onlyPayroll {
        // Executor can trigger but doesn't receive dividend
        sharesTokenizer.distributeDividend{value: totalDividend}();

        // Dividend goes to token holders (employees)
        // Not to document owner (corporation)
        // Not to executor (HRIS system)
    }
}
```

## Integra's Philosophy: Bind Functionality, Not Replace Contracts

### What Integra Is NOT

**Not a trading platform:**
```
Integra doesn't focus on:
  ❌ Automated token trading
  ❌ NFT marketplaces
  ❌ Speculative asset flipping
  ❌ DeFi liquidity pools
```

### What Integra IS

**A bridge between traditional contracts and blockchain functionality:**

```
Integra enables:
  ✅ Blockchain registration of real-world contracts
  ✅ Cryptographic proof of agreements
  ✅ Automated payments tied to contracts
  ✅ Workflow automation for legal/business processes
  ✅ Trust graph from contract completion
  ✅ Service composition via resolvers
  ✅ Programmable contract lifecycle
```

### The Use Case Difference

**Traditional NFT Platform:**
```
Use case: Buy/sell digital art
Focus: Trading, speculation, marketplace
Goal: Asset liquidity

Example: "Trade this CryptoPunk"
```

**Integra:**
```
Use case: Rental agreement, property sale, partnership
Focus: Contract execution, compliance, automation
Goal: Bind blockchain to traditional agreements

Example: "Automate rent payment for this lease"
```

## Token Transfers: When and Why

### When Tokens Transfer

**Integra tokens CAN transfer**, but transfers represent **role reassignment**, not speculation:

**1. Property Sale:**
```solidity
// Transfer property deed NFT
ownershipNFT.transferFrom(seller, buyer, deedTokenId);
// = Ownership of property transfers
```

**2. Share Sale:**
```solidity
// Transfer company shares
sharesToken.transfer(buyer, shareAmount);
// = Fractional ownership transfers
```

**3. Role Delegation:**
```solidity
// Transfer guarantor position
multiPartyTokenizer.safeTransferFrom(oldGuarantor, newGuarantor, guarantorTokenId);
// = Guarantor obligation transfers
```

**4. Non-Transferable Roles:**
```solidity
// Some tokens represent non-transferable positions
soulboundTokenizer.claimToken(...);
// Cannot transfer (credential, not asset)
```

### Transfer Restrictions

Many Integra tokens have transfer restrictions based on real-world contract requirements:

**Compliance restrictions:**
```solidity
// Security tokens: Only to accredited investors
function _beforeTokenTransfer(from, to, tokenId) internal override {
    require(isAccredited(to), "Recipient not accredited");
}
```

**Role restrictions:**
```solidity
// Guarantor must be approved
function _beforeTokenTransfer(from, to, tokenId) internal override {
    if (tokenData[tokenId].role == GUARANTOR) {
        require(isApprovedGuarantor(to), "Not approved guarantor");
    }
}
```

**Time restrictions:**
```solidity
// Vesting period
function _beforeTokenTransfer(from, to, tokenId) internal override {
    require(
        block.timestamp >= vestingDate[tokenId],
        "Shares not vested"
    );
}
```

## Complete Ownership Matrix

| Role | Controls | Rights | Example |
|------|----------|--------|---------|
| **Document Owner** | Configuration, resolvers, executor | Administrative control | Law firm, title company, platform |
| **Executor** | Operations on behalf of owner | Automation authority | Backend service, escrow contract, workflow engine |
| **Token Holder** | Their tokens, economic benefits | Economic interests, roles | Buyer, seller, shareholder, tenant |
| **Document Creator** | Initial registration | Usually document owner initially | Person/entity registering document |

## Integration Example: Complete Flow

```javascript
// Real estate platform with full ownership model
class RealEstatePlatform {
    // Platform acts as document owner for all listings
    async createListing(sellerData, propertyData) {
        // 1. Platform registers deed (as document owner)
        const integraHash = await documentRegistry.registerDocument(
            propertyData.deedHash,
            propertyData.ipfsCID,
            ownershipTokenizer,
            this.platformExecutor,  // Platform executor for automation
            processHash,
            bytes32(0),
            contactResolverId,
            [lifecycleResolverId, escrowResolverId]
        );

        // Document owner: Platform
        // Role: Facilitator, provides automation

        // 2. Reserve NFT for future buyer (anonymous)
        const tokenId = await ownershipTokenizer.reserveTokenAnonymous(
            integraHash,
            0,
            1,
            encrypt("Property Buyer TBD"),
            processHash
        );

        // 3. When buyer found, create claim attestation
        const buyerEmail = "buyer@example.com";
        const attestationUID = await this.createEmailAttestation(
            integraHash,
            tokenId,
            buyerEmail
        );

        // 4. Buyer creates wallet and claims (self-custody)
        // ... handled by buyer later

        // 5. After closing, transfer document ownership to buyer
        await documentRegistry.transferDocumentOwnership(
            integraHash,
            buyerWallet,
            "Sale complete - buyer now controls document configuration"
        );

        // Final state:
        // - Document owner: Buyer (controls config)
        // - Token owner: Buyer (owns property NFT)
        // - Executor: Platform (still authorized for convenience)
        // - Platform: No ownership, just service provider
    }
}
```

## Summary

Integra's ownership model:

1. **Document Owner** = Administrator/Registrar (not necessarily beneficiary)
2. **Token Holders** = Economic stakeholders and role participants
3. **Executor** = Automation agent (delegated authority)
4. **Tokens** = Roles and interests (not just assets)
5. **Focus** = Bind blockchain functionality to traditional contracts
6. **Philosophy** = Enable automation and proof, not replace legal framework

This sophisticated model enables:
- ✅ Service providers to facilitate without owning
- ✅ Automation without requiring constant owner transactions
- ✅ Multiple parties with different roles in same contract
- ✅ Transfer of administrative control separate from economic transfer
- ✅ Real-world contract complexity represented on-chain

**Integra doesn't replace traditional contracts - it enhances them with blockchain functionality.**

## Learn More

- [Reserve-Claim Pattern](/developers/reserve-claim-pattern.md) - Token issuance for non-wallet users
- [Document-Token Binding](/developers/document-token-binding.md) - How documents and tokens connect
- [Tokenizer Overview](/developers/tokenizer-contracts/overview.md) - Different token models
- [Document Registry](/developers/document-registration/document-registry.md) - Document ownership functions
