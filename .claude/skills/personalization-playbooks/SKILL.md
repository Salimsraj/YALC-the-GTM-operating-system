---
name: personalization-playbooks
description: Decide whether to use personalization or a no-personalization playbook by outreach category. Use when building automated sequences or choosing message depth.
capability: outreach
version: 1.0.0
---

# Personalization Playbooks

Use this skill to choose the right level of personalization for the channel and segment.

## When This Skill Applies

- Picking an inbound, postbound, bridgebound, or outbound playbook
- Deciding whether to scale with trigger-based relevance only
- Aligning message depth with account value and signal strength

## What It Does

1. Classifies the outreach category.
2. Chooses personalization depth based on value and signal strength.
3. Suggests a message shape that matches the campaign motion.

## Pair With YALC

- Use `campaign:strategy` before launch.
- Use `campaign:create-sequence` or `email:create-sequence` after the playbook is chosen.
