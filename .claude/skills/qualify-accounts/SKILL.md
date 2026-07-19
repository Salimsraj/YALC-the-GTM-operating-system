---
name: qualify-accounts
description: Score and tier target accounts using ICP fit, intent, and buying signals. Use when prioritizing accounts, ranking lists, or deciding which accounts deserve outbound effort.
capability: qualification
version: 1.0.0
---

# Qualify Accounts

Use this skill to turn a raw account list into ranked outbound tiers.

## When This Skill Applies

- Prioritizing accounts for ABM or sales outreach
- Scoring accounts by fit and signal strength
- Splitting a list into Tier 1, Tier 2, and Tier 3 buckets

## What It Does

1. Applies the ICP scoring matrix.
2. Layers in intent and signal strength.
3. Assigns an action tier for each account.

## Pair With YALC

- Use `signals:fetch` before scoring if you want live signals.
- Use `leads:dedup` before launch.
- Use `campaign:create` once the Tier 1 list is ready.
