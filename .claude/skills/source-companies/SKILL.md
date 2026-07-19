---
name: source-companies
description: Find target companies from data sources such as Apollo, Sales Navigator, Google Maps, and other discovery systems. Use when building account lists or expanding a target market.
capability: qualification
version: 1.0.0
---

# Source Companies

Use this skill to build a company list from a defined ICP.

## When This Skill Applies

- Building a prospect list from a market definition
- Expanding a seed list into lookalikes
- Pulling companies from multiple discovery sources and ranking them

## What It Does

1. Starts from the ICP or segment definition.
2. Pulls candidate companies from discovery sources.
3. Ranks and truncates to the best-fit accounts.

## Pair With YALC

- Feed the resulting accounts into `leads:import`.
- Use `adapters:list` to see which company discovery providers are available.
- Use `signals:enrich` before outreach if you want account intent layered in.
