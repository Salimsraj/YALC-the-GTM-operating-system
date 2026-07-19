# YALC Command Reference

Use the main CLI as `yalc-gtm <command>` or through the repo wrapper as `pnpm cli <command>`. For any command, add `--help` to see its flags.

## Global Short Flags

- `-c`, `--config <path>`: config file path, default `~/.gtm-os/config.yaml`
- `-t`, `--tenant <slug>`: tenant slug override
- `-v`, `--verbose`: full stack traces and extra diagnostics
- `-h`, `--help`: show help
- `-V`, `--version`: show version

## Command Aliases

- `dashboard` = `ui`
- `connect-provider <name>` = legacy wrapper around `keys:connect [provider]`

## Campaigns

- `campaign:track`
- `campaign:create`
- `campaign:schedule`
- `campaign:report`
- `campaign:create-sequence`
- `campaign:dashboard`
- `campaign:monthly-report`
- `campaign:improve`
- `campaign:import-heyreach`
- `campaign:annotate`
- `campaign:strategy`

## Leads

- `leads:scrape-post`
- `leads:qualify`
- `leads:import`
- `leads:dedup`
- `leads:suppress`
- `leads:find-linkedin`
- `leads:export`

## LinkedIn

- `linkedin:answer-comments`
- `linkedin:reply-to-comments`

## Email

- `email:create-sequence`
- `email:send`
- `email:accounts`
- `email:status`

## CRM

- `crm:setup`
- `crm:import`
- `crm:push`
- `crm:sync`
- `crm:status`
- `crm:verify`

## Signals

- `signals:fetch`
- `signals:show`
- `signals:enrich`
- `signals:similar`
- `signals:watch`
- `signals:detect`
- `signals:list`
- `signals:triggers`

## Notion

- `notion:sync`
- `notion:bootstrap`

## Providers and Adapters

- `provider:list`
- `provider:add`
- `provider:install <spec>`
- `provider:test <name>`
- `provider:remove <name>`
- `adapters:list`
- `adapters:smoke <path>`
- `keys:connect [provider]`

## Review and Gates

- `gates:list`
- `review:setup`
- `review:reconfigure`
- `review:gate`
- `review:status`
- `review:doctor`
- `results:review`
- `notify:test`

## Skills

- `skills:browse`
- `skills:search <query>`
- `skills:create`
- `skills:install`
- `skills:run <skillId>`
- `skills:validate <path>`
- `skills:info <skillId>`

## Pipelines

- `pipeline:run`
- `pipeline:list`
- `pipeline:resume`
- `pipeline:status`
- `pipeline:create [name]`

## Frameworks and Routines

- `framework:derive`
- `framework:list`
- `framework:recommend`
- `framework:install <name>`
- `framework:run <name>`
- `framework:resume <name>`
- `framework:status <name>`
- `framework:logs <name>`
- `framework:disable <name>`
- `framework:set-hypothesis <name>`
- `framework:remove <name>`
- `routine:propose`
- `routine:install`
- `trigger <framework>`

## Setup and Onboarding

- `start`
- `setup`
- `onboard`
- `configure`
- `test-run`
- `migrate`
- `tenant:onboard`
- `dashboard` / `ui`

## Agents and Scheduling

- `agent:create`
- `agent:run`
- `agent:install`
- `agent:list`
- `scheduler:start`
- `scheduler:status`

## Memory and Context

- `memory:retrieve`
- `memory:dream`
- `memory:index`
- `context:sync`
- `context:watch`

## Research and Utility

- `personalize`
- `competitive-intel`
- `research`
- `orchestrate <query>`
- `visualize <viewId>`
- `dashboard`
- `update`
- `describe-change <pr-url>`
- `publish`
- `doctor`
- `calls:sync`
- `help [command]`

## Quick Notes

- `dashboard` is the browser SPA entry point and can be opened with `ui`.
- `connect-provider` is a compatibility alias for `keys:connect`.
- Most commands support `--help`, and many commands expose extra flags such as `--dry-run`, `--open`, `--port`, `--route`, or `--sequence` depending on the workflow.