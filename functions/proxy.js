export function onRequest(context) {
  const request = context.request;
  return fetchProxy(request);
}

const blocked_region = [];

async function fetchProxy(request) {
  const region = (request.headers.get("cf-ipcountry") ?? "").toUpperCase();

  let response = null;
  let rurl = new URL(request.url);

  const urlParam = rurl.searchParams.get("url");

  if (!urlParam) {
    return new Response("Access denied", {
      status: 403,
    });
  }

  if (blocked_region.includes(region)) {
    response = new Response("Access denied", {
      status: 403,
    });
  } else {
    let method = request.method;
    let requestHeaders = new Headers(request.headers);

    let originalResponse = await fetch(urlParam, {
      method: method,
      headers: requestHeaders,
      body: request.body,
    });

    const responseHeaders = originalResponse.headers;
    const status = originalResponse.status;
    let newResponseHeaders = new Headers(responseHeaders);

    newResponseHeaders.set(
      "access-control-allow-origin",
      "https://risuai.xyz/"
    );
    newResponseHeaders.set("access-control-allow-credentials", "true");
    newResponseHeaders.delete("content-security-policy");
    newResponseHeaders.delete("content-security-policy-report-only");
    newResponseHeaders.delete("clear-site-data");

    const originalBody = originalResponse.body;

    response = new Response(originalBody, {
      status,
      headers: newResponseHeaders,
    });
  }
  return response;
}
