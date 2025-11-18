# ERC Standards: The Language of Blockchain Interoperability

## What are ERC Standards?

**ERC** stands for **Ethereum Request for Comments**. An ERC is a technical standard used for smart contracts on Ethereum and EVM-compatible blockchains. Think of them as blueprints or common languages that ensure different smart contracts can talk to each other.

### Why Standards Matter

Imagine if every car manufacturer used different gas pumps, road widths, and traffic signals. Chaos! Standards create interoperability.

**Without Standards**:
```
Wallet A: "Give me your tokens"
Token Contract: "I don't understand 'tokens'"
Wallet A: "Um... give me your assets?"
Token Contract: "What's an 'asset'?"
❌ Nothing works together
```

**With Standards**:
```
Wallet A: "balanceOf(user)"  ← ERC-20 standard
Token Contract: "Returns: 100 tokens"  ← Understands ERC-20
✅ Everything works together
```

When everyone follows the same standards:
- ✅ Wallets can display any token
- ✅ Marketplaces can trade any NFT
- ✅ DApps can integrate any contract
- ✅ Developers don't reinvent the wheel

## Core ERC Standards Used by Integra

### ERC-721: Non-Fungible Tokens (NFTs)

**Purpose**: Unique, one-of-a-kind tokens

**Use Cases**:
- Real estate deeds (each property is unique)
- Legal contracts (each agreement is unique)
- Certificates (each credential is unique)
- Collectibles (each item is unique)

**Key Concept**: Each token has a unique ID and represents a distinct asset.

```solidity
// ERC-721 Core Functions
interface IERC721 {
    // Who owns token #42?
    function ownerOf(uint256 tokenId) external view returns (address);

    // Transfer token #42 to Alice
    function transferFrom(address from, address to, uint256 tokenId) external;

    // How many tokens does Alice own?
    function balanceOf(address owner) external view returns (uint256);

    // Approve Bob to transfer token #42
    function approve(address to, uint256 tokenId) external;
}
```

**Real-World Example**:
```
Property Deed Token #12345
- Represents: 123 Main Street
- Owner: 0xAlice...
- Unique: No two tokens represent the same property
- Transferable: Alice can sell to Bob
- Verifiable: Anyone can verify ownership on blockchain
```

**Integra Contracts Using ERC-721**:
- OwnershipTokenizerV7
- SoulboundTokenizerV7 (non-transferable variant)
- BadgeTokenizerV7
- VaultTokenizerV7

[Learn more about ERC-721 →](https://eips.ethereum.org/EIPS/eip-721)

### ERC-1155: Multi-Token Standard

**Purpose**: Mix of fungible and non-fungible tokens in one contract

**Use Cases**:
- Document types (same contract handles deeds, contracts, certificates)
- Gaming items (weapons, potions, unique artifacts)
- Tickets (general admission vs. VIP seats)
- Fractional ownership (shares of a property)

**Key Concept**: One contract can manage many token types, both unique and identical.

```solidity
// ERC-1155 Core Functions
interface IERC1155 {
    // How many of token type #5 does Alice own?
    function balanceOf(address account, uint256 id) external view returns (uint256);

    // Transfer 10 of token type #5 to Bob
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external;

    // Batch transfer multiple token types at once
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) external;
}
```

**Real-World Example**:
```
Token Type #1: Rental Agreements (fungible)
- Alice owns: 3 rental agreements
- Bob owns: 1 rental agreement
- All type #1 tokens are identical

Token Type #2: Unique Properties (non-fungible)
- Token #2001: Specific apartment
- Token #2002: Different apartment
- Each is unique, max 1 per owner
```

**Integra Contracts Using ERC-1155**:
- SemiFungibleTokenizerV7
- SharesTokenizerV7
- RentalTokenizerV7
- RoyaltyTokenizerV7
- MultiPartyTokenizerV7
- SecurityTokenTokenizerV7

[Learn more about ERC-1155 →](https://eips.ethereum.org/EIPS/eip-1155)

### ERC-165: Interface Detection

**Purpose**: Query if a contract supports a specific interface

**Use Cases**:
- Check if contract is ERC-721 or ERC-1155
- Verify contract capabilities before calling
- Prevent errors from calling unsupported functions

```solidity
// ERC-165
interface IERC165 {
    // Does this contract support interface X?
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// Example usage
function safeTransfer(address token, address to, uint256 id) external {
    // Check if it's an ERC-721
    if (IERC165(token).supportsInterface(type(IERC721).interfaceId)) {
        IERC721(token).safeTransferFrom(msg.sender, to, id);
    }
    // Or check if it's an ERC-1155
    else if (IERC165(token).supportsInterface(type(IERC1155).interfaceId)) {
        IERC1155(token).safeTransferFrom(msg.sender, to, id, 1, "");
    }
}
```

**All Integra contracts implement ERC-165** for interface detection.

[Learn more about ERC-165 →](https://eips.ethereum.org/EIPS/eip-165)

### ERC-2981: NFT Royalty Standard

**Purpose**: Standardized way to query royalty payment information

**Use Cases**:
- Artist royalties on resales
- Creator commissions
- Platform fees
- Revenue sharing

```solidity
// ERC-2981
interface IERC2981 {
    // Get royalty info for a sale
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external
        view
        returns (address receiver, uint256 royaltyAmount);
}

// Example: 5% royalty to original creator
function royaltyInfo(uint256 tokenId, uint256 salePrice)
    external
    view
    returns (address receiver, uint256 royaltyAmount)
{
    return (
        originalCreator[tokenId],  // Who receives royalty
        (salePrice * 500) / 10000  // 5% of sale price
    );
}
```

**Integra Support**:
- RoyaltyTokenizerV7 implements ERC-2981
- Supports perpetual creator royalties
- Marketplace-compatible

[Learn more about ERC-2981 →](https://eips.ethereum.org/EIPS/eip-2981)

## Advanced Standards & Extensions

### ERC-4906: Metadata Update Events

**Purpose**: Notify when NFT metadata changes

```solidity
// Emit when metadata changes
event MetadataUpdate(uint256 tokenId);

// Emit when all metadata changes
event BatchMetadataUpdate(uint256 fromTokenId, uint256 toTokenId);
```

**Use Case**: Document updated → Emit event → Marketplaces refresh metadata

### ERC-5192: Minimal Soulbound Token

**Purpose**: Non-transferable tokens (credentials, achievements)

```solidity
interface IERC5192 {
    // Can this token be transferred?
    function locked(uint256 tokenId) external view returns (bool);

    // Events
    event Locked(uint256 tokenId);
    event Unlocked(uint256 tokenId);
}
```

**Integra Implementation**:
- SoulboundTokenizerV7 uses ERC-5192
- Credentials that can't be transferred
- Attestations tied to identity

[Learn more about ERC-5192 →](https://eips.ethereum.org/EIPS/eip-5192)

## Why Standards Matter for Integra

### 1. Wallet Compatibility

Your Integra tokens work in **any** standard wallet:

```
✅ MetaMask
✅ Coinbase Wallet
✅ Rainbow Wallet
✅ Trust Wallet
✅ Hardware wallets (Ledger, Trezor)
```

**Why?** Because they all understand ERC-721 and ERC-1155.

### 2. Marketplace Compatibility

List your tokenized documents on **any** marketplace:

```
✅ OpenSea
✅ Rarible
✅ LooksRare
✅ Blur
✅ Any future marketplace
```

**Why?** Because they all support ERC-721/1155 standards.

### 3. DApp Integration

Any DApp can integrate with Integra tokens:

```solidity
// DApp doesn't need to know about Integra specifically
// It just knows ERC-721
function acceptPayment(address nftContract, uint256 tokenId) external {
    IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
    // Works with Integra tokens and any other ERC-721!
}
```

### 4. Future-Proof

New tools, wallets, and platforms will automatically work with Integra because they support standard interfaces.

## Standard Compliance in Practice

### Example: Document Token

```solidity
contract OwnershipTokenizerV7 is
    ERC721Upgradeable,        // Core NFT functionality
    ERC721URIStorageUpgradeable,  // Metadata support
    IERC165,                  // Interface detection
    AccessControlUpgradeable  // Permission management
{
    // Standard ERC-721 transfer
    function transferFrom(address from, address to, uint256 tokenId)
        public
        override
    {
        // Custom validation
        require(_isTransferable(tokenId), "Non-transferable");

        // Standard ERC-721 logic
        super.transferFrom(from, to, tokenId);

        // Custom automation
        _updateDocumentOwnership(tokenId, to);
    }

    // Standard interface detection
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override
        returns (bool)
    {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC165).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
```

**Result**: Behaves like any standard NFT while adding custom functionality.

## Metadata Standards

### ERC-721 Metadata JSON Schema

```json
{
  "name": "Property Deed #12345",
  "description": "Tokenized ownership of 123 Main Street",
  "image": "ipfs://QmHash.../image.png",
  "external_url": "https://integra.io/document/12345",
  "attributes": [
    {
      "trait_type": "Document Type",
      "value": "Real Estate Deed"
    },
    {
      "trait_type": "Location",
      "value": "San Francisco, CA"
    },
    {
      "trait_type": "Square Feet",
      "value": 2500,
      "display_type": "number"
    },
    {
      "trait_type": "Registration Date",
      "value": 1640995200,
      "display_type": "date"
    }
  ]
}
```

**This standard metadata works everywhere**:
- ✅ Displayed correctly in OpenSea
- ✅ Searchable by attributes
- ✅ Compatible with all NFT tools

## Integra Token Standards Reference

### Non-Fungible (ERC-721)

| Contract | Standard | Use Case |
|----------|----------|----------|
| OwnershipTokenizerV7 | ERC-721 | Unique document ownership |
| SoulboundTokenizerV7 | ERC-721 + ERC-5192 | Non-transferable credentials |
| VaultTokenizerV7 | ERC-721 | Secure asset storage |

### Fungible (ERC-20)

| Contract | Standard | Use Case |
|----------|----------|----------|
| SharesTokenizerV7 | ERC-20 | Fractional ownership shares |
| SecurityTokenTokenizerV7 | ERC-20 | Regulated securities with compliance |

### Multi-Token (ERC-1155)

| Contract | Standard | Use Case |
|----------|----------|----------|
| SemiFungibleTokenizerV7 | ERC-1155 | Mixed fungible/unique tokens |
| RentalTokenizerV7 | ERC-1155 | Rental agreements |
| RoyaltyTokenizerV7 | ERC-1155 + ERC-2981 | Revenue sharing |
| MultiPartyTokenizerV7 | ERC-1155 | Multi-party agreements |
| BadgeTokenizerV7 | ERC-1155 | Achievement badges |

## Benefits of Standard Compliance

### For Users

1. **Familiar Experience**
   - Works like any other NFT
   - Use your favorite wallet
   - List on any marketplace

2. **Safety**
   - Well-tested code
   - Audited standards
   - Predictable behavior

3. **Portability**
   - Export from one platform
   - Import to another
   - No vendor lock-in

### For Developers

1. **Interoperability**
   - Integrate with existing tools
   - Leverage existing libraries
   - Join ecosystem

2. **Documentation**
   - Well-documented standards
   - Example implementations
   - Community support

3. **Trust**
   - Users understand standards
   - Auditors know what to check
   - Investors recognize quality

### For Organizations

1. **Future-Proof**
   - Standards evolve with ecosystem
   - Automatic compatibility with new tools
   - Long-term viability

2. **Compliance**
   - Industry best practices
   - Regulatory clarity
   - Audit readiness

3. **Integration**
   - Easy partnerships
   - Standard APIs
   - Ecosystem access

## Beyond Token Standards

### OpenZeppelin Contracts

Integra uses OpenZeppelin as the foundation:

```solidity
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
```

**Why OpenZeppelin?**
- ✅ Industry standard
- ✅ Extensively audited
- ✅ Battle-tested
- ✅ Community supported

[Learn more about OpenZeppelin →](https://docs.openzeppelin.com/)

### Ethereum Attestation Service (EAS)

Integra integrates with EAS for verifiable credentials:

```solidity
// EAS Schema for Access Capabilities
struct Attestation {
    bytes32 schema;      // Capability schema
    address recipient;   // Who has the capability
    bytes data;          // Capability data
    uint64 expirationTime;  // When it expires
    bool revocable;      // Can be revoked
}
```

[Learn more about EAS →](/smart-contracts/eas-reference)

## Standard Evolution

Standards evolve over time:

### ERC-721 Evolution
```
2017: ERC-721 Draft
2018: ERC-721 Final
2020: ERC-721 Extensions (metadata, enumerable)
2022: ERC-4906 (metadata updates)
2023: Gas optimizations
```

### Integra's Approach

1. **Start with Standards**
   - Build on proven foundations
   - Follow best practices

2. **Extend Thoughtfully**
   - Add features without breaking compatibility
   - Maintain standard interfaces

3. **Contribute Back**
   - Share innovations with community
   - Propose improvements to standards

## Testing Standard Compliance

Integra contracts are tested for standard compliance:

```typescript
// Test ERC-721 compliance
describe("ERC-721 Compliance", () => {
  it("should support ERC-721 interface", async () => {
    expect(await contract.supportsInterface("0x80ac58cd")).to.be.true;
  });

  it("should transfer tokens", async () => {
    await contract.transferFrom(alice, bob, tokenId);
    expect(await contract.ownerOf(tokenId)).to.equal(bob);
  });

  it("should approve transfers", async () => {
    await contract.approve(bob, tokenId);
    expect(await contract.getApproved(tokenId)).to.equal(bob);
  });
});
```

## Resources

### Standard Specifications
- [ERC-721: Non-Fungible Token](https://eips.ethereum.org/EIPS/eip-721)
- [ERC-1155: Multi-Token](https://eips.ethereum.org/EIPS/eip-1155)
- [ERC-165: Interface Detection](https://eips.ethereum.org/EIPS/eip-165)
- [ERC-2981: NFT Royalty](https://eips.ethereum.org/EIPS/eip-2981)
- [ERC-5192: Soulbound Tokens](https://eips.ethereum.org/EIPS/eip-5192)

### OpenZeppelin Documentation
- [ERC-721 Contracts](https://docs.openzeppelin.com/contracts/4.x/erc721)
- [ERC-1155 Contracts](https://docs.openzeppelin.com/contracts/4.x/erc1155)
- [Access Control](https://docs.openzeppelin.com/contracts/4.x/access-control)

### Integra Documentation
- [Tokenizer Overview →](/smart-contracts/layer3/overview)
- [Tokenizer Comparison →](/smart-contracts/layer3/tokenizer-comparison)
- [Integration Guide →](/smart-contracts/guides/integration)

### Related Topics
- [Purpose →](./introduction/why-real-world-contracts)
- [Security →](/smart-contracts/security/overview)
- [Automation →](/smart-contracts/automation/overview)

---

*Standards are the foundation of interoperability. Build on proven patterns.*
