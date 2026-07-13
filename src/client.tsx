import { useCallback, useEffect, useMemo, useState } from "hono/jsx";
import { render } from "hono/jsx/dom";

type ParsedWebhook =
	| { ok: true; webhookId: string; webhookToken: string }
	| { ok: false; error: string };

function parseWebhookUrl(input: string): ParsedWebhook {
	let url: URL;
	try {
		url = new URL(input.trim());
	} catch {
		return { ok: false, error: "Not a valid URL" };
	}

	if (url.hostname !== "discord.com") {
		return { ok: false, error: "Host must be discord.com" };
	}

	const match = url.pathname.match(/^\/api\/webhooks\/([^/]+)\/([^/]+)\/?$/);
	if (!match?.[1] || !match[2]) {
		return {
			ok: false,
			error: "Path must look like /api/webhooks/{WEBHOOK_ID}/{WEBHOOK_TOKEN}",
		};
	}

	return { ok: true, webhookId: match[1], webhookToken: match[2] };
}

// Reconstruct the original Discord webhook URL from our worker URL so
// opening a generated URL pre-fills the form (URL = settings page)
function getWebhookUrlFromLocation(): string {
	const [webhookId, webhookToken] = window.location.pathname
		.replace(/^\//, "")
		.split("/");

	if (!webhookId || !webhookToken) return "";

	return `https://discord.com/api/webhooks/${webhookId}/${webhookToken}`;
}

function getTitleFromUrl(): string {
	const searchParams = new URLSearchParams(window.location.search);
	return searchParams.get("title") || "";
}

// Update URL based on form values
function updateUrl(parsed: ParsedWebhook, title: string) {
	if (typeof window === "undefined") return;

	let newUrl: string;
	if (parsed.ok) {
		const searchParams = new URLSearchParams();
		if (title) {
			searchParams.set("title", title);
		}
		const query = searchParams.toString();
		newUrl = `/${parsed.webhookId}/${parsed.webhookToken}${query ? `?${query}` : ""}`;
	} else {
		newUrl = title ? `/?title=${encodeURIComponent(title)}` : "/";
	}

	// Don't update if the URL is the same
	if (window.location.pathname + window.location.search === newUrl) {
		return;
	}

	window.history.replaceState(null, "", newUrl);
}

function App() {
	const [webhookUrl, setWebhookUrl] = useState(() =>
		getWebhookUrlFromLocation(),
	);
	const [title, setTitle] = useState(() => getTitleFromUrl());
	const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
		"idle",
	);

	const parsed = useMemo(() => parseWebhookUrl(webhookUrl), [webhookUrl]);
	const isValid = webhookUrl === "" || parsed.ok;

	const generatedUrl = useMemo(() => {
		const origin = typeof window !== "undefined" ? window.location.origin : "";
		const baseUrl = origin || "https://your-worker.workers.dev";

		if (!parsed.ok) {
			let url = `${baseUrl}/{WEBHOOK_ID}/{WEBHOOK_TOKEN}`;
			if (title) {
				url += `?title=${encodeURIComponent(title)}`;
			}
			return url;
		}

		let url = `${baseUrl}/${parsed.webhookId}/${parsed.webhookToken}`;
		if (title) {
			url += `?title=${encodeURIComponent(title)}`;
		}
		return url;
	}, [parsed, title]);

	const copyToClipboard = useCallback(async () => {
		if (!parsed.ok) return;
		try {
			await navigator.clipboard.writeText(generatedUrl);
			setCopyState("copied");
		} catch (err) {
			console.error("Failed to copy:", err);
			setCopyState("failed");
		}
	}, [parsed, generatedUrl]);

	// Update URL when form values change
	useEffect(() => {
		updateUrl(parsed, title);
	}, [parsed, title]);

	// Listen to popstate event to detect URL changes (browser back/forward)
	useEffect(() => {
		const handlePopState = () => {
			setWebhookUrl(getWebhookUrlFromLocation());
			setTitle(getTitleFromUrl());
		};

		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, []);

	// Reset copy state after delay
	useEffect(() => {
		if (copyState === "idle") return;

		const timeoutId = window.setTimeout(
			() => setCopyState("idle"),
			copyState === "copied" ? 1500 : 2000,
		);

		return () => window.clearTimeout(timeoutId);
	}, [copyState]);

	return (
		<div
			style={{
				fontFamily:
					'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
				maxWidth: "800px",
				margin: "0 auto",
				padding: "2rem",
				color: "#37352f",
			}}
		>
			<header style={{ marginBottom: "2rem", textAlign: "center" }}>
				<h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
					Notion to Discord Relay
				</h1>
				<div
					style={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						gap: "1rem",
						marginBottom: "1rem",
					}}
				>
					<a
						href="https://github.com/nakanoasaservice/notion-to-discord-relay"
						target="_blank"
						rel="noreferrer"
						style={{
							display: "inline-flex",
							alignItems: "center",
							color: "#37352f",
							textDecoration: "none",
							transition: "opacity 0.2s",
						}}
						onMouseEnter={(e) => {
							(e.currentTarget as HTMLElement).style.opacity = "0.7";
						}}
						onMouseLeave={(e) => {
							(e.currentTarget as HTMLElement).style.opacity = "1";
						}}
					>
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="currentColor"
							style={{ display: "block" }}
							aria-label="GitHub Repository"
						>
							<title>GitHub Repository</title>
							<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
						</svg>
					</a>
					<a
						href="https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fnakanoasaservice%2Fnotion-to-discord-relay"
						target="_blank"
						rel="noreferrer"
						style={{ display: "inline-block" }}
					>
						<img
							src="https://deploy.workers.cloudflare.com/button"
							alt="Deploy to Cloudflare Workers"
							style={{
								height: "32px",
								width: "auto",
								border: "none",
							}}
						/>
					</a>
				</div>
				<p
					style={{
						fontSize: "0.9rem",
						color: "#666",
						marginBottom: "0.5rem",
					}}
				>
					👆 Click to deploy your own private instance to Cloudflare Workers
					instantly.
				</p>
				<p style={{ fontSize: "1.2rem", color: "#666" }}>
					Automatically forward Notion webhook events to Discord channels with
					beautifully formatted embeds.
				</p>
			</header>

			<main>
				<section style={{ marginBottom: "3rem" }}>
					<h2
						style={{ borderBottom: "1px solid #eee", paddingBottom: "0.5rem" }}
					>
						How it works
					</h2>
					<p>
						This relay sits between Notion and Discord. When you configure a
						webhook in Notion (e.g., from a database automation), it sends data
						to this worker, which formats it as an embed and posts it to your
						Discord channel using the channel's incoming webhook.
					</p>
				</section>

				<section style={{ marginBottom: "3rem" }}>
					<h2
						style={{ borderBottom: "1px solid #eee", paddingBottom: "0.5rem" }}
					>
						Setup Guide
					</h2>
					<ol style={{ paddingLeft: "1.5rem" }}>
						<li style={{ marginBottom: "0.5rem" }}>
							<strong>Create a Discord webhook:</strong> In Discord, open your
							server's <em>Channel Settings</em> → <em>Integrations</em> →{" "}
							<em>Webhooks</em> → <em>New Webhook</em>, give it a name, and copy
							the webhook URL.
						</li>
						<li style={{ marginBottom: "0.5rem" }}>
							<strong>Generate your URL:</strong> Paste the webhook URL into the
							form below and optionally set an embed title.
						</li>
						<li style={{ marginBottom: "0.5rem" }}>
							<strong>Copy the generated URL:</strong> It contains your webhook
							credentials, so treat it as secret — just like the webhook URL
							itself.
						</li>
						<li style={{ marginBottom: "0.5rem" }}>
							<strong>Configure Notion:</strong> In your Notion database, go to
							Settings → Automations → New action → Send webhook, and paste the
							generated URL.
						</li>
					</ol>
				</section>

				<section
					style={{
						backgroundColor: "#f7f7f5",
						padding: "2rem",
						borderRadius: "8px",
						border: "1px solid #e0e0e0",
					}}
				>
					<h2
						style={{
							marginTop: 0,
							borderBottom: "1px solid #e0e0e0",
							paddingBottom: "0.5rem",
							marginBottom: "1.5rem",
						}}
					>
						Webhook URL Generator
					</h2>

					<div
						style={{
							display: "flex",
							gap: "1.5rem",
							flexWrap: "wrap",
							marginBottom: "1.5rem",
						}}
					>
						<div style={{ flex: "1 1 300px" }}>
							<label
								htmlFor="webhookUrl"
								style={{
									display: "block",
									marginBottom: "0.5rem",
									fontWeight: "bold",
								}}
							>
								Discord Webhook URL <span style={{ color: "red" }}>*</span>
							</label>
							<input
								type="url"
								id="webhookUrl"
								placeholder="https://discord.com/api/webhooks/.../..."
								value={webhookUrl}
								onInput={(e) =>
									setWebhookUrl((e.target as HTMLInputElement).value)
								}
								style={{
									width: "100%",
									padding: "0.75rem",
									borderRadius: "4px",
									border: `1px solid ${isValid ? "#ccc" : "#d32f2f"}`,
									fontSize: "0.9rem",
									fontFamily: "monospace",
									boxSizing: "border-box",
								}}
							/>
							<small
								style={{
									color: "#666",
									display: "block",
									marginTop: "0.25rem",
								}}
							>
								Channel Settings → Integrations → Webhooks
							</small>
						</div>

						<div style={{ flex: "1 1 300px" }}>
							<label
								htmlFor="title"
								style={{
									display: "block",
									marginBottom: "0.5rem",
									fontWeight: "bold",
								}}
							>
								Custom Title (Optional)
							</label>
							<textarea
								id="title"
								rows={1}
								value={title}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
									}
								}}
								onInput={(e) => {
									const target = e.currentTarget as HTMLTextAreaElement;
									if (target) {
										const valueWithoutNewlines = target.value.replace(
											/\n/g,
											"",
										);
										setTitle(valueWithoutNewlines);
									}
								}}
								placeholder="e.g. Task Updated"
								style={{
									width: "100%",
									padding: "0.75rem",
									borderRadius: "4px",
									border: "1px solid #ccc",
									fontSize: "1rem",
									boxSizing: "border-box",
									resize: "none",
									overflowWrap: "break-word",
									wordBreak: "break-word",
									whiteSpace: "pre-wrap",
									fieldSizing: "content",
								}}
							/>
							<small
								style={{
									color: "#666",
									display: "block",
									marginTop: "0.25rem",
								}}
							>
								A title to display at the top of the Discord embed.
							</small>
						</div>
					</div>

					<div style={{ marginTop: "2rem" }}>
						<label
							htmlFor="generatedUrl"
							style={{
								display: "block",
								marginBottom: "0.5rem",
								fontWeight: "bold",
								color: isValid ? "#2e7d32" : "#d32f2f",
							}}
						>
							{isValid ? "Your Webhook URL" : "Invalid Webhook URL"}
						</label>
						<div
							style={{
								display: "flex",
								gap: "0.5rem",
							}}
						>
							<button
								type="button"
								onClick={copyToClipboard}
								disabled={!parsed.ok}
								aria-label="Copy Webhook URL"
								style={{
									flex: "1 1 0",
									minWidth: "0",
									display: "flex",
									alignItems: "center",
									padding: "0.75rem 0.875rem",
									backgroundColor: "#fff",
									borderRadius: "6px",
									fontSize: "0.9rem",
									wordBreak: "break-all",
									border: "1px solid #ddd",
									fontFamily: "monospace",
									minHeight: "2.75rem",
									color: parsed.ok ? "#333" : "#999",
									cursor: parsed.ok ? "pointer" : "not-allowed",
									boxSizing: "border-box",
									textAlign: "left",
									appearance: "none",
								}}
							>
								{parsed.ok
									? generatedUrl
									: webhookUrl
										? parsed.error
										: "Please paste your Discord webhook URL"}
							</button>
							<button
								type="button"
								onClick={copyToClipboard}
								disabled={!parsed.ok}
								style={{
									padding: "0.75rem",
									backgroundColor: !parsed.ok ? "#a5d6a7" : "#2e7d32",
									color: "white",
									border: "none",
									borderRadius: "4px",
									cursor: !parsed.ok ? "not-allowed" : "pointer",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									minWidth: "44px",
									width: "44px",
								}}
								aria-label="Copy URL"
							>
								<svg
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									aria-label="Copy URL"
								>
									<title>Copy URL</title>
									<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
									<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
								</svg>
							</button>
						</div>
						<small
							style={{
								color: copyState === "failed" ? "#d32f2f" : "#2e7d32",
								display: "block",
								marginTop: "0.5rem",
								fontWeight: "bold",
								visibility: copyState !== "idle" ? "visible" : "hidden",
								opacity: copyState !== "idle" ? 1 : 0,
								transition: "opacity 0.2s ease-in-out",
								minHeight: "1.2rem",
							}}
						>
							{copyState === "copied"
								? "Copied!"
								: copyState === "failed"
									? "Failed to copy"
									: ""}
						</small>
					</div>
				</section>
			</main>
		</div>
	);
}

// biome-ignore lint/style/noNonNullAssertion: root is guaranteed to be in the document
const root = document.getElementById("root")!;
render(<App />, root);
