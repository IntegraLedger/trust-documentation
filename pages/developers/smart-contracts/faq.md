# Frequently Asked Questions

## General Questions

### What blockchain does Integra use?

Integra works on Ethereum and EVM-compatible chains (Polygon, Base, Arbitrum, etc.). Check the [API Reference](./api-reference) for specific addresses.

### Do I need cryptocurrency?

Yes, you need the native token (ETH, MATIC, etc.) to pay gas fees for transactions. Reading data is free. For development, use testnets with free test tokens.

### How much does it cost?

- **Registration**: ~$0.05-0.20 depending on network
- **Verification**: Free (read-only)
- **NFT Minting**: ~$0.10-0.50

### Is my document stored on the blockchain?

No! Only the document hash (fingerprint) is stored on-chain. Store actual documents on IPFS, your server, or keep them private.

## Technical Questions

### What is a hash?

A unique fingerprint of your document. Same document = same hash. Different document = different hash. Cannot reverse a hash to get the original.

### Can I update a registered document?

No, blockchain records are immutable. To update, register a new version and link it to the previous one in metadata.

### What if I lose my private key?

You lose access to your wallet and cannot perform transactions. ALWAYS back up your private key or recovery phrase securely.

### Can attestations be revoked?

Yes, if created as revocable. Use `revokeAttestation()` method. Useful for credentials that expire or licenses that can be cancelled.

## Integration Questions

### What programming languages can I use?

Any language with Web3 libraries:
- JavaScript/TypeScript (ethers.js, web3.js)
- Python (web3.py)
- Go (go-ethereum)
- Rust (ethers-rs)
- Java (web3j)

### Can I use this in a mobile app?

Yes! Use Web3 libraries for React Native, Flutter, or native iOS/Android. Many examples available.

### Do users need wallets?

For transactions yes, but you can use:
- **Meta-transactions**: You pay gas, users don't need wallets
- **Smart wallets**: Embedded wallets in your app
- **Read-only**: Verification doesn't need a wallet

## Best Practices

### Should I register every document?

Register documents that need:
- Tamper-proof records
- Timestamp verification
- Ownership tracking
- Legal evidence

Don't register temporary/draft documents.

### How do I handle private documents?

1. Register the hash (public)
2. Keep document itself private
3. Only share document with authorized parties
4. They can verify using the hash

### What about GDPR/data privacy?

Hashes don't contain personal data. Store any personal information off-chain with proper encryption and access controls.

## Troubleshooting

### Transaction keeps failing

Common causes:
1. Insufficient gas - add more ETH
2. Wrong network - check you're on correct chain
3. Invalid parameters - verify hash format
4. Nonce issues - reset wallet or wait

### Document shows as not registered

- Verify you're checking correct network
- Confirm transaction was mined (check block explorer)
- Ensure you're hashing document the same way

### High gas fees

- Use L2 networks (Polygon, Base) - 100x cheaper
- Batch multiple operations
- Wait for low network activity
- Consider meta-transactions

## Support

Still have questions?
- **Email**: developers@integraledger.com
- **GitHub**: github.com/IntegraLedger
- **Discord**: [Join our community]

---

Can't find your answer? [Contact us](mailto:developers@integraledger.com)
