---
name: deduplicate
description: Remove duplicates and merge multi-source prospect data. Use when cleaning a lead list, reconciling imports, or preparing a campaign-ready dataset.
capability: qualification
version: 1.0.0
---

# Deduplicate

Use this skill to clean duplicate leads or accounts before any send.

## When This Skill Applies

- Merging the same lead from multiple sources
- Cleaning exports before qualification or campaign creation
- Removing duplicate companies or contacts from a prospect list

## What It Does

1. Detects duplicates across names, domains, emails, and social URLs.
2. Merges the best data from each source.
3. Produces a clean list for qualification or import.

## Pair With YALC

- Use `leads:dedup` for local lists.
- Use `qualify-leads` after deduplication.
- Use `campaign:create` only after the list is clean.
