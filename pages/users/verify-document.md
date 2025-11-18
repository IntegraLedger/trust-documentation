# Verify a Document

Learn how to verify the authenticity of documents on the Integra Trust Platform.

## What is Document Verification?

Document verification allows you to check if a document has been registered on the blockchain and confirm its authenticity. The verification process:
1. Generates a hash of the uploaded document
2. Compares it against blockchain records
3. Returns the registration details if a match is found

## How to Verify a Document

### Method 1: Upload Document for Verification

1. Navigate to the "Verify" section
2. Click "Choose File" or drag and drop the document
3. Click "Verify Document"
4. Review the verification results

### Method 2: Use Verification Link

If someone shared a verification link with you:
1. Click the verification link
2. Upload the document you want to verify
3. The system will check if it matches the registered document

### Method 3: Search by Registration ID

If you have the registration ID:
1. Go to the "Verify" section
2. Enter the Registration ID in the search box
3. View the registration details

## Understanding Verification Results

### Document Verified ✓

If the document is found on the blockchain, you'll see:
- **Registration Date** - When the document was first registered
- **Registrant** - Who registered the document (if public)
- **Document Hash** - The cryptographic fingerprint
- **Blockchain Transaction** - Link to the blockchain record
- **Metadata** - Title, description, and tags

### Document Not Found ✗

If no match is found:
- The document has not been registered on Integra
- The document may have been modified since registration
- You may need to verify you have the correct version

### Modified Document ⚠️

If the document has been changed:
- The hash won't match the registered version
- Even small changes (like adding a space) will result in a different hash
- You'll need the original registered version to verify

## Verification Certificate

After successful verification, you can:
- **Download a verification certificate** - Official proof of verification
- **Share verification link** - Let others verify the same document
- **View blockchain record** - See the immutable blockchain entry

## Use Cases

### Legal Documents
Verify contracts, agreements, and legal documents to ensure they haven't been altered.

### Academic Credentials
Check authenticity of certificates, diplomas, and transcripts.

### Business Documents
Verify invoices, purchase orders, and official correspondence.

### Compliance Documents
Confirm regulatory filings and compliance certificates.

## Best Practices

### Before Verification
- Ensure you have the exact file (same format, no modifications)
- Download the file if you received it via email (don't verify directly from email preview)
- Check file properties match the original

### After Verification
- Save or screenshot verification results
- Download the verification certificate
- Store the blockchain transaction ID for future reference

## Troubleshooting

### Verification Fails for a Registered Document
- Ensure you're using the exact same file
- Check the file hasn't been re-saved or converted
- Verify the file size matches

### Can't Access Verification Link
- Link may have expired
- Check for typos in the URL
- Request a new verification link from the registrant

### Slow Verification
- Large files take longer to hash
- Network issues can cause delays
- Try again in a few moments

## Security Notes

### What Verification Proves
- The document exists on the blockchain
- The document was registered at a specific time
- The document matches the registered version exactly

### What Verification Does NOT Prove
- Legal validity of the document
- Authority of the person who registered it
- Current validity (document may have been superseded)

## Next Steps

- [Register Your Own Documents](/users/register-document)
- [Manage Your Documents](/users/manage-documents)
- [Learn More in FAQ](/users/faq)

## Need Help?

Contact support@integraledger.com
