# Markdown template spec

## Goal

Generate one complete Czech Markdown quotation from project data.

## Output characteristics

- Czech language
- copy-ready
- consistent structure
- Czech number formatting
- Czech currency formatting
- Czech date formatting

## Main sections

1. Header line with version and date
2. Cost estimate heading
3. Project name
4. Company information
5. Contacts
6. Reference projects
7. Management summary
8. Scope summary
9. Screens overview table
10. Billable products by section
11. Summary
12. PM explanation
13. SLA explanation
14. Additional cooperation information

## Formatting rules

### Numbers
- decimal comma
- preserve trailing decimal places where meaningful

### Currency
- format as `53 136 Kč`

### Dates
- format as Czech long date, for example `10. dubna 2026`

## Tables

Use markdown tables where the structure benefits readability.

## Executive summary

The summary should be assembled from selected billable items and screen scope.

## Scope list

The management summary should list enabled outputs in a clean human-readable way.

## Future note

In v1 there is only one markdown template.
The system may support more templates in the future, so template generation logic should not be tightly mixed into UI rendering code.