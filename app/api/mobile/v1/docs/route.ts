// Renders Scalar API Reference UI for the mobile API.
// Scalar is loaded from its CDN bundle so we don't pull a new npm dep.

export const dynamic = 'force-static'

const HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>HR System Mobile API</title>
  <style>body { margin: 0 }</style>
</head>
<body>
  <script
    id="api-reference"
    data-url="/api/mobile/v1/openapi"
    data-configuration='{"theme":"default","layout":"modern","hideDownloadButton":false,"defaultHttpClient":{"targetKey":"shell","clientKey":"curl"}}'
  ></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`

export function GET() {
  return new Response(HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      // CSP allowing the Scalar CDN script + inline config. If the project later
      // tightens CSP globally, this is the value the docs page needs.
      'Content-Security-Policy':
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; " +
        "font-src https://fonts.gstatic.com data:; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self';",
    },
  })
}
