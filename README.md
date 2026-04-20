# Preview Environments for Full-Stack Apps: Solving the Backend Problem

Companion code for the Autonoma blog post 'Preview Environments for Full-Stack Apps: Solving the Backend Problem'.

> Companion code for the Autonoma blog post: **[Preview Environments for Full-Stack Apps: Solving the Backend Problem](https://getautonoma.com/blog/preview-environments-full-stack)**

## Requirements

Docker + Docker Compose (for the compose stack) and Node.js 20+ with npm (for the Environment Factory TypeScript server). Set ENV_FACTORY_SECRET in your environment before starting the server.

## Quickstart

```bash
git clone https://github.com/Autonoma-Tools/preview-environments-full-stack.git
cd preview-environments-full-stack
Clone the repo, then either (a) run the Docker Compose preview stack with `COMPOSE_PROJECT_NAME=pr-42 docker compose -f docker-compose.preview.yml up -d` for an isolated frontend + API + Postgres stack, or (b) run the Environment Factory endpoint with `npm install && npm run dev` to start the discover/up/down endpoint on port 3001.
```

## Project structure

```
.
├── LICENSE
├── README.md
├── .gitignore
├── docker-compose.preview.yml
├── package.json
├── tsconfig.json
├── src/
│   └── env-factory.ts
└── examples/
    ├── compose-up-down.sh
    └── env-factory-client.ts
```

- `src/` — primary source files for the snippets referenced in the blog post.
- `examples/` — runnable examples you can execute as-is.
- `docs/` — extended notes, diagrams, or supporting material (when present).

## About

This repository is maintained by [Autonoma](https://getautonoma.com) as reference material for the linked blog post. Autonoma builds autonomous AI agents that plan, execute, and maintain end-to-end tests directly from your codebase.

If something here is wrong, out of date, or unclear, please [open an issue](https://github.com/Autonoma-Tools/preview-environments-full-stack/issues/new).

## License

Released under the [MIT License](./LICENSE) © 2026 Autonoma Labs.
