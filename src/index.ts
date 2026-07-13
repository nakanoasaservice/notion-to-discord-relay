import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import type {
	ButtonStyle,
	ComponentType,
	RESTPostAPIWebhookWithTokenJSONBody,
} from "discord-api-types/v10";
import { Hono } from "hono";

import { formatProperty, truncate } from "./formatter";

interface NotionWebhookBody {
	data: PageObjectResponse;
}

// Discord's hard limit on the number of fields in a single embed.
const MAX_EMBED_FIELDS = 25;

async function sendDiscordMessage(
	webhookId: string,
	webhookToken: string,
	message: RESTPostAPIWebhookWithTokenJSONBody,
) {
	const url = new URL(
		`https://discord.com/api/webhooks/${webhookId}/${webhookToken}`,
	);
	// Non-application-owned webhooks can only send components (our link
	// button) when this flag is set; link-style buttons don't require an
	// interaction handler, so this is safe for a plain incoming webhook.
	url.searchParams.set("with_components", "true");

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(message),
	});

	if (!response.ok) {
		const errorBody = await response.text();
		console.error(errorBody);

		throw new Error("Discord API error", { cause: errorBody });
	}

	return response;
}

const app = new Hono();

app.post("/:webhookId/:webhookToken", async (c) => {
	const webhookId = c.req.param("webhookId");
	const webhookToken = c.req.param("webhookToken");

	// Use URLSearchParams (not c.req.query) so decoding is the exact inverse
	// of the client's URLSearchParams encoding
	const searchParams = new URL(c.req.url).searchParams;
	const title = searchParams.get("title");

	const body = await c.req.json<NotionWebhookBody>();

	await sendDiscordMessage(webhookId, webhookToken, {
		embeds: [
			{
				title: title ? truncate(title, 256) : undefined,
				url: body.data.url,
				color: 0x2f3437,
				fields: Object.entries(body.data.properties)
					.slice(0, MAX_EMBED_FIELDS)
					.map(([name, property]) => ({
						name: truncate(name, 256),
						value: truncate(formatProperty(property), 1024),
						inline: true,
					})),
			},
		],
		components: [
			{
				type: 1 satisfies ComponentType.ActionRow,
				components: [
					{
						type: 2 satisfies ComponentType.Button,
						style: 5 satisfies ButtonStyle.Link,
						label: "Open in Notion",
						url: body.data.url,
					},
				],
			},
		],
	});

	return c.body(null, 204);
});

export default app;
