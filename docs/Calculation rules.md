# Calculation rules

## Screens-based calculation

Some billable products derive from the Screens tab.

Examples:
- UX primární (Desktop)
- UX sekundární (Mobil)
- UI primární (Desktop)
- UI sekundární (Mobil)
- Webflow

## Global calibration

There is a global calibration rule for screen complexity.

### Base MD at complexity 5

Example base MD values:
- UX primary desktop: 0.9
- UX secondary mobile: 0.4
- UI primary desktop: 1.1
- UI secondary mobile: 0.9
- Webflow: 1.5

### Complexity percentages

- 1 = 20%
- 2 = 40%
- 3 = 60%
- 4 = 80%
- 5 = 100%

## Per-screen formula

For each enabled work type on a screen:

`computed_md = base_md_for_work_type * complexity_percentage`

Then sum all screen rows by work type.

## Billable item derivation

Derived products in the billable products tab should read their MD totals from the relevant calculator source.

Examples:
- `UX primární (Desktop)` -> derived from summed screen calculator result
- `UI primární (Desktop)` -> derived from summed screen calculator result

These derived items should still be manually checkable and uncheckable in the project UI.

## Project complexity coefficient

Project complexity coefficient multiplies the whole billable subtotal.

Example:
- subtotal of selected billable products = X
- coefficient = 100% => X stays X
- coefficient = 120% => adjusted subtotal = X * 1.2

## PM logic

PM is calculated as a percentage of the adjusted billable subtotal.

## SLA logic

SLA is kept separate as fixed monthly fee logic.

It is not multiplied by project complexity coefficient.