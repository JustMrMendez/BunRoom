import { getErrorPage } from "./modules/ErrorHandling";
import { watch } from "fs";

const watcher = watch(import.meta.dir, { recursive: true });

// File server with simple router
const BASE_PATH = ".";
const server = Bun.serve({
	port: 3000,
	async fetch(req) {
		let url = new URL(req.url);
		let filePath = BASE_PATH + url.pathname;
		// console.log("Initial file path:", filePath);

		let routePath = "";
		try {
			// Serving static files from the public directory
			if (
				filePath.match(/\.(css|js|json|png|jpg|jpeg|gif|svg|ico|txt)$/)
			) {
				// make sure to serve the root style.css file too if the path

				filePath = "./public" + url.pathname;
				const file = Bun.file(filePath);
				// console.log("Returning public file:", filePath);
				return new Response(file);
			}

			// Determining the route for dynamic assets
			if (!filePath.endsWith("/")) {
				routePath = `./pages${url.pathname}`;
				filePath = `${routePath}/index.html`;
			} else if (filePath.endsWith("/")) {
				filePath = "./index.html";
			}

			const file = Bun.file(filePath);
			let fileContents = await file.text(); // Adding this line to read file contents

			const response = new Response(fileContents, {
				headers: {
					"Content-Type": "text/html",
				},
			});

			return response;
		} catch (e) {
			console.error("Error: ", e);

			try {
				const errorFilePath = await getErrorPage(
					routePath || `./pages${url.pathname}`
				);
				if (errorFilePath) {
					const errorFileContent = Bun.file(errorFilePath);

					return new Response(errorFileContent, {
						headers: { "content-type": "text/html" },
					});
				}
			} catch (errorFindingErrorPage) {
				console.error(
					"Failed to find a custom error page, falling back to default.",
					errorFindingErrorPage
				);
			}

			return new Response("File not found", { status: 404 });
		}
	},
});

watcher.on("change", (event, filename) => {
	console.log(`Detected ${event} in ${filename}`);
});
process.on("SIGINT", () => {
	// close watcher when Ctrl-C is pressed
	console.log("Closing watcher...");
	watcher.close();
	process.exit(0);
});
console.log("Server running at http://localhost:3000");
