# Security: Protecting Your Assets on the Blockchain

## Security Isn't Optional

When dealing with real-world assets worth millions or billions of dollars, security isn't a feature - it's the foundation. Smart contracts are immutable and handle real value, so vulnerabilities can't be patched after deployment like traditional software.

**One security mistake can mean permanent loss of assets.**

That's why Integra takes a defense-in-depth approach to security.

## Security Philosophy

### 永久 (Permanent) Security
Our immutable foundation contracts are deployed once and never changed. This means:
- ✅ No upgrade vulnerabilities
- ✅ No admin key risks
- ✅ Predictable behavior forever

### 信頼 (Trusted) Patterns
We don't reinvent the wheel. We use battle-tested patterns from:
- **OpenZeppelin**: Industry-standard security libraries
- **EAS**: Proven attestation framework
- **UUPS**: Secure proxy upgrade pattern

### 優雅 (Elegant) Code
Simple, readable code is secure code:
- Every line is documented
- No complex tricks or optimizations that sacrifice clarity
- Comprehensive test coverage
- Formal verification for critical paths

## Multi-Layer Security Architecture

### Layer 1: Smart Contract Security

#### 1. Reentrancy Protection

**The Threat**: Malicious contracts can re-enter your function during execution and drain funds.

**Famous Example**: The DAO hack (2016) - $60 million stolen

**Our Protection**:
```solidity
// OpenZeppelin ReentrancyGuard on all state-changing functions
modifier nonReentrant() {
    require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
    _status = _ENTERED;
    _;
    _status = _NOT_ENTERED;
}
```

**Applied to**:
- Token transfers
- Payment processing
- State changes
- External calls

#### 2. Access Control

**The Threat**: Unauthorized users calling privileged functions.

**Our Protection**:
```solidity
// Role-based access control (OpenZeppelin)
modifier onlyRole(bytes32 role) {
    _checkRole(role);
    _;
}

// Document-level access control
modifier onlyDocumentOwner(bytes32 integraHash) {
    require(isOwner(integraHash, msg.sender), "Not owner");
    _;
}

// Attestation-based access control
modifier requiresCapability(bytes32 capability) {
    require(hasCapability(msg.sender, capability), "Missing capability");
    _;
}
```

**Three levels**:
1. **Contract Roles**: ADMIN, GOVERNOR, PAUSER
2. **Document Ownership**: Per-document permissions
3. **Capability Attestations**: Verified credentials

#### 3. Integer Overflow/Underflow

**The Threat**: Arithmetic operations that wrap around (e.g., 255 + 1 = 0)

**Our Protection**:
```solidity
// Solidity 0.8.x has built-in overflow protection
// All arithmetic operations automatically checked
uint256 total = a + b;  // Reverts on overflow
```

**Result**: Impossible to exploit arithmetic bugs

#### 4. Front-Running Protection

**The Threat**: Attackers see your transaction in mempool and submit competing transaction with higher gas.

**Our Protection**:
- Commit-reveal schemes for sensitive operations
- Price limits and slippage protection
- Time-locks for major changes
- Fair ordering mechanisms

#### 5. Signature Verification

**The Threat**: Forged signatures or signature replay attacks

**Our Protection**:
```solidity
// EIP-712 typed data signing
bytes32 digest = _hashTypedDataV4(
    keccak256(abi.encode(
        TYPEHASH,
        documentHash,
        nonce,
        deadline
    ))
);

// ECDSA signature recovery (OpenZeppelin)
address signer = ECDSA.recover(digest, signature);
require(signer == expectedSigner, "Invalid signature");

// Nonce prevents replay
_nonces[signer]++;
```

### Layer 2: Upgrade Security

#### Immutable Foundation
Core contracts cannot be upgraded:
- `CapabilityNamespaceV7_Immutable`
- `AttestationProviderRegistryV7_Immutable`
- `IntegraVerifierRegistryV7_Immutable`
- `IntegraDocumentRegistryV7_Immutable`
- `IntegraResolverRegistryV7_Immutable`

**Why?** Long-term stability and trust.

#### UUPS Proxy Pattern (Service Layer)
Service contracts use secure upgradeability:

```solidity
// Only authorized upgrader can upgrade
function _authorizeUpgrade(address newImplementation)
    internal
    override
    onlyRole(UPGRADER_ROLE)
{
    // Additional security checks
    require(isValidImplementation(newImplementation), "Invalid");
    emit UpgradeAuthorized(newImplementation);
}
```

**Security features**:
- ✅ Upgrade logic in implementation (not proxy)
- ✅ Role-based authorization
- ✅ Validation before upgrade
- ✅ Event logging for transparency
- ✅ Time-locks for major upgrades

#### Progressive Ossification

Contracts can become immutable over time:

```solidity
// Stage 1: Fully upgradeable (testing)
// Stage 2: Time-locked upgrades (production)
// Stage 3: Multi-sig required (mature)
// Stage 4: Ossified (immutable)
```

### Layer 3: Economic Security

#### Gas Limits
Prevent DOS attacks through gas exhaustion:

```solidity
// Configurable gas limits for external calls
uint256 constant MAX_RESOLVER_GAS = 50000;

// Safe external calls
(bool success, ) = resolver.call{gas: MAX_RESOLVER_GAS}(data);
```

#### Fee Protection
Prevent excessive fees:

```solidity
// Maximum fee caps
uint256 constant ABSOLUTE_MAX_FEE = 0.1 ether;

require(estimatedFee <= ABSOLUTE_MAX_FEE, "Fee too high");
```

#### Rate Limiting
Prevent spam and abuse:

```solidity
// Minimum time between operations
require(
    block.timestamp >= lastOperation + MIN_DELAY,
    "Too soon"
);
```

### Layer 4: Data Validation

#### Input Validation
All inputs are validated:

```solidity
function registerDocument(
    bytes32 documentHash,
    bytes32 referenceHash,
    // ...
) external {
    // Validate hashes are not zero
    require(documentHash != bytes32(0), "Invalid document hash");
    require(referenceHash != bytes32(0), "Invalid reference hash");

    // Validate addresses
    require(tokenizer != address(0), "Invalid tokenizer");

    // Validate uniqueness
    require(!_documents[documentHash].exists, "Already registered");

    // ... proceed with registration
}
```

#### Code Hash Verification
Verify contract implementations:

```solidity
// AttestationProviderRegistry verifies provider code
bytes32 providerCodeHash = address(provider).codehash;
require(
    providerCodeHash == expectedCodeHash,
    "Invalid provider implementation"
);
```

### Layer 5: Emergency Controls

#### Pausable Contracts
Emergency stop button for service layer:

```solidity
// OpenZeppelin Pausable
modifier whenNotPaused() {
    _requireNotPaused();
    _;
}

function pause() external onlyRole(PAUSER_ROLE) {
    _pause();
}
```

**What can be paused**:
- Token minting
- Transfers
- New registrations

**What CANNOT be paused**:
- Viewing data
- Proof of ownership
- Document verification

#### Recovery Mechanisms
Safe recovery from edge cases:

```solidity
// Stuck token recovery
function recoverToken(address token)
    external
    onlyRole(ADMIN_ROLE)
{
    // Only recover accidentally sent tokens
    // Cannot access user assets
}
```

## Security Development Lifecycle

### 1. Design Phase
- Threat modeling
- Security requirements
- Attack surface analysis
- Pattern selection

### 2. Implementation Phase
- Secure coding standards
- OpenZeppelin libraries
- Comprehensive NatSpec
- Modular architecture

### 3. Testing Phase

**Unit Tests**:
```bash
Coverage: 95%+
Tests: 500+ test cases
Edge cases: Extensively tested
```

**Integration Tests**:
```bash
Cross-contract interactions
End-to-end workflows
Upgrade scenarios
```

**Fuzzing**:
```bash
Property-based testing
Random input generation
Invariant verification
```

### 4. Audit Phase

**Internal Review**:
- Code review by senior engineers
- Security checklist verification
- Static analysis tools

**External Audits**:
- **Trail of Bits**: Smart contract security specialists
- **ConsenSys Diligence**: Ethereum experts
- **Certora**: Formal verification

**Bug Bounty**:
- Public bug bounty program
- Rewards up to $100,000
- Responsible disclosure policy

### 5. Deployment Phase

**Testnet Deployment**:
1. Deploy to testnet
2. Public testing period
3. Monitor for issues
4. Iterate if needed

**Mainnet Deployment**:
1. Final audit review
2. Multi-sig deployment
3. Gradual rollout
4. 24/7 monitoring

### 6. Monitoring Phase

**On-Chain Monitoring**:
- Event tracking
- Unusual activity detection
- Gas usage patterns
- Failed transaction analysis

**Off-Chain Monitoring**:
- API endpoints
- Database integrity
- Performance metrics
- Security alerts

## Formal Verification

Critical contracts undergo mathematical proof of correctness using Certora:

### What is Formal Verification?

Instead of testing with examples, we prove properties mathematically:

**Traditional Testing**:
```
Test 1: transfer(alice, bob, 100) ✓
Test 2: transfer(bob, carol, 50) ✓
Test 3: transfer(carol, dave, 25) ✓
... thousands more tests
```

**Formal Verification**:
```
Prove: ∀ transactions, sum of balances stays constant
Prove: ∀ transfers, sender balance decreases by exact amount
Prove: ∀ transfers, receiver balance increases by exact amount
```

**Result**: Mathematical certainty, not just statistical confidence

### Verified Properties

We prove:
- **Balance Integrity**: Balances always sum to total supply
- **Access Control**: Only authorized users can call privileged functions
- **Upgrade Safety**: Upgrades preserve critical invariants
- **Reentrancy Safety**: No reentrancy vulnerabilities exist
- **Arithmetic Safety**: No overflow/underflow possible

## Security Best Practices for Users

### For Token Holders

1. **Use Hardware Wallets**
   - Ledger, Trezor for cold storage
   - Never store keys in plain text
   - Use multi-sig for high-value assets

2. **Verify Contract Addresses**
   - Always check official sources
   - Compare checksummed addresses
   - Beware of phishing

3. **Review Transactions**
   - Understand what you're signing
   - Check transaction details
   - Use transaction simulators

4. **Monitor Your Assets**
   - Regular balance checks
   - Set up alerts for transfers
   - Review access permissions

### For Developers

1. **Use Official Libraries**
   - OpenZeppelin for standards
   - Integra SDK for integration
   - No custom crypto code

2. **Follow Patterns**
   - Checks-Effects-Interactions
   - Pull over Push payments
   - Use established patterns

3. **Test Extensively**
   - Unit tests for all functions
   - Integration tests for workflows
   - Edge cases and failure modes

4. **Handle Errors Gracefully**
   - Always check return values
   - Use require/revert appropriately
   - Provide clear error messages

### For Organizations

1. **Multi-Sig Everything**
   - Use Gnosis Safe for admin functions
   - Require multiple approvers
   - Time-locks for major operations

2. **Separate Concerns**
   - Hot wallet for operations
   - Cold wallet for reserves
   - Different keys for different roles

3. **Regular Audits**
   - Annual security reviews
   - Penetration testing
   - Code audits for changes

4. **Incident Response**
   - Have a response plan
   - Know how to pause contracts
   - Communication strategy

## Known Vulnerabilities & Mitigations

### Solved Vulnerabilities

| Vulnerability | Mitigation |
|--------------|------------|
| Reentrancy | OpenZeppelin ReentrancyGuard |
| Integer Overflow | Solidity 0.8+ built-in checks |
| Signature Replay | EIP-712 + nonces |
| Front-Running | Commit-reveal, time-locks |
| Access Control | Role-based + attestation-based |
| Upgrade Exploits | UUPS + time-locks + multi-sig |

### Residual Risks

**Smart Contract Platform Risks**:
- Ethereum/L2 consensus bugs
- EVM implementation bugs
- Network congestion

**Mitigation**:
- Multi-chain deployment
- Monitoring and alerts
- Emergency pause mechanisms

**Oracle Risks** (if using price feeds):
- Oracle manipulation
- Data source failures

**Mitigation**:
- Multiple oracle sources
- Price deviation checks
- Time-weighted averages

## Security Resources

### Documentation
- [Security Patterns →](/smart-contracts/patterns/security)
- [Access Control →](/smart-contracts/patterns/access-control)
- [Upgradeability →](/smart-contracts/patterns/upgradeability)
- [Security Guide →](/smart-contracts/guides/security)

### External Resources
- [OpenZeppelin Security](https://docs.openzeppelin.com/contracts/4.x/security)
- [ConsenSys Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [Trail of Bits Guidelines](https://github.com/crytic/building-secure-contracts)

### Contact
- **Security Issues**: [security@integra.io](mailto:security@integra.io)
- **Bug Bounty**: [integra.io/bug-bounty](https://integra.io/bug-bounty)
- **GitHub Security**: [Report Security Issue](https://github.com/IntegraLedger/smart-contracts-evm-v7/security)

---

*Security is not a feature. It's the foundation of everything we build.*
