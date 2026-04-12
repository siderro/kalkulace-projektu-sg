# Data model

## Goal

Use a practical hybrid model that is easy to maintain and future-proof enough for more derived calculators later.

## Suggested entities

### global_settings

System-wide values such as:
- default_hourly_rate
- default_md_rate
- default_pm_percent
- default_sla_monthly_fee
- default_programming_hourly_rate
- default_first_mobile_set
- default_days_to_start

### screen_complexity_calibration

Defines base MD values and complexity percentages.

Fields may include:
- work_type_key
- complexity_level
- percentage
- base_md_at_level_5
- computed_md

Alternative approach:
- store base MD per work type separately
- store percentage per complexity separately

### billable_product_definitions

Fields:
- id
- section_key
- label
- calculation_type
- source_key
- default_enabled
- default_md
- default_price_mode
- override_allowed
- sort_order
- active

### projects

Fields:
- id
- name
- version_label
- project_date
- hourly_rate
- md_rate
- complexity_coefficient_percent
- pm_percent
- first_mobile_set
- sla_monthly_fee
- days_to_start
- expected_start_date
- programming_hourly_rate
- notes
- created_by
- created_at
- updated_at

### project_screens

Fields:
- id
- project_id
- name
- complexity
- note
- ux_primary_desktop
- ux_secondary_mobile
- ui_primary_desktop
- ui_secondary_mobile
- webflow
- sort_order

### project_billable_items

Snapshot of current project item state.

Fields:
- id
- project_id
- product_definition_id
- enabled
- md_value
- price_value
- value_source
- overridden
- override_note
- sort_order

## Value source examples

Useful values for `value_source`:
- manual_default
- derived_from_screens
- overridden_manual
- future_testing_calculator

## Design note

Do not store project version history.
The database stores current working state only.