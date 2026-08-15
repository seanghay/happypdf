# Encryption and Metadata

## Reading an encrypted PDF

```js
const pdfDoc = await PDFDocument.load(bytes, { password: 'secret' });
```

Without the password, loading throws `EncryptedPDFError`. To inspect a document
without decrypting it:

```js
const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
```

Content read this way will be ciphertext, so this is only useful for structural
inspection.

## Encrypting output

```js
const bytes = await pdfDoc.save({
  userPassword: 'open-me',
  ownerPassword: 'owner',
  permissions: {
    printing: 'highResolution',
    modifying: false,
    copying: false,
  },
});
```

::: warning What PDF permissions actually do
Permissions are advisory. A conforming reader honours them; nothing forces one
to. Treat them as a statement of intent, not a security control — if content
must not be copied, do not put it in the file.
:::

## Metadata

```js
pdfDoc.setTitle('Quarterly Report');
pdfDoc.setAuthor('Sokha Chan');
pdfDoc.setSubject('Financial results');
pdfDoc.setKeywords(['report', 'q3', 'finance']);
pdfDoc.setProducer('HappyPDF');
pdfDoc.setCreator('reporting-service');
pdfDoc.setCreationDate(new Date('2026-01-01'));
pdfDoc.setModificationDate(new Date());
```

Reading it back:

```js
pdfDoc.getTitle();
pdfDoc.getAuthor();
pdfDoc.getCreationDate();
```

### Reproducible output

Documents get a creation and modification date by default, so saving the same
input twice produces different bytes. To make output byte-identical:

```js
const pdfDoc = await PDFDocument.create({ updateMetadata: false });
```

Useful for content-addressed storage, caching, and for tests that compare
output.

## Viewer preferences

```js
const prefs = pdfDoc.catalog.getOrCreateViewerPreferences();
prefs.setDisplayDocTitle(true);
prefs.setHideToolbar(false);
```

## PDF/A

```js
import { convertToPDFA3 } from 'happypdf';

await convertToPDFA3(pdfDoc, { conformance: 'B' });
```

PDF/A requires every font to be embedded — which HappyPDF does for custom fonts
— and disallows encryption. The standard 14 fonts are **not** embedded and are
therefore not PDF/A compliant, so embed a real font for archival output.
