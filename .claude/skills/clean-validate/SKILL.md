---
name: clean-validate
description: Verify emails, phones, and data hygiene before outreach. Use when preparing a list for sending or checking deliverability risk.
capability: qualification
version: 1.0.0
---

# Clean Validate

Use this skill to confirm a list is safe to send.

## When This Skill Applies

- Checking deliverability before cold email
- Validating contact data after enrichment
- Flagging risky, stale, or incomplete records

## What It Does

1. Checks contact completeness and validity.
2. Flags risky delivery targets.
3. Returns a send-safe subset and a cleanup list.

## Pair With YALC

- Use `email:send` after validation.
- Use `provider:test` if you want to confirm a provider before the workflow.
