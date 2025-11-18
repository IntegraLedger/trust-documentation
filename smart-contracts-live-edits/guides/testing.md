# Testing Your Integra Integration

Guide for testing applications that integrate with Integra V7 smart contracts.

## Overview

When building on Integra, thorough testing ensures your integration works correctly and handles edge cases gracefully. This guide covers testing strategies for applications that interact with Integra contracts.

## Testing Approaches

### 1. Mainnet Forking (Recommended)

Test against real Integra contracts without spending real money:

```javascript
// hardhat.config.js
module.exports = {
    networks: {
        hardhat: {
            forking: {
                url: process.env.POLYGON_RPC_URL,
                blockNumber: 50000000  // Pin to specific block
            }
        }
    }
};
```

**Benefits**:
- Test with real contract state
- No need to deploy mocks
- Realistic gas costs
- Catch integration issues early

### 2. Testnet Testing

Deploy your app to testnets (Polygon Amoy, Base Sepolia):

```typescript
const provider = new ethers.JsonRpcProvider(
    "https://rpc-amoy.polygon.technology"
);

const documentRegistry = new ethers.Contract(
    TESTNET_DOCUMENT_REGISTRY_ADDRESS,
    DocumentRegistryABI,
    provider
);
```

**Benefits**:
- Real network conditions
- Test with actual users
- No forking complexity

### 3. Local Testing with Mocks

For unit tests, mock Integra contracts:

```typescript
// Mock document registry
const mockRegistry = {
    registerDocument: jest.fn().mockResolvedValue({
        wait: jest.fn().mockResolvedValue({ integraHash: "0x123..." })
    }),
    getDocumentOwner: jest.fn().mockReturnValue("0xOwner..."),
};
```

## Essential Test Cases

### Test 1: Document Registration

```typescript
describe("Document Registration", () => {
    it("should register a document successfully", async () => {
        const documentHash = ethers.keccak256(ethers.toUtf8Bytes("My Document"));
        const referenceHash = ethers.keccak256(ethers.toUtf8Bytes("ipfs://..."));

        const tx = await documentRegistry.registerDocument(
            documentHash,
            referenceHash,
            tokenizerAddress,
            ethers.ZeroAddress,  // No executor
            ethers.ZeroHash,     // No process
            ethers.ZeroHash,     // No identity extension
            ethers.ZeroHash,     // No primary resolver
            []                   // No additional resolvers
        );

        const receipt = await tx.wait();
        const event = receipt.logs.find(
            log => log.eventName === "DocumentRegistered"
        );

        expect(event).toBeDefined();
        expect(event.args.owner).toBe(await signer.getAddress());
    });

    it("should reject duplicate document hash", async () => {
        await documentRegistry.registerDocument(...);

        // Try to register again
        await expect(
            documentRegistry.registerDocument(...)
        ).to.be.revertedWith("DocumentAlreadyRegistered");
    });

    it("should reject zero address tokenizer", async () => {
        await expect(
            documentRegistry.registerDocument(
                documentHash,
                referenceHash,
                ethers.ZeroAddress,  // Invalid!
                ...
            )
        ).to.be.revertedWith("ZeroAddress");
    });
});
```

### Test 2: Token Claiming

```typescript
describe("Token Claiming", () => {
    beforeEach(async () => {
        // Register document
        await documentRegistry.registerDocument(...);

        // Get attestation for claim
        attestationUID = await getAttestationUID(userAddress);
    });

    it("should allow claim with valid attestation", async () => {
        const tx = await tokenizer.claimToken(
            integraHash,
            tokenId,
            attestationUID,
            processHash
        );

        const receipt = await tx.wait();
        expect(receipt.status).toBe(1);

        // Verify token ownership
        const owner = await tokenizer.ownerOf(tokenId);
        expect(owner).toBe(userAddress);
    });

    it("should reject claim without attestation", async () => {
        await expect(
            tokenizer.claimToken(
                integraHash,
                tokenId,
                ethers.ZeroHash,  // No attestation
                processHash
            )
        ).to.be.revertedWith("InvalidAttestation");
    });

    it("should reject claim from wrong user", async () => {
        // Attestation is for userA
        const attestationForUserA = await getAttestationUID(userA.address);

        // UserB tries to use it
        await expect(
            tokenizer.connect(userB).claimToken(
                integraHash,
                tokenId,
                attestationForUserA,
                processHash
            )
        ).to.be.revertedWith("RecipientMismatch");
    });
});
```

### Test 3: Ownership Transfer

```typescript
describe("Ownership Transfer", () => {
    it("should transfer ownership", async () => {
        const [owner, newOwner] = await ethers.getSigners();

        // Owner transfers to newOwner
        const tx = await documentRegistry.connect(owner).transferDocumentOwnership(
            integraHash,
            newOwner.address,
            "Selling property"
        );

        await tx.wait();

        // Verify new owner
        const currentOwner = await documentRegistry.getDocumentOwner(integraHash);
        expect(currentOwner).toBe(newOwner.address);
    });

    it("should reject transfer from non-owner", async () => {
        const [owner, attacker, newOwner] = await ethers.getSigners();

        await expect(
            documentRegistry.connect(attacker).transferDocumentOwnership(
                integraHash,
                newOwner.address,
                "Unauthorized transfer"
            )
        ).to.be.revertedWith("Unauthorized");
    });
});
```

### Test 4: Error Handling

```typescript
describe("Error Handling", () => {
    it("should handle contract paused", async () => {
        // Simulate paused state (on fork or testnet with pause rights)
        // For mock:
        mockRegistry.registerDocument.mockRejectedValue(
            new Error("Pausable: paused")
        );

        try {
            await documentRegistry.registerDocument(...);
            fail("Should have thrown");
        } catch (error) {
            expect(error.message).toContain("paused");
            // Your app should handle this gracefully
        }
    });

    it("should handle network errors", async () => {
        // Simulate network failure
        const badProvider = new ethers.JsonRpcProvider("http://invalid");
        const registryWithBadProvider = documentRegistry.connect(badProvider);

        await expect(
            registryWithBadProvider.registerDocument(...)
        ).rejects.toThrow();
    });

    it("should handle insufficient gas", async () => {
        await expect(
            documentRegistry.registerDocument(..., {
                gasLimit: 1000  // Too low!
            })
        ).to.be.revertedWith("out of gas");
    });
});
```

### Test 5: Gas Estimation

```typescript
describe("Gas Usage", () => {
    it("should estimate gas correctly", async () => {
        const gasEstimate = await documentRegistry.registerDocument.estimateGas(
            documentHash,
            referenceHash,
            tokenizerAddress,
            ...
        );

        expect(gasEstimate).toBeLessThan(500000);  // Should be reasonable

        // Use estimate with buffer
        const tx = await documentRegistry.registerDocument(..., {
            gasLimit: gasEstimate * 12n / 10n  // 20% buffer
        });

        const receipt = await tx.wait();
        expect(receipt.gasUsed).toBeLessThan(gasEstimate * 12n / 10n);
    });
});
```

## Testing with Foundry (Solidity Tests)

If you're writing Solidity contracts that interact with Integra:

```solidity
// test/MyIntegration.t.sol
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/MyContract.sol";
import "@integra/interfaces/IIntegraDocumentRegistry.sol";

contract MyContractTest is Test {
    MyContract myContract;
    IIntegraDocumentRegistry documentRegistry;

    function setUp() public {
        // Fork mainnet
        vm.createSelectFork("polygon");

        // Get real Integra contracts
        documentRegistry = IIntegraDocumentRegistry(
            0x... // Real document registry address
        );

        myContract = new MyContract(address(documentRegistry));
    }

    function testRegisterDocument() public {
        bytes32 docHash = keccak256("My Document");
        bytes32 refHash = keccak256("ipfs://...");

        vm.prank(address(this));
        bytes32 integraHash = myContract.registerDocument(docHash, refHash);

        assertTrue(integraHash != bytes32(0));
    }

    function testFailUnauthorized() public {
        address unauthorized = address(0xdead);

        vm.prank(unauthorized);
        myContract.registerDocument(bytes32(0), bytes32(0));  // Should fail
    }
}
```

## Testing Event Emissions

```typescript
describe("Event Emissions", () => {
    it("should emit DocumentRegistered event", async () => {
        const tx = await documentRegistry.registerDocument(...);
        const receipt = await tx.wait();

        const event = receipt.logs.find(e => e.eventName === "DocumentRegistered");
        expect(event).toBeDefined();
        expect(event.args.integraHash).toBeDefined();
        expect(event.args.owner).toBe(await signer.getAddress());
        expect(event.args.documentHash).toBe(documentHash);
    });

    it("should listen for events in real-time", async (done) => {
        documentRegistry.once("DocumentRegistered", (integraHash, owner, documentHash) => {
            expect(owner).toBe(await signer.getAddress());
            done();
        });

        await documentRegistry.registerDocument(...);
    });
});
```

## Testing Multi-Step Workflows

```typescript
describe("Complete Workflow", () => {
    it("should complete document lifecycle", async () => {
        // Step 1: Register document
        const registerTx = await documentRegistry.registerDocument(...);
        const registerReceipt = await registerTx.wait();
        const integraHash = registerReceipt.logs[0].args.integraHash;

        // Step 2: Get attestation
        const attestationUID = await getAttestation(userAddress, integraHash);

        // Step 3: Claim token
        const claimTx = await tokenizer.claimToken(
            integraHash,
            tokenId,
            attestationUID,
            processHash
        );
        await claimTx.wait();

        // Step 4: Verify ownership
        const tokenOwner = await tokenizer.ownerOf(tokenId);
        expect(tokenOwner).toBe(userAddress);

        // Step 5: Transfer ownership
        const transferTx = await documentRegistry.transferDocumentOwnership(
            integraHash,
            newOwner.address,
            "Sale"
        );
        await transferTx.wait();

        // Step 6: Verify new ownership
        const newDocOwner = await documentRegistry.getDocumentOwner(integraHash);
        expect(newDocOwner).toBe(newOwner.address);
    });
});
```

## Testing Checklist

When testing your Integra integration:

### Functionality Tests
- [ ] Document registration works
- [ ] Token claiming works with valid attestation
- [ ] Token claiming fails with invalid attestation
- [ ] Ownership transfer works for owner
- [ ] Ownership transfer fails for non-owner
- [ ] Events are emitted correctly
- [ ] Gas estimates are reasonable

### Error Handling Tests
- [ ] Zero address validation
- [ ] Zero hash validation
- [ ] Duplicate document rejection
- [ ] Unauthorized action rejection
- [ ] Paused contract handling
- [ ] Network error handling
- [ ] Insufficient gas handling

### Edge Cases
- [ ] Maximum batch size handling
- [ ] Expired attestation handling
- [ ] Revoked attestation handling
- [ ] Cross-chain attestation rejection (if applicable)
- [ ] Re-registration attempts

### Security Tests
- [ ] Front-running protection (attestations bound to recipient)
- [ ] Replay attack protection (attestations include chain ID)
- [ ] Access control enforcement
- [ ] Input validation

## Testing Tools

### Recommended Tools
- **Hardhat**: For TypeScript/JavaScript testing
- **Foundry**: For Solidity testing
- **Tenderly**: For transaction simulation
- **OpenZeppelin Test Helpers**: For common test utilities
- **Chai**: For assertions
- **Jest**: For unit testing

### Useful Commands

```bash
# Hardhat tests
npx hardhat test
npx hardhat coverage

# Foundry tests
forge test
forge test --match-test testRegisterDocument
forge test -vvv  # Verbose output
forge coverage

# Gas reporting
forge test --gas-report
```

## Debugging Failed Tests

### Get Transaction Trace

```typescript
// For failed transaction
try {
    await documentRegistry.registerDocument(...);
} catch (error) {
    console.log("Error:", error.message);
    console.log("Transaction:", error.transaction);
    console.log("Receipt:", error.receipt);
}
```

### Using Tenderly

```bash
# Simulate transaction before sending
curl https://api.tenderly.co/api/v1/account/me/project/my-project/simulate \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"network_id": "137", "from": "0x...", "to": "0x...", "input": "0x...", "gas": 8000000, "gas_price": "0", "value": "0"}'
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test Integration

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test
        env:
          POLYGON_RPC_URL: ${{ secrets.POLYGON_RPC_URL }}

      - name: Check coverage
        run: npm run coverage
```

## Next Steps

- **[Integration Guide →](./integration.md)** - Build your integration
- **[Security Guide →](./security.md)** - Secure your integration
- **[Architecture Guide →](./architecture.md)** - Understand the system

## Additional Resources

- [Hardhat Testing](https://hardhat.org/tutorial/testing-contracts)
- [Foundry Book](https://book.getfoundry.sh/forge/tests)
- [OpenZeppelin Test Helpers](https://docs.openzeppelin.com/test-helpers/)
- [Tenderly Documentation](https://docs.tenderly.co/)

Happy testing!
