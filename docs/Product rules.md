# Product rules

## Core principle

The app combines:
- manual inputs
- globally defined defaults
- derived calculated values

## Main tabs

### 1. Košilka

Stores project-level information such as:
- project name
- hourly rate
- MD rate
- complexity coefficient
- version number
- PM percentage
- date
- first mobile set flag
- SLA fee
- days until start
- expected start date
- programming per hour

Some values come from global defaults but can be overridden per project.

### 2. Screens

Each screen contains:
- name
- complexity 1–5
- note
- UX primary desktop flag
- UX secondary mobile flag
- UI primary desktop flag
- UI secondary mobile flag
- Webflow flag

This tab is a calculation source for some billable products.

### 3. Billable products

Products are grouped into sections such as:
- Průzkum a pozice
- Koncept
- Vizuální design
- Programming

Products may be:
- manual default items
- derived from the screens calculator
- later derived from other calculators

Every product should still be checkable and uncheckable in the project.

### 4. Output

The output is a generated Markdown offer based on one fixed template.

## Important calculation rule

Project complexity coefficient multiplies the whole billable subtotal.

It does not directly modify:
- SLA logic
- PM percentage logic

PM is calculated as percentage from adjusted billable subtotal.
SLA is a separate fixed monthly amount.