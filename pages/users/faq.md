# Frequently Asked Questions

Common questions about using the Integra Trust Platform.

## General Questions

### What is Integra?

Integra is a blockchain-based document trust platform that allows you to register documents on the blockchain to create tamper-proof, verifiable records.

### How does it work?

When you register a document:
1. We generate a cryptographic hash (fingerprint) of your document
2. This hash is stored on the blockchain
3. Anyone can verify a document by comparing its hash to the blockchain record

### Is my document uploaded to the blockchain?

No. Only the cryptographic hash (fingerprint) of your document is stored on the blockchain. The actual document file is never uploaded to the blockchain.

### Is my document secure?

Yes. Your document is processed locally in your browser to generate the hash. The document itself is not transmitted or stored by Integra (only metadata like title and description).

## Registration Questions

### What file types can I register?

You can register most common file types including:
- PDF documents
- Images (PNG, JPG, JPEG)
- Text files
- Microsoft Office documents
- And more

### Is there a file size limit?

Yes, the current limit is 10MB per document. Contact enterprise support for larger files.

### How long does registration take?

Typically 30-60 seconds for blockchain confirmation, though network congestion can cause delays.

### Can I register the same document twice?

Yes, but each registration is a separate blockchain entry. We'll notify you if you've registered an identical document before.

### What happens if I modify a document after registration?

Any modification (even adding a single space) changes the document's hash. You would need to register the modified version as a new document.

## Verification Questions

### How do I verify a document?

Upload the document to our verification tool. We'll generate its hash and check it against blockchain records.

### What if verification fails?

Verification fails if:
- The document wasn't registered on Integra
- The document was modified after registration
- You don't have the exact file that was registered

### Can anyone verify my document?

Depends on your privacy settings:
- **Public**: Anyone can verify and see metadata
- **Private**: Anyone can verify, but only you see metadata
- **Link-Only**: Only those with your verification link can verify

### How long is verification valid?

Blockchain records are permanent. A document registered today can be verified years from now.

## Account and Billing

### Do I need an account?

Yes, you need an account to register documents. However, anyone can verify documents without an account.

### Is there a free tier?

Yes, the free tier allows:
- 10 document registrations per month
- Unlimited verifications
- Basic features

### What do paid tiers offer?

Paid tiers provide:
- More document registrations
- Advanced features (batch registration, API access)
- Priority support
- Custom branding (Enterprise)

### How do I upgrade my account?

Go to Settings → Billing and select your desired plan.

## Technical Questions

### Which blockchain does Integra use?

Integra currently uses Ethereum and other EVM-compatible chains. Check our [Developer Documentation](/developers) for technical details.

### What is a cryptographic hash?

A hash is a unique digital fingerprint of a file. Any change to the file, no matter how small, produces a completely different hash.

### Can blockchain records be deleted?

No. Blockchain records are permanent and immutable. This is what makes them trustworthy for document verification.

### What if the blockchain network goes down?

Blockchain networks are decentralized and highly resilient. Records remain accessible as long as the network exists.

## Privacy and Security

### Who can see my documents?

Nobody can see your actual documents through Integra. Only the document hash is on the blockchain, along with whatever metadata you choose to make public.

### Can I keep my registration private?

Yes. You can set documents to "Private" or "Link-Only" to control visibility of metadata.

### What data is stored on the blockchain?

Only the document hash and basic metadata (if you make it public):
- Document hash
- Registration timestamp
- Public metadata (title, description - if you choose)

### Is my personal information on the blockchain?

No personal information is stored on the blockchain unless you explicitly include it in public metadata.

## Troubleshooting

### My registration is stuck

- Check your internet connection
- Wait a few minutes - blockchain networks can be congested
- Contact support if it's been more than 10 minutes

### I can't find my document

- Check your filters (date range, status)
- Look in archived documents
- Use the search function
- Check if you're logged into the correct account

### Verification link doesn't work

- Check the URL for typos
- Ensure the link hasn't expired (if time-limited)
- Try regenerating the link
- Contact the person who shared it

### I forgot my password

Click "Forgot Password" on the login page and follow the email instructions.

## Business and Enterprise

### Can I use Integra for my business?

Yes! Many businesses use Integra for:
- Contract management
- Compliance documentation
- Supply chain verification
- Academic credentials

### Is there an API?

Yes. API access is available on Pro and Enterprise plans. See our [Developer Documentation](/developers).

### Can I customize the platform?

Enterprise customers can:
- Use custom branding
- Get dedicated blockchain instances
- Access advanced customization options

### Do you offer implementation support?

Yes. Enterprise customers get dedicated support for implementation, integration, and training.

## Contact and Support

### How do I get help?

- Check this FAQ
- Email support@integraledger.com
- Enterprise customers: Use your dedicated support channel

### How quickly will I get a response?

- Free tier: Within 48 hours
- Pro: Within 24 hours
- Enterprise: Within 4 hours (priority support)

### Do you offer training?

Yes. We offer:
- Video tutorials (free)
- Live webinars (Pro and Enterprise)
- Custom training sessions (Enterprise)

### Where can I report bugs?

Email support@integraledger.com or use the in-app feedback tool.

## Still Have Questions?

Contact us at support@integraledger.com or visit our [Getting Started](/users/getting-started) guide.
