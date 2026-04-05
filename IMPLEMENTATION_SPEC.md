# Chave Acesso Editor Implementation Spec

This document consolidates the implementation decisions extracted from `CHAVE_ACESSO_EDITOR.md` and its answered questions.

## Product Goal

Build a Spring Boot application with a Bootstrap-based UI that:
- Accepts a Brazilian fiscal access key input.
- Parses the key into its component fields.
- Displays each field with its semantic meaning.
- Resolves and shows the UF from the UF code.
- Validates the key structure and check digit.
- Allows editing of the full key and individual fields at the same time.
- Recalculates the check digit when explicitly requested by the user.

## Scope

In scope:
- Server-rendered web application using Spring Boot.
- Bootstrap-based interface in Brazilian Portuguese.
- Internal structure compatible with future i18n.
- Support for any 2-digit document model.
- Parsing masked and unmasked pasted input.
- Validation feedback per field when the normalized key has 44 digits.

Out of scope:
- Database or persistence layer.
- Authentication.
- History of searched keys.
- External integrations.

## Access Key Model

Normalized access key:
- Always processed internally as a 44-digit numeric string with all mask characters removed.

Field layout:
- `ufCode`: 2 digits
- `issueYearMonth`: 4 digits
- `issuerDocument`: 14 digits
- `documentModel`: 2 digits
- `series`: 3 digits
- `documentNumber`: 9 digits
- `emissionType`: 1 digit
- `numericCode`: 8 digits
- `checkDigit`: 1 digit

CPF handling:
- When the issuer document is a CPF, represent it in the 14-digit field using right padding with `000`.

## Input Rules

Accepted input:
- Full access key only.
- Input may contain visual masks or separators.

Normalization:
- Strip all non-digit characters before processing.

Initial validation:
- If normalized length is not 44, return only an invalid length message.
- If normalized length is 44, parse all fields and validate each one.

## Validation Rules

For a normalized 44-digit key, validate:
- UF code against the standard NF-e UF code table.
- Year/month field format.
- Month range in `YYMM`.
- Issuer document field length.
- Document model length.
- Series length.
- Document number length.
- Emission type length.
- Numeric code length.
- Check digit using modulo 11.

Field-level feedback:
- The UI should indicate which field is invalid whenever the normalized key has 44 digits.
- Examples: invalid UF, invalid month, invalid issuer document, invalid check digit.

Document model:
- Accept any 2-digit model.
- Do not restrict validation to `55` and `65`.

## Check Digit Behavior

The check digit must:
- Be computed from the first 43 digits only.
- Use modulo 11 with weights from 2 to 9 cycling from right to left.
- Be recalculated only when the user clicks a button.

## UI Behavior

Main interactions:
- Paste or type the full key.
- View parsed field values and human-readable descriptions.
- Edit individual fields.
- Edit the full key.
- Recalculate DV on button click.

Editing model:
- Full key and separated fields must remain synchronized.
- The application should use the normalized internal value as the source of truth.

Display behavior:
- Input may be masked or unmasked.
- Internal processing must always use the unmasked value.

Language:
- Current UI text should be in Brazilian Portuguese.
- Code structure should leave space for future i18n.

## Suggested Backend Shape

Suggested layers:
- `controller`: handles page load and form submission.
- `service`: normalization, parsing, validation, DV calculation, UF resolution.
- `model` or `dto`: parsed key view model and validation result objects.

Suggested responsibilities:
- `AccessKeyParserService`
- `AccessKeyValidatorService`
- `CheckDigitService`
- `UfResolverService`

## Suggested Frontend Shape

Suggested page sections:
- Full key input.
- Normalize/parse action.
- Parsed field table or cards.
- Validation summary.
- Editable field form.
- Recalculate DV action.

UX priorities:
- Clear invalid length message before any field parsing.
- Precise field-level validation messages when length is correct.
- Simple, direct Bootstrap layout without unnecessary complexity.

## Notes for Implementation

Recommended approach:
1. Normalize pasted input.
2. Validate normalized length.
3. Parse fields by fixed positions.
4. Validate each field.
5. Compute expected DV.
6. Render field values, meanings, and validation messages.
7. Allow field edits and rebuild the full key.
8. Recalculate DV only when requested.
