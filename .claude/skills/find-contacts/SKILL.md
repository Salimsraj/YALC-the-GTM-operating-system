---
name: find-contacts
description: Find contacts at target accounts with boolean search, Clay, or similar contact discovery workflows. Use when mapping buying committees or finding decision-makers.
capability: qualification
version: 1.0.0
---

# Find Contacts

Use this skill to map people onto a target account list.

## When This Skill Applies

- Finding one or more decision-makers at a company
- Building a buying committee by role or seniority
- Searching for people by title, geography, and seniority

## What It Does

1. Takes a list of target companies or a market segment.
2. Produces role-based contact searches.
3. Returns a shortlist that can be enriched or qualified next.

## Pair With YALC

- Use `leads:find-linkedin` when you already have names and emails.
- Use `leads:qualify` on the resulting people list.
- Use `personalize` to tailor messages to the shortlist.
