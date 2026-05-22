// Next.js 16 instrumentation hook. Called once when the server starts.
// Docs: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md
//
// Node-specific bootstrap lives in ./instrumentation.node.ts and is loaded
// dynamically so the Edge runtime bundle stays free of Node APIs.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const mod = await import('./instrumentation.node')
  await mod.registerNode()
}
