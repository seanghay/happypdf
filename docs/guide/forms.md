# Forms

## Reading fields

```js
const form = pdfDoc.getForm();

for (const field of form.getFields()) {
  console.log(field.getName(), field.constructor.name);
}
```

## Filling

```js
form.getTextField('name').setText('Sokha Chan');
form.getCheckBox('subscribe').check();
form.getDropdown('country').select('Cambodia');
form.getRadioGroup('plan').select('annual');
```

## Creating fields

```js
const form = pdfDoc.getForm();

const name = form.createTextField('form.name');
name.setText('Sokha Chan');
name.addToPage(page, { x: 30, y: 160, width: 240, height: 26 });

const notes = form.createTextField('form.notes');
notes.enableMultiline();
notes.addToPage(page, { x: 30, y: 80, width: 240, height: 60 });
```

See the [form demo](/demos#filling-a-form).

## Non-Latin text in fields

Field appearances are drawn with an embedded font, and that font has to support
the text. Embed one and pass it when updating appearances:

```js
const khmer = await pdfDoc.embedFont(khmerBytes);

form.getTextField('name').setText('សុខា ចាន់');
form.updateFieldAppearances(khmer);
```

Multiline fields wrap with the same segmenter `drawText` uses, so Khmer and Thai
wrap at word boundaries rather than overflowing.

::: tip Alignment
A field's alignment comes from its PDF `/Q` quadding entry, which defines only
left, center and right — there is no justified value for form fields.
:::

## Flattening

Turns fields into ordinary page content, so they can no longer be edited:

```js
form.flatten();
```
