// The legacy standalone UI has been replaced by the canonical app.
Deno.serve(() => new Response(null, {
 status: 302,
 headers: {
  Location: "https://narubetsupadon-debug.github.io/my-finance/",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
 }
}));
