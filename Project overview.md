# Project overview

## Purpose

This application is an internal quotation generator for Švejda Goldmann.

It helps internal staff create structured project offers in Markdown format.

The app is not:
- a CRM
- a document editor
- a versioning system
- a project management tool

It is:
- a guided generator
- an internal calculation tool
- a Markdown output builder

## Primary workflow

The operator goes through these areas:

1. Košilka (project cover sheet)
2. Screens definition
3. Billable products selection
4. Generated Markdown output

There is also a global settings area for shared defaults and norms.

## Main output

The final output is one complete Markdown offer that can be copied and saved externally.

## Users

Only authenticated users from `svejda-goldmann.cz`.

## Hosting and runtime

- browser-based
- hosted on GitHub Pages
- data stored in Supabase
- Google OAuth authentication