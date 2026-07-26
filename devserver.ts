import fs from "node:fs/promises";
import { execSync } from "node:child_process";
import http from "node:http";
import chalk from "chalk";
import { createServer } from "vite";
//@ts-expect-error no typedefs
import { server as wisp } from "@mercuryworkshop/wisp-js/server";
import {
	normalizeWebsocketUrl,
	warnOnUrlEscape,
	runRspack,
	black,
	printBanner
} from "./devlib.ts";
import rspackConfig from "./rspack.config.ts";

let image: Buffer;
try {
	image = await fs.readFile("./assets/scramjet-mini-noalpha.png");
} catch (e) {
	console.warn("Warning: could not read banner image (./assets/scramjet-mini-noalpha.png):", e);
	image = Buffer.from("");
}

let commit = "unknown";
let branch = "unknown";
let version = "unknown";
try {
	commit = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).replace(/\r?\n|\r/g, "");
} catch (e) {
	console.warn("git commit not available:", e?.message ?? e);
}
try {
	branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).replace(/\r?\n|\r/g, "");
} catch (e) {
	console.warn("git branch not available:", e?.message ?? e);
}
try {
	const packagejson = JSON.parse(await fs.readFile("./package.json", "utf-8"));
	version = packagejson.version ?? version;
} catch (e) {
	console.warn("package.json not found or invalid:", e?.message ?? e);
}

const DEMO_PORT = process.env.DEMO_PORT || 4148;
const WISP_PORT = process.env.WISP_PORT || 4142;

if (process.env.VITE_WISP_URL) {
	process.env.VITE_WISP_URL = normalizeWebsocketUrl(process.env.VITE_WISP_URL);
} else {
	process.env.VITE_WISP_URL = `ws://localhost:${WISP_PORT}/`;
}

const wispserver = http.createServer((req, res) => {
	res.writeHead(200, { "Content-Type": "text/plain" });
	res.end("wisp server js rewrite");
});

if (wisp) {
	// Ensure expected shape
	if (!wisp.options || typeof wisp.options !== "object") {
		// ensure we have an options object to configure
		(wisp as any).options = {};
	}
	try {
		wisp.options.allow_private_ips = true;
		wisp.options.allow_loopback_ips = true;
	} catch (e) {
		console.warn("Could not set wisp options:", e?.message ?? e);
	}

	if (typeof wisp.routeRequest === "function") {
		wispserver.on("upgrade", (req, socket, head) => {
			wisp.routeRequest(req, socket, head);
		});
	} else {
		console.warn("wisp.server does not expose routeRequest; websocket upgrades will not be handled.");
	}
} else {
	console.warn("@mercuryworkshop/wisp-js/server did not provide a 'server' export; websocket handling is disabled.");
}

wispserver.listen(Number(WISP_PORT));

const server = await createServer({
	configFile: "./packages/demo/vite.config.ts",
	root: "./packages/demo",
	server: {
		port: Number(DEMO_PORT),
		strictPort: true,
	},
});

warnOnUrlEscape(server);

await server.listen();

const accent = (text: string) => chalk.hex("#f1855b").bold(text);
const highlight = (text: string) => chalk.hex("#fdd76c").bold(text);
const urlColor = (text: string) => chalk.hex("#64DFDF").underline(text);
const note = (text: string) => chalk.hex("#CDB4DB")(text);
const connector = chalk.hex("#8D99AE").dim("@");

const lines = [
	black()(`${highlight("SCRAMJET DEV SERVER")}`),
	black()(
		`${accent("demo")} ${connector} ${urlColor(
			`http://localhost:${DEMO_PORT}/`
		)}`
	),
	black()(
		`${accent("wisp")} ${connector} ${urlColor(
			process.env.VITE_WISP_URL ?? ""
		)}`
	),
	black()(chalk.dim(`[${branch}] ${commit} scramjet/${version}`)),
];

await runRspack(rspackConfig);

printBanner(image, lines);
