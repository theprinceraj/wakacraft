/** Browser-side JSON request to our own API. Throws the API's error message, so that callers can show it as is. */
export async function sendJson(url: string, method: string, body?: unknown) {
	const response = await fetch(url, {
		method,
		headers: { 'content-type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const json = await response.json().catch(() => ({}));
	if (!response.ok) throw new Error(json.error ?? 'Request failed');
	return json;
}
