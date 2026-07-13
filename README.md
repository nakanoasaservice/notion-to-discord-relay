# Notion to Discord Relay

Automatically forward Notion webhook events to Discord channels with beautifully formatted embeds — powered by Discord's incoming webhooks.

**🚀 Hosted instance (recommended): <https://notion-to-discord-relay.naas.workers.dev/>**

Built on [Cloudflare Workers](https://workers.cloudflare.com/) with [Hono](https://hono.dev/). A webhook-based sibling of [notion-to-discord-bot](https://github.com/nakanoasaservice/notion-to-discord-bot), modeled after [notion-to-google-chat-relay](https://github.com/nakanoasaservice/notion-to-google-chat-relay)'s design.

## How it works

```
Notion database automation ──▶ this worker ──▶ Discord incoming webhook
      (Send webhook)         (formats embed)      (posts to your channel)
```

You paste your Discord webhook URL into the generator page. It extracts the webhook ID and token and produces a worker URL like:

```
https://<worker-host>/{WEBHOOK_ID}/{WEBHOOK_TOKEN}?title={OPTIONAL_TITLE}
```

Set that URL as a "Send webhook" action in a Notion database automation. Every triggered event is posted to your channel as an embed showing all page properties, with an "Open in Notion" button.

## Quick Start

1. **Create a Discord webhook**: In Discord, open the channel's **Settings** → **Integrations** → **Webhooks** → **New Webhook** → name it → copy the webhook URL.
2. **Generate your URL**: Open the [generator page](https://notion-to-discord-relay.naas.workers.dev/), paste the webhook URL, and optionally set an embed title.
3. **Configure Notion**: In your Notion database, go to **Settings → Automations → New action → Send webhook**, and paste the generated URL.

> [!WARNING]
> The generated URL contains your webhook's ID and token — anyone who has it can post to your channel. Treat it as a secret, exactly like the Discord webhook URL itself.

## URL as Configuration

There is no database and no server-side state. Everything is encoded in the URL:

| Part | Where | Description |
|---|---|---|
| `{WEBHOOK_ID}` | path | Discord webhook ID from the webhook URL |
| `{WEBHOOK_TOKEN}` | path | Discord webhook token from the webhook URL |
| `title` | query | Optional embed title |

Opening a generated URL in the browser pre-fills the generator form again — the URL *is* the settings page.

## Supported Notion properties

Title, rich text, URL, select, multi-select, date, checkbox, email, phone, number, status, created/edited time & by, unique ID, relation, people, formula, files, rollup, verification, button, and place.

## Self-hosting

For most users the [hosted instance](https://notion-to-discord-relay.naas.workers.dev/) is all you need. If you prefer to run your own private instance, click the button below — Cloudflare will deploy it to your own Cloudflare Workers account in just a few clicks:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fnakanoasaservice%2Fnotion-to-discord-relay)

Or deploy manually:

```bash
git clone https://github.com/nakanoasaservice/notion-to-discord-relay.git
cd notion-to-discord-relay
bun install
bun run deploy
```

No secrets are needed — authentication lives entirely in the webhook URL.

## Development

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite dev server (worker + UI) |
| `bun run build` | Build worker + static assets |
| `bun run preview` | Build and preview locally |
| `bun run deploy` | Build and deploy to Cloudflare Workers |
| `bun run test` | Run tests |
| `bun run check` | Lint and format check |
| `bun run check:fix` | Auto-fix lint and format issues |
| `bun run check-types` | Type check |
| `bun run cf-typegen` | Generate Cloudflare binding types |

**Project structure:**
- `src/index.ts` — Main Hono application & Discord webhook integration
- `src/formatter.ts` — Notion property formatting logic
- `src/client.tsx` — Client-side webhook URL generator UI

## Known limitations

- Discord embeds are limited to 6,000 characters total, 256 characters per title/field name, 1,024 characters per field value, and 25 fields per embed; pages with many or very large properties will have extra fields dropped or values truncated.
- Webhook messages are one-way; there's no retry logic if Discord's API returns an error (the error is logged in Workers Logs).
- Discord may rate-limit webhook requests posted in quick succession.

## Contributing

Contributions are welcome. Please feel free to submit a Pull Request.

## License

[MIT](./LICENSE)

## Acknowledgments

Built with [Hono](https://hono.dev/), powered by [Cloudflare Workers](https://workers.cloudflare.com/).
