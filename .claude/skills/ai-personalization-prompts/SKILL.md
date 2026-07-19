---
name: ai-personalization-prompts
description: Prompt set for generating ICP labels, company descriptions, problem statements, subject lines, and similar-company phrasing. Use when automating outreach variable generation.
capability: outreach
version: 1.0.0
---

# AI Personalization Prompts

Use this skill to generate reusable personalization variables from a company or prospect.

## When This Skill Applies

- Building AI-assisted personalization workflows
- Generating message variables from company research
- Standardizing prompt-driven outreach data

## What It Does

1. Produces compact prompt templates for common personalization tasks.
2. Keeps outputs short enough for sequence insertion.
3. Helps standardize what gets fed into `personalize`.

## Pair With YALC

- Use `research` or `research-prospect` to gather the source context.
- Use `personalize` to turn the prompt output into final outreach.
