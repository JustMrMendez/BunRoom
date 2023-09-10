import { createHash } from "node:crypto";

export async function compile(
	htmlContent: string,
	routePath?: string
): Promise<string> {
	let scriptContent = "";
	let transformedHTML = "";
	const rewriter = new HTMLRewriter();

	rewriter.on("script", {
		element(element) {
			element.remove();
		},
		text(text) {
			scriptContent += text.text;
		},
	});

	rewriter.on("head", {
		element(element) {
			if (routePath) {
				element.append(
					`<link rel="stylesheet" href="${routePath.replace(
						".",
						""
					)}/index.css">`,
					{ html: true }
				);
			}
		},
	});

	rewriter.on("body *", {
		text(text) {
			if (/{(.+?)}/.test(text.text)) {
				text.replace(
					text.text.replace(/{(.+?)}/g, (match, p1) => {
						const variableName = p1.trim();
						return `<script>document.write(window['${variableName}'] || '{${variableName}}')</script>`;
					}),
					{ html: true }
				);
			}
		},
	});

	return rewriter
		.transform(new Response(htmlContent))
		.text()
		.then(async (result) => {
			transformedHTML = result;

			const variableMatches = scriptContent.match(/let\s+(\w+)/g);
			const variableNames = variableMatches
				? variableMatches.map((match) => match.split(" ")[1])
				: [];

			let scriptToInject = `
                document.addEventListener('DOMContentLoaded', () => {
                    ${variableNames
						.map(
							(varName) => `
                        let ${varName} = '';
                        Object.defineProperty(window, '${varName}', {
                            get: () => ${varName},
                            set: (value) => {
                                ${varName} = value;
                            }
                        });
                    `
						)
						.join("")}
                });
            `;

			// Generate a hash of the script content to create a unique file name
			const hash = createHash("sha256")
				.update(scriptContent + scriptToInject)
				.digest("hex");
			const jsFileName = `script-${hash}.js`;
			try {
				await Bun.file(`public/js/${jsFileName}`).text();
			} catch {
				// If the file doesn't exist, write it to the dist folder
				await Bun.write(
					`public/js/${jsFileName}`,
					scriptContent + scriptToInject
				);
			}

			// Insert the script tag in the head section
			if (transformedHTML.includes("<head>")) {
				transformedHTML = transformedHTML.replace(
					"<head>",
					`<head><script src="/js/${jsFileName}" type="module"></script>`
				);
			} else {
				transformedHTML = transformedHTML.replace(
					'<html lang="en">',
					`<html lang="en"><head><script src="/js/${jsFileName}" type="module"></script></head>`
				);
			}

			if (!htmlContent.includes("<!DOCTYPE html>")) {
				transformedHTML =
					`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Not Found 404</title>
</head>
<body>
` +
					transformedHTML +
					`
</body>
</html>`;
			}

			return transformedHTML;
		});
}
