import { createHash } from "node:crypto";

export async function compile(html: string, routePath?: string) {
	const transformedHtml = await transformHtml(html);
	const htmlContent = await transformedHtml.text();
	const scriptContent = extractScripts(htmlContent);

	const jsFileName = await generateScript(scriptContent);

	const compiledHtml = injectScripts(htmlContent, jsFileName);

	return injectStyles(compiledHtml, routePath);
}

// transformHtml
function transformHtml(html: string) {
	const rewriter = new HTMLRewriter();

    rewriter.on("*", {
        text(text) {
          if (/{(.+?)}/.test(text.text)) {
            text.replace(
              text.text.replace(/{(.+?)}/g, (match, p1) => {
                return `<span class="data-variable" data-var-name="${p1}">{{${p1}}}</span>`;
              }),
              { html: true }
            );
          }
        },
      });

	return rewriter.transform(new Response(html));
}

// extractScripts
function extractScripts(html: string) {
	const scriptContent =
		html
			.match(/<script>([\s\S]*?)<\/script>/g)
			?.map((tag) => tag.replace(/<\/?script>/g, ""))
			?.join("\n") || "";

	return scriptContent;
}

// generateScript
async function generateScript(scriptContent: string) {
    const hash = createHash("sha256").update(scriptContent).digest("hex");
    const jsFileName = `script-${hash}.js`;
  
    const scriptWithUpdater = `
      ${scriptContent}
      
      function updateVariable(varName, newValue) {
        document.querySelectorAll('.data-variable[data-var-name="' + varName + '"]').forEach(element => {
          element.textContent = newValue;
        });
      }
  
      document.addEventListener('DOMContentLoaded', (event) => {
        // Initial update of all variables
        updateVariable('path', path);
  
        // Add event listeners for variable updates
        document.body.addEventListener('updateVariable', (event) => {
          updateVariable(event.detail.varName, event.detail.newValue);
        });
      });
    `;
  
    await Bun.write(`public/js/${jsFileName}`, scriptWithUpdater);
  
    return jsFileName;
  }

// injectScripts
function injectScripts(html: string, jsFileName: string) {
	if (html.includes("<head>")) {
		return html.replace(
			"<head>",
			`<head><script src="/js/${jsFileName}"></script>`
		);
	} else {
		return html.replace(
			"<html>",
			`<html><head><script src="/js/${jsFileName}"></script></head>`
		);
	}
}

// injectStyles
function injectStyles(html: string, routePath?: string) {
	if (routePath) {
		return html.replace(
			"<head>",
			`<head><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="${routePath}/style.css">`
		);
	} else {
		return html.replace(
			"<head>",
			'<head><link rel="stylesheet" href="/style.css">'
		);
	}
}
