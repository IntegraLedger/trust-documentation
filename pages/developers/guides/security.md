# Integra V7 Security Guide for Developers

Security best practices when integrating with Integra V7 smart contracts.

## Overview

When building applications that interact with Integra contracts, following security best practices is critical. This guide covers the security considerations you need to be aware of as a developer.

## Security Principles

### Defense in Depth
Don't rely on a single security mechanism. Integra contracts implement multiple independent security layers.

### Fail-Safe Defaults
Assume untrusted by default. Explicitly grant permissions rather than revoke them.

### Principle of Least Privilege
Request only the minimum capabilities needed for your use case.

## Best Practices for Integration

### 1. Validate User Inputs

Always validate inputs before calling Integra contracts:

```solidity
// ✅ GOOD: Comprehensive validation
function registerDocument(
    bytes32 documentHash,
    bytes32 referenceHash,
    address tokenizer
) external {
    if (documentHash == bytes32(0)) revert ZeroHash();
    if (referenceHash == bytes32(0)) revert ZeroReference();
    if (tokenizer == address(0)) revert ZeroAddress();

    // Call Integra contract
    documentRegistry.registerDocument(
        documentHash,
        referenceHash,
        tokenizer,
        // ...
    );
}

// ❌ BAD: No validation
function registerDocument(
    bytes32 documentHash,
    bytes32 referenceHash,
    address tokenizer
) external {
    documentRegistry.registerDocument(documentHash, referenceHash, tokenizer, ...);
}
```

### 2. Handle Reverts Properly

Integra contracts will revert on invalid operations. Handle these gracefully:

```typescript
// ✅ GOOD: Proper error handling
try {
    const tx = await documentRegistry.registerDocument(...);
    await tx.wait();
    console.log("Document registered successfully");
} catch (error) {
    if (error.message.includes("DocumentAlreadyRegistered")) {
        console.error("This document hash is already registered");
    } else if (error.message.includes("Unauthorized")) {
        console.error("You don't have permission for this operation");
    } else {
        console.error("Registration failed:", error.message);
    }
}

// ❌ BAD: No error handling
const tx = await documentRegistry.registerDocument(...);
await tx.wait();
```

### 3. Protect Private Keys

Never expose private keys in your application:

```javascript
// ✅ GOOD: Environment variables
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// ❌ BAD: Hardcoded keys
const signer = new ethers.Wallet("0x1234...", provider);  // Never do this!
```

### 4. Verify Contract Addresses

Always verify you're interacting with the correct contracts:

```typescript
// ✅ GOOD: Get addresses from official source
const addresses = await fetch(
    'https://integra-chain-registry-worker.dfisher-3f3.workers.dev/v1/chains/polygon/contracts'
).then(r => r.json());

const documentRegistry = new ethers.Contract(
    addresses.documentRegistry,
    DocumentRegistryABI,
    signer
);

// ❌ BAD: Hardcoded addresses (can be phishing)
const documentRegistry = new ethers.Contract(
    "0x123...",  // Could be malicious contract!
    DocumentRegistryABI,
    signer
);
```

### 5. Use Safe Math

Solidity 0.8+ has built-in overflow protection, but be careful with `unchecked` blocks:

```solidity
// ✅ GOOD: Safe by default
function calculateFee(uint256 amount) public pure returns (uint256) {
    return amount * 3 / 100;  // Overflow protected
}

// ⚠️ CAREFUL: Only use unchecked when you're sure
function incrementCounter(uint256 counter) public pure returns (uint256) {
    unchecked {
        return counter + 1;  // Only safe if counter < type(uint256).max
    }
}
```

## Common Attack Vectors and Protection

### 1. Front-Running

**What it is**: Attackers see your transaction in the mempool and submit a competing transaction with higher gas to execute first.

**How Integra protects you**:
- Attestations are bound to specific recipients
- Even if attacker sees your attestation UID, they can't use it

**What you should do**:
```typescript
// Attestations include recipient address
// Only the intended recipient can use them
const attestation = {
    recipient: userAddress,  // Bound to specific address
    capabilities: CORE_CLAIM,
    documentHash: docHash
};
```

### 2. Phishing

**What it is**: Malicious sites trick users into signing transactions they don't understand.

**How to protect users**:
```typescript
// ✅ GOOD: Clear transaction details
const description = `
Register Document
Hash: ${documentHash.slice(0, 10)}...
Type: ${tokenizerType}
Cost: ${fee} MATIC
`;

// Show to user before signing
await confirmTransaction(description);
const tx = await documentRegistry.registerDocument(...);
```

### 3. Replay Attacks

**What it is**: Reusing a valid signature/transaction on a different chain or context.

**How Integra protects you**:
- All attestations include chain ID
- Attestations validate against specific contract addresses
- Cross-chain replay is prevented

**No action needed** - protection is built-in.

### 4. Reentrancy

**What it is**: Malicious contract calls back into your contract before the first call completes.

**How Integra protects you**:
- All Integra contracts use OpenZeppelin's ReentrancyGuard
- State changes happen before external calls

**What you should do if writing contracts**:
```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MyContract is ReentrancyGuard {
    function claimToken(...) external nonReentrant {
        // Safe from reentrancy
    }
}
```

## Working with Attestations

### Requesting Attestations

Attestations are cryptographic proofs of permission. Request them via the Integra API:

```typescript
// Request attestation for user
const response = await fetch('https://api.integra.io/attestations/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        recipient: userAddress,
        documentHash: docHash,
        capabilities: ['CORE_CLAIM'],
        chainId: 137  // Polygon
    })
});

const { attestationUID } = await response.json();

// Use attestation in contract call
await tokenizer.claimToken(integraHash, tokenId, attestationUID, processHash);
```

### Verifying Attestations

Integra contracts verify attestations with 13 security checks:

1. Attestation exists
2. Not revoked
3. Not expired
4. Schema matches
5. Recipient matches caller (prevents front-running)
6. Attester is authorized
7. Source chain ID matches
8. Source EAS contract matches
9. Source document contract matches
10. Schema version matches
11. Document hash matches
12. Capabilities include required capability
13. Additional context validation

**You don't need to do this yourself** - it's handled by the contracts.

## Access Control Patterns

### Document-Level Authorization

```solidity
// Check if user is document owner
address owner = documentRegistry.getDocumentOwner(integraHash);
require(msg.sender == owner, "Not document owner");

// Or check if user is authorized executor
address executor = documentRegistry.getDocumentExecutor(integraHash);
require(msg.sender == owner || msg.sender == executor, "Not authorized");
```

### Capability-Based Authorization

```typescript
// User needs attestation proving they have CORE_CLAIM capability
const tx = await tokenizer.claimToken(
    integraHash,
    tokenId,
    attestationUID,  // Proves user has CORE_CLAIM
    processHash
);
```

## Gas Optimization and Security

### Don't Sacrifice Security for Gas Savings

```solidity
// ❌ BAD: Removing safety checks to save gas
function unsafeTransfer(address to, uint256 tokenId) external {
    _transfer(msg.sender, to, tokenId);  // No checks!
}

// ✅ GOOD: Keep safety checks
function safeTransfer(address to, uint256 tokenId) external {
    require(ownerOf(tokenId) == msg.sender, "Not owner");
    require(to != address(0), "Invalid recipient");
    _transfer(msg.sender, to, tokenId);
}
```

### Batch Operations Securely

```solidity
// ✅ GOOD: Batch with validation
function batchRegister(
    bytes32[] calldata documentHashes,
    bytes32[] calldata referenceHashes
) external {
    require(documentHashes.length == referenceHashes.length, "Length mismatch");
    require(documentHashes.length <= 50, "Batch too large");

    for (uint256 i = 0; i < documentHashes.length; i++) {
        require(documentHashes[i] != bytes32(0), "Invalid hash");
        // Register document
    }
}
```

## Monitoring and Alerts

### Listen for Security-Related Events

```typescript
// Monitor for suspicious activity
documentRegistry.on("DocumentOwnershipTransferred", (integraHash, from, to, reason) => {
    console.log(`Ownership transfer: ${integraHash}`);
    console.log(`From: ${from} To: ${to}`);
    console.log(`Reason: ${reason}`);

    // Alert if unexpected transfer
    if (!isExpectedTransfer(integraHash, from, to)) {
        sendAlert(`Unexpected ownership transfer for ${integraHash}`);
    }
});

// Monitor for failures
documentRegistry.on("TransactionFailed", (hash, reason) => {
    console.error(`Transaction ${hash} failed: ${reason}`);
});
```

## Testing Security

### Test Permission Checks

```typescript
it("should reject claim from unauthorized user", async () => {
    const [owner, unauthorized] = await ethers.getSigners();

    // Register document as owner
    await documentRegistry.connect(owner).registerDocument(...);

    // Try to claim as unauthorized user (should fail)
    await expect(
        tokenizer.connect(unauthorized).claimToken(integraHash, tokenId, invalidUID, processHash)
    ).to.be.revertedWith("Unauthorized");
});
```

### Test Input Validation

```typescript
it("should reject zero address", async () => {
    await expect(
        documentRegistry.registerDocument(
            documentHash,
            referenceHash,
            ethers.ZeroAddress,  // Invalid tokenizer
            // ...
        )
    ).to.be.revertedWith("ZeroAddress");
});
```

### Test Edge Cases

```typescript
it("should handle document hash collision", async () => {
    await documentRegistry.registerDocument(documentHash, ...);

    // Try to register same hash again
    await expect(
        documentRegistry.registerDocument(documentHash, ...)
    ).to.be.revertedWith("DocumentAlreadyRegistered");
});
```

## Security Checklist

When integrating with Integra:

- [ ] **Validate all inputs** before calling contracts
- [ ] **Handle errors gracefully** with try/catch
- [ ] **Protect private keys** using environment variables
- [ ] **Verify contract addresses** from official sources
- [ ] **Request attestations** via Integra API, not directly from EAS
- [ ] **Monitor events** for suspicious activity
- [ ] **Test permission checks** thoroughly
- [ ] **Test on testnet first** before mainnet deployment
- [ ] **Use established libraries** (ethers.js, web3.js)
- [ ] **Keep dependencies updated** for security patches
- [ ] **Audit your integration** if handling significant value
- [ ] **Document security assumptions** in your code

## Emergency Procedures

### If You Suspect a Security Issue

1. **Stop processing** immediately
2. **Do not interact** with potentially compromised contracts
3. **Contact Integra** at security@integra.io
4. **Preserve evidence** (transaction hashes, logs)
5. **Alert your users** if they're at risk

### If Contracts are Paused

Integra contracts can be paused in emergencies. Your code should handle this:

```typescript
try {
    const tx = await documentRegistry.registerDocument(...);
    await tx.wait();
} catch (error) {
    if (error.message.includes("Pausable: paused")) {
        console.log("Contracts are temporarily paused for maintenance");
        // Retry later or notify user
    }
}
```

## Additional Resources

- **[Integration Guide →](./integration.md)** - Safe integration practices
- **[Testing Guide →](./testing.md)** - Security testing
- **[Architecture Guide →](./architecture.md)** - Understanding the system
- **Security Contact**: security@integra.io
- **Bug Bounty**: Report vulnerabilities for rewards

## Summary

Key security principles for developers:

1. **Validate everything** - Never trust user input
2. **Handle errors** - Contracts will revert on invalid operations
3. **Protect keys** - Use environment variables and secure storage
4. **Verify addresses** - Get official addresses from chain registry
5. **Test thoroughly** - Include security tests in your test suite
6. **Monitor activity** - Watch for unexpected behavior
7. **Stay updated** - Follow Integra security announcements

Following these practices will help you build secure integrations with Integra V7.
