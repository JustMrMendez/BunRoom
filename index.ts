import { getErrorPage } from "./modules/ErrorHandling";
import { compile } from "./modules/Compiler";

// File server with simple router
const BASE_PATH = ".";
Bun.serve({
	port: 3000,
	async fetch(req) {
		let url = new URL(req.url);
		let filePath = BASE_PATH + url.pathname;
		console.log("Initial file path:", filePath);

		let routePath: string = "";
		try {
			// Serving static files from the public directory
			if (
				filePath.match(/\.(css|js|json|png|jpg|jpeg|gif|svg|ico|txt)$/)
			) {
                // include the 
				filePath = "./public" + url.pathname;
				const file = Bun.file(filePath);
				console.log("Returning public file:", filePath);
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

			// Compile the HTML contents using your compile function
			fileContents = await compile(fileContents);

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
					// compile the error file content
					const compiledErrorFileContent = await compile(
						await errorFileContent.text()
					);
					return new Response(compiledErrorFileContent, {
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

console.log(
	`Development server is running. Open http://localhost:3000/ in your browser.`
);
