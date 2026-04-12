# Technical constraints

## Core constraints

- browser-based
- hosted on GitHub Pages
- Supabase as database
- Google OAuth authentication
- access allowed only for `svejda-goldmann.cz`

## Engineering principles

- choose simplicity
- avoid overengineering
- keep calculations isolated from UI
- keep formatting isolated from calculations
- support future derived calculators without redesigning the whole system

## Product constraints

Do not implement in v1:
- audit log
- role system
- database version history
- rich markdown editing
- docx export
- advanced search
- dark mode

## UI principles

- desktop-first
- internal backoffice feel
- efficient and understandable
- derived values should be visibly distinct
- overrides should be explicit