import { describe, expect, it } from "vitest";

import { formatProperty, truncate } from "../src/formatter";

type Property = Parameters<typeof formatProperty>[0];

function richText(
	content: string,
	link: { url: string } | null = null,
	annotations: Partial<{
		bold: boolean;
		italic: boolean;
		strikethrough: boolean;
		underline: boolean;
		code: boolean;
		color: string;
	}> = {},
): object {
	return {
		type: "text",
		text: { content, link },
		annotations: {
			bold: false,
			italic: false,
			strikethrough: false,
			underline: false,
			code: false,
			color: "default",
			...annotations,
		},
		plain_text: content,
		href: link?.url ?? null,
	};
}

describe("formatProperty", () => {
	it("renders rich text links as Markdown links", () => {
		const property = {
			type: "rich_text",
			rich_text: [richText("Docs", { url: "https://example.com" })],
		} as unknown as Property;

		expect(formatProperty(property)).toBe("[Docs](https://example.com)");
	});

	it("renders plain rich text as-is", () => {
		const property = {
			type: "rich_text",
			rich_text: [richText("plain text & stuff")],
		} as unknown as Property;

		expect(formatProperty(property)).toBe("plain text & stuff");
	});

	it("renders each annotation as its Discord Markdown equivalent", () => {
		const cases: [string, object][] = [
			["bold", { bold: true }],
			["italic", { italic: true }],
			["strikethrough", { strikethrough: true }],
			["underline", { underline: true }],
			["code", { code: true }],
		];

		for (const [annotation, annotations] of cases) {
			const property = {
				type: "rich_text",
				rich_text: [richText("styled", null, annotations)],
			} as unknown as Property;

			const expected: Record<string, string> = {
				bold: "**styled**",
				italic: "*styled*",
				strikethrough: "~~styled~~",
				underline: "__styled__",
				code: "`styled`",
			};

			expect(formatProperty(property)).toBe(expected[annotation]);
		}
	});

	it("combines multiple annotations, innermost code first", () => {
		const property = {
			type: "rich_text",
			rich_text: [
				richText("styled", null, { bold: true, italic: true, code: true }),
			],
		} as unknown as Property;

		expect(formatProperty(property)).toBe("***`styled`***");
	});

	it("keeps surrounding whitespace outside the Markdown markers", () => {
		const property = {
			type: "rich_text",
			rich_text: [richText("  styled  ", null, { bold: true })],
		} as unknown as Property;

		expect(formatProperty(property)).toBe("  **styled**  ");
	});

	it("ignores the color annotation, which has no Discord equivalent", () => {
		const property = {
			type: "rich_text",
			rich_text: [richText("colored", null, { color: "red" })],
		} as unknown as Property;

		expect(formatProperty(property)).toBe("colored");
	});

	it("wraps annotated links in the Markdown marker", () => {
		const property = {
			type: "rich_text",
			rich_text: [
				richText("Docs", { url: "https://example.com" }, { bold: true }),
			],
		} as unknown as Property;

		expect(formatProperty(property)).toBe("**[Docs](https://example.com)**");
	});

	it("returns the raw URL for url properties", () => {
		const property = {
			type: "url",
			url: "https://example.com/?a=1&b=2",
		} as unknown as Property;

		expect(formatProperty(property)).toBe("https://example.com/?a=1&b=2");
	});

	it("renders files as comma-joined Markdown links", () => {
		const property = {
			type: "files",
			files: [
				{
					type: "file",
					name: "report.pdf",
					file: { url: "https://files.example.com/report.pdf" },
				},
				{
					type: "external",
					name: "spec",
					external: { url: "https://example.com/spec" },
				},
			],
		} as unknown as Property;

		expect(formatProperty(property)).toBe(
			"[report.pdf](https://files.example.com/report.pdf), [spec](https://example.com/spec)",
		);
	});

	it("renders relations as app.notion.com links without dashes", () => {
		const property = {
			type: "relation",
			relation: [
				{ id: "12345678-90ab-cdef-1234-567890abcdef" },
				{ id: "abcdef12-3456-7890-abcd-ef1234567890" },
			],
		} as unknown as Property;

		expect(formatProperty(property)).toBe(
			"[Open in Notion](https://app.notion.com/p/1234567890abcdef1234567890abcdef), " +
				"[Open in Notion](https://app.notion.com/p/abcdef1234567890abcdef1234567890)",
		);
	});

	it("recurses into rollup arrays", () => {
		const property = {
			type: "rollup",
			rollup: {
				type: "array",
				array: [
					{
						type: "rich_text",
						rich_text: [richText("a & b")],
					},
				],
			},
		} as unknown as Property;

		expect(formatProperty(property)).toBe("a & b");
	});

	it("falls back to bracketed placeholders for empty values", () => {
		expect(
			formatProperty({ type: "url", url: null } as unknown as Property),
		).toBe("[No URL]");
		expect(
			formatProperty({
				type: "select",
				select: null,
			} as unknown as Property),
		).toBe("[No Selection]");
		expect(
			formatProperty({
				type: "checkbox",
				checkbox: true,
			} as unknown as Property),
		).toBe("✅");
	});
});

describe("truncate", () => {
	it("returns text unchanged when within the limit", () => {
		expect(truncate("a".repeat(256), 256)).toBe("a".repeat(256));
	});

	it("truncates over-limit text ending with …", () => {
		expect(truncate("a".repeat(257), 256)).toBe(`${"a".repeat(255)}…`);
	});

	it("counts astral characters as one character", () => {
		expect(truncate("😀".repeat(257), 256)).toBe(`${"😀".repeat(255)}…`);
	});
});
