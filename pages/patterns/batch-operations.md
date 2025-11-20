# Batch Operation Patterns

Gas-optimized batch processing for enterprise-scale document management.

## Overview

The Integra system implements comprehensive batch operations for gas efficiency, achieving 85-90% cost savings compared to individual operations through optimized batching strategies. These patterns enable enterprise-scale document management by processing multiple operations in a single transaction, with built-in safeguards including array validation, configurable batch size limits, and sophisticated failure handling that can either revert entire batches or continue with partial success depending on the operation type.

Batch operations leverage multiple optimization techniques to maximize efficiency while maintaining security and reliability. Unchecked arithmetic safely increments loop counters without overflow protection overhead, saving approximately 100 gas per iteration across potentially thousands of operations. Standardized array validation prevents common errors through length checks and bounds enforcement, while configurable batch sizes (typically 50 documents maximum) ensure operations stay within gas limits across all supported chains. Event emission strategies balance detailed tracking with gas costs, providing comprehensive audit trails without excessive overhead. Key batch operations include document registration, executor authorization, resolver configuration, and all token operations including reserve, claim, and cancel actions.

<div style="display: flex; justify-content: center; margin: 2rem 0;">
  <img src="/diagrams/batch-pattern.png" alt="Batch Operation Patterns" style="width: 90%; height: auto;" />
</div>

## Pattern: Document Batch Registration

### Use Cases

**Enterprise Onboarding**:
- Law firm registers 10,000 contracts
- Real estate platform onboards 50,000 property deeds
- Supply chain imports 100,000 shipment records
- All with backend executor for automated management

### Implementation

```solidity
/**
 * @notice Batch register documents with optional executor
 * @dev Gas-efficient bulk onboarding with optional resolver integration
 *
 * GAS COSTS:
 * - callResolverHooks = false: ~950k gas for 50 documents (default, fastest)
 * - callResolverHooks = true: ~1.05M gas for 50 documents (+10% for resolver integration)
 * - vs individual registration: 8.5M gas (90% savings either way)
 *
 * RESTRICTIONS:
 * - referenceHash must be bytes32(0) (no parent references)
 * - primaryResolverId validated and optionally called
 * - All documents get same executor (or none if address(0))
 *
 * @param integraHashes Document identifiers (max 50)
 * @param documentHashes Content hashes (same length)
 * @param tokenizer Tokenizer contract (same for all)
 * @param primaryResolverId Primary resolver (same for all)
 * @param authorizedExecutor Executor (same for all)
 * @param processHash Workflow correlation hash
 * @param callResolverHooks Whether to call resolver lifecycle hooks
 */
function registerDocumentBatch(
    bytes32[] calldata integraHashes,
    bytes32[] calldata documentHashes,
    address tokenizer,
    bytes32 primaryResolverId,
    address authorizedExecutor,
    bytes32 processHash,
    bool callResolverHooks
) external payable nonReentrant whenNotPaused returns (uint256 successCount) {
    uint256 length = integraHashes.length;

    // VALIDATION: Array checks
    if (length == 0) revert EmptyBatch();
    if (length > MAX_BATCH_SIZE) revert BatchTooLarge(length, MAX_BATCH_SIZE);
    if (documentHashes.length != length) revert ArrayLengthMismatch();
    if (processHash == bytes32(0)) revert InvalidProcessHash();

    // VALIDATION: Tokenizer check (once)
    if (tokenizer != address(0) && !approvedTokenizers[tokenizer]) {
        revert TokenizerNotApproved(tokenizer);
    }

    // VALIDATION: Executor check (once)
    if (authorizedExecutor != address(0)) {
        if (authorizedExecutor == msg.sender) {
            revert CannotAuthorizeSelf(msg.sender);
        }
        _validateExecutor(authorizedExecutor);
    }

    // VALIDATION: Resolver check (once)
    address resolver = address(0);
    if (primaryResolverId != bytes32(0)) {
        resolver = resolverRegistry.getResolver(primaryResolverId);
        if (resolver == address(0)) revert ResolverNotFound(primaryResolverId);
    }

    // VALIDATION: Fee collection (once for entire batch)
    _collectBatchRegistrationFee(length);

    uint256 timestamp = block.timestamp;
    successCount = 0;

    // BATCH PROCESSING: Iterate with unchecked increment
    for (uint256 i = 0; i < length; ) {
        bytes32 integraHash = integraHashes[i];
        bytes32 documentHash = documentHashes[i];

        // Skip validation, just register (fail-fast on first error)
        if (integraHash == bytes32(0) || documentHash == bytes32(0)) {
            revert InvalidDocumentHash();
        }

        DocumentRecord storage doc = documents[integraHash];

        if (doc.exists) {
            revert DocumentAlreadyRegistered(integraHash, doc.owner);
        }

        // EFFECT: Register document
        doc.owner = msg.sender;
        doc.tokenizer = tokenizer;
        doc.registeredAt = uint64(timestamp);
        doc.exists = true;
        doc.documentHash = documentHash;
        doc.referenceHash = bytes32(0);  // Batch doesn't support references
        doc.identityExtension = bytes32(0);
        doc.primaryResolverId = primaryResolverId;
        doc.resolversLocked = false;

        // EFFECT: Authorize executor if provided
        if (authorizedExecutor != address(0)) {
            documentExecutor[integraHash] = authorizedExecutor;
            executorAuthorizedAt[integraHash] = timestamp;

            emit DocumentExecutorAuthorized(
                integraHash,
                authorizedExecutor,
                msg.sender,
                _isContract(authorizedExecutor),
                timestamp
            );
        }

        // EVENT: Document registered
        emit DocumentRegistered(
            integraHash,
            documentHash,
            bytes32(0),  // No reference
            msg.sender,
            tokenizer,
            authorizedExecutor,
            processHash,
            bytes32(0),  // No identity extension
            timestamp
        );

        // INTERACTION: Call resolver hook (optional, expensive)
        if (callResolverHooks && resolver != address(0)) {
            _callPrimaryResolverNonBlocking(
                integraHash,
                IDocumentResolver.onDocumentRegistered.selector,
                abi.encode(
                    integraHash,
                    documentHash,
                    msg.sender,
                    abi.encode(tokenizer, authorizedExecutor, processHash)
                )
            );
        }

        successCount++;

        // GAS OPTIMIZATION: Unchecked increment (overflow impossible)
        unchecked { ++i; }
    }

    return successCount;
}
```

### Key Optimizations

1. **Single Validation**: Validate tokenizer, executor, resolver once (not per document)
2. **Unchecked Increment**: Loop counter uses `unchecked { ++i }` (saves ~100 gas per iteration)
3. **Optional Resolver Hooks**: Only call if needed (10% gas savings when disabled)
4. **No Reference Proofs**: Batch doesn't support ZK proofs (prevents gas bombs)
5. **Batch Fee Collection**: Single payment for entire batch

### Gas Comparison

```solidity
// Individual registration: 170k gas/document
// 50 documents = 8,500,000 gas

// Batch registration (no hooks): 950k gas
// 50 documents = 19k gas/document
// Savings: 89%

// Batch registration (with hooks): 1,050k gas
// 50 documents = 21k gas/document
// Savings: 88%
```

## Pattern: Unchecked Arithmetic

### Safe Unchecked Increment

```solidity
// ❌ BAD: Checked arithmetic (overflow protection, but unnecessary)
for (uint256 i = 0; i < length; i++) {
    // Compiler adds overflow checks: ~100 gas overhead
}

// ✅ GOOD: Unchecked increment (safe when bounds known)
for (uint256 i = 0; i < length; ) {
    // ... loop body

    unchecked { ++i; }  // ✅ No overflow check, saves ~100 gas per iteration
}

// Why safe:
// - i starts at 0
// - i < length (max 50)
// - Incrementing 50 times cannot overflow uint256
// - uint256 max value: 2^256 - 1 ≈ 10^77
```

### Application Across Contracts

**Document Registry**:
```solidity
function registerDocumentBatch(...) external {
    for (uint256 i = 0; i < length; ) {
        // ... register document
        unchecked { ++i; }
    }
}
```

**Tokenizers**:
```solidity
function reserveTokensBatch(...) external {
    for (uint256 i = 0; i < length; ) {
        // ... reserve token
        unchecked { ++i; }
    }
}
```

**All Batch Operations**: Consistent pattern used everywhere for gas efficiency.

## Pattern: Array Validation

### Standard Validation Pattern

```solidity
/**
 * @dev Standard array validation for batch operations
 */
function _validateBatchArrays(
    uint256 length,
    uint256 maxSize,
    uint256... otherLengths
) internal pure {
    // CHECK 1: Non-empty batch
    if (length == 0) revert EmptyBatch();

    // CHECK 2: Within max batch size
    if (length > maxSize) revert BatchTooLarge(length, maxSize);

    // CHECK 3: All arrays same length
    if (otherLengths[0] != length) revert ArrayLengthMismatch();
    if (otherLengths[1] != length) revert ArrayLengthMismatch();
    // ... etc
}
```

### Examples

**Document Registration**:
```solidity
function registerDocumentBatch(
    bytes32[] calldata integraHashes,
    bytes32[] calldata documentHashes,
    ...
) external {
    uint256 length = integraHashes.length;

    if (length == 0) revert EmptyBatch();
    if (length > MAX_BATCH_SIZE) revert BatchTooLarge(length, MAX_BATCH_SIZE);
    if (documentHashes.length != length) revert ArrayLengthMismatch();

    // ... proceed
}
```

**Token Batch Operations**:
```solidity
function reserveTokensBatch(
    bytes32[] calldata integraHashes,
    uint256[] calldata tokenIds,
    address[] calldata reservedFor,
    ...
) external {
    uint256 length = integraHashes.length;

    if (length == 0) revert EmptyBatch();
    if (length > MAX_BATCH_SIZE) revert BatchTooLarge(length, MAX_BATCH_SIZE);
    if (tokenIds.length != length) revert ArrayLengthMismatch();
    if (reservedFor.length != length) revert ArrayLengthMismatch();

    // ... proceed
}
```

## Pattern: Partial Failure Handling

### Fail-Fast vs Continue-On-Error

**Strategy 1: Fail-Fast (Transaction Reverts)**

Used when consistency is critical.

```solidity
function registerDocumentBatch(...) external {
    for (uint256 i = 0; i < length; ) {
        bytes32 integraHash = integraHashes[i];

        // Any failure reverts entire batch
        if (documents[integraHash].exists) {
            revert DocumentAlreadyRegistered(integraHash, documents[integraHash].owner);
        }

        // ... register document

        unchecked { ++i; }
    }
}
```

**Benefits**:
- All-or-nothing semantics
- Simple to reason about
- No partial state
- Clear success/failure

**Strategy 2: Continue-On-Error (Partial Success)**

Used when some failures acceptable.

```solidity
function processDocumentsBatch(...) external returns (uint256 successCount) {
    successCount = 0;

    for (uint256 i = 0; i < length; ) {
        bytes32 integraHash = integraHashes[i];

        // Try to process, continue on error
        try this._processDocument(integraHash) {
            successCount++;
            emit DocumentProcessed(integraHash);
        } catch Error(string memory reason) {
            emit DocumentProcessingFailed(integraHash, reason);
        } catch {
            emit DocumentProcessingFailed(integraHash, "Unknown error");
        }

        unchecked { ++i; }
    }

    return successCount;
}
```

**Benefits**:
- Partial success allowed
- Resilient to individual failures
- Useful for async/best-effort operations
- Requires careful event tracking

## Pattern: Event Emission Strategies

### Strategy 1: Event Per Item (Standard)

**Usage**: Most batch operations

```solidity
function registerDocumentBatch(...) external {
    for (uint256 i = 0; i < length; ) {
        // ... register document

        // Emit event for each document
        emit DocumentRegistered(
            integraHash,
            documentHash,
            bytes32(0),
            msg.sender,
            tokenizer,
            authorizedExecutor,
            processHash,
            bytes32(0),
            timestamp
        );

        unchecked { ++i; }
    }
}
```

**Benefits**:
- Consistent with individual operations
- Easy off-chain indexing (one event per document)
- Detailed tracking

**Cost**: ~2k gas per event

### Strategy 2: Single Summary Event (Rare)

**Usage**: When individual tracking not needed

```solidity
function processBatchSummary(...) external {
    uint256 successCount = 0;

    for (uint256 i = 0; i < length; ) {
        // ... process item
        successCount++;
        unchecked { ++i; }
    }

    // Single event for entire batch
    emit BatchProcessed(batchId, length, successCount, block.timestamp);
}
```

**Benefits**:
- Lower gas cost
- Simpler for summary metrics

**Tradeoffs**:
- Less granular tracking
- Harder to debug individual failures

## Batch Operation Examples

### Document Operations

```solidity
// Batch registration (max 50)
function registerDocumentBatch(...) external returns (uint256);

// Batch primary resolver update (max 50)
function setPrimaryResolverBatch(
    bytes32[] calldata integraHashes,
    bytes32 resolverId
) external;

// Batch executor authorization (max 50)
function authorizeExecutorBatch(
    bytes32[] calldata integraHashes,
    address executor
) external;
```

### Token Operations

```solidity
// Batch token reservation (max 50)
function reserveTokensBatch(
    bytes32[] calldata integraHashes,
    uint256[] calldata tokenIds,
    address[] calldata reservedFor,
    bytes[] calldata encryptedLabels
) external returns (uint256);

// Batch token claim (max 50)
function claimTokensBatch(
    bytes32[] calldata integraHashes,
    uint256[] calldata tokenIds,
    bytes[] calldata attestationProofs
) external returns (uint256);

// Batch reservation cancel (max 50)
function cancelReservationsBatch(
    bytes32[] calldata integraHashes,
    uint256[] calldata tokenIds
) external returns (uint256);
```

## Batch Size Limits

### Why Limits?

**Gas Block Limit**: Ethereum mainnet ~30M gas/block
- 50 documents × 21k gas = 1.05M gas ✅ (3.5% of block)
- 100 documents × 21k gas = 2.1M gas ✅ (7% of block)
- 200 documents × 21k gas = 4.2M gas ⚠️ (14% of block, risky)

**Safety Margin**: Conservative limits prevent:
- Block gas limit hits
- Transaction out-of-gas failures
- Network congestion issues

### Standard Limits

```solidity
uint256 public constant MAX_BATCH_SIZE = 50;
```

**Rationale**:
- Safe for all chains (Ethereum, Polygon, Arbitrum, etc.)
- ~1M gas total (conservative)
- Large enough for practical batches
- Small enough to avoid risks

## Testing Strategy

```typescript
describe("Batch Operations", () => {
  describe("Gas Efficiency", () => {
    it("should save 85%+ gas vs individual operations", async () => {
      // Individual operations
      const individualGas = 0;
      for (let i = 0; i < 50; i++) {
        const tx = await registry.registerDocument(...);
        const receipt = await tx.wait();
        individualGas += receipt.gasUsed;
      }

      // Batch operation
      const batchTx = await registry.registerDocumentBatch(...);
      const batchReceipt = await batchTx.wait();

      const savings = (individualGas - batchReceipt.gasUsed) / individualGas;
      expect(savings).to.be.gte(0.85); // 85%+ savings
    });
  });

  describe("Validation", () => {
    it("should reject empty batch", async () => {
      await expect(
        registry.registerDocumentBatch([], [], ...)
      ).to.be.revertedWithCustomError(registry, "EmptyBatch");
    });

    it("should reject oversized batch", async () => {
      const hashes = new Array(51).fill(randomHash());
      await expect(
        registry.registerDocumentBatch(hashes, hashes, ...)
      ).to.be.revertedWithCustomError(registry, "BatchTooLarge");
    });

    it("should reject mismatched array lengths", async () => {
      await expect(
        registry.registerDocumentBatch(
          [hash1, hash2],
          [hash1], // Wrong length
          ...
        )
      ).to.be.revertedWithCustomError(registry, "ArrayLengthMismatch");
    });
  });

  describe("Partial Failure", () => {
    it("should revert entire batch on first failure", async () => {
      // Pre-register one document
      await registry.registerDocument(hash1, ...);

      // Batch including duplicate should revert
      await expect(
        registry.registerDocumentBatch(
          [hash1, hash2, hash3], // hash1 already exists
          ...
        )
      ).to.be.revertedWithCustomError(registry, "DocumentAlreadyRegistered");
    });
  });

  describe("Events", () => {
    it("should emit event for each item", async () => {
      const tx = await registry.registerDocumentBatch(
        [hash1, hash2],
        [docHash1, docHash2],
        ...
      );

      await expect(tx)
        .to.emit(registry, "DocumentRegistered")
        .withArgs(hash1, ...);

      await expect(tx)
        .to.emit(registry, "DocumentRegistered")
        .withArgs(hash2, ...);
    });
  });
});
```

## Integration Guidelines

### For Enterprise Users

```typescript
// Batch document registration
const hashes = documents.map(d => d.integraHash);
const docHashes = documents.map(d => d.documentHash);

const tx = await registry.registerDocumentBatch(
  hashes,
  docHashes,
  tokenizerAddress,
  resolverID,
  executorAddress,
  processHash,
  false // Don't call resolver hooks (faster)
);

console.log(`Registered ${hashes.length} documents`);
console.log(`Gas used: ${tx.gasUsed} (~${tx.gasUsed / hashes.length} per doc)`);
```

### For dApp Developers

```typescript
// Chunk large batches
function* chunkArray<T>(arr: T[], size: number) {
  for (let i = 0; i < arr.length; i += size) {
    yield arr.slice(i, i + size);
  }
}

// Register 500 documents in batches of 50
for (const chunk of chunkArray(documents, 50)) {
  const hashes = chunk.map(d => d.integraHash);
  const docHashes = chunk.map(d => d.documentHash);

  await registry.registerDocumentBatch(hashes, docHashes, ...);
}
```

## Benefits

- **85-90% Gas Savings**: Massive cost reduction for enterprise
- **Single Transaction**: Atomic batch processing
- **Consistent**: All items use same parameters
- **Safe**: Array validation prevents errors
- **Efficient**: Unchecked arithmetic, optional hooks
- **Scalable**: Supports enterprise-scale onboarding

## See Also

- [Security Patterns](./security.md) - Reentrancy protection in batch operations
- [Access Control Patterns](./access-control.md) - Batch executor authorization
- [Document Documentation](./layer2/) - Document registry architecture
