import { beforeEach, describe, expect, it, vi } from "vitest";

import app from "../src/index";

function titleProperty(content: string) {
	return {
		type: "title",
		title: [
			{
				type: "text",
				text: { content, link: null },
				annotations: {
					bold: false,
					italic: false,
					strikethrough: false,
					underline: false,
					code: false,
					color: "default",
				},
				plain_text: content,
				href: null,
			},
		],
	};
}

const notionPayload = {
	data: {
		url: "https://example.com",
		properties: {
			name: titleProperty("Test"),
		},
	},
};

describe("Notion to Discord Relay worker", () => {
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => "",
		});
		global.fetch = mockFetch as unknown as typeof global.fetch;
	});

	it("forwards the Notion payload as a Discord embed", async () => {
		const response = await app.request(
			"/AAAA1234/BBBB5678?title=Task%20Updated",
			{
				method: "POST",
				body: JSON.stringify(notionPayload),
			},
		);

		expect(response.status).toBe(204);
		expect(mockFetch).toHaveBeenCalledTimes(1);

		const [calledUrl, init] = mockFetch.mock.calls[0] as [
			URL | string,
			RequestInit,
		];

		const url = new URL(String(calledUrl));
		expect(url.origin).toBe("https://discord.com");
		expect(url.pathname).toBe("/api/webhooks/AAAA1234/BBBB5678");
		expect(url.searchParams.get("with_components")).toBe("true");

		expect(init.method).toBe("POST");
		expect(init.headers).toMatchObject({
			"Content-Type": "application/json",
		});

		const body = JSON.parse(String(init.body));
		const embed = body.embeds[0];
		expect(embed.title).toBe("Task Updated");
		expect(embed.url).toBe("https://example.com");
		expect(embed.color).toBe(0x2f3437);
		expect(embed.fields).toEqual([
			{ name: "name", value: "Test", inline: true },
		]);

		expect(body.components).toEqual([
			{
				type: 1,
				components: [
					{
						type: 2,
						style: 5,
						label: "Open in Notion",
						url: "https://example.com",
					},
				],
			},
		]);
	});

	it("omits the embed title when no title is given", async () => {
		const response = await app.request("/AAAA1234/BBBB5678", {
			method: "POST",
			body: JSON.stringify(notionPayload),
		});

		expect(response.status).toBe(204);

		const init = mockFetch.mock.calls[0]?.[1] as RequestInit;
		const body = JSON.parse(String(init.body));
		expect(body.embeds[0].title).toBeUndefined();
	});

	it("caps embed fields at Discord's 25-field limit", async () => {
		const properties = Object.fromEntries(
			Array.from({ length: 30 }, (_, i) => [
				`prop-${i}`,
				titleProperty(`value-${i}`),
			]),
		);

		const response = await app.request("/AAAA1234/BBBB5678", {
			method: "POST",
			body: JSON.stringify({
				data: { url: "https://example.com", properties },
			}),
		});

		expect(response.status).toBe(204);

		const init = mockFetch.mock.calls[0]?.[1] as RequestInit;
		const body = JSON.parse(String(init.body));
		expect(body.embeds[0].fields).toHaveLength(25);
	});
});
