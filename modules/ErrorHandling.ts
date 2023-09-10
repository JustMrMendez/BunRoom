export async function getErrorPage(path: string): Promise<string | null> {
	if (path === "/") return null;
	const errorFilePath = `${path}/error.html`;
	try {
		await Bun.file(`${errorFilePath}`).text();
		return errorFilePath;
	} catch {
		return getErrorPage(path.substring(0, path.lastIndexOf("/")));
	}
}
