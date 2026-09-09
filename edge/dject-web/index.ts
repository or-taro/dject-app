const EXPECTED_WEB_KEY_SHA256 = "c14ead347d243752aeb50e61c3e9f547e70af64144bcc4074122ce91682714f3";
const DJECT_OWNER_ID = "30660b8d-8223-48a3-acbb-5452835fc7e9";
const OPS = new Set([
  "novels.list","novels.create","novels.get","novels.save","novels.delete",
  "chapters.create","chapters.get","chapters.save",
  "jobs.create","jobs.current","jobs.get","results.apply"
]);
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-dject-web-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};
async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function equalHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {status,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, {status:204,headers:cors});
  if (req.method !== "POST") return reply(405, {error:"method_not_allowed"});
  const webKey = req.headers.get("x-dject-web-key") || "";
  if (!webKey || !equalHex(await sha256Hex(webKey), EXPECTED_WEB_KEY_SHA256)) return reply(401, {error:"unauthorized"});
  const length = Number(req.headers.get("content-length") || 0);
  if (length > 650000) return reply(413, {error:"payload_too_large"});
  let input: any;
  try { input = await req.json(); } catch { return reply(400, {error:"invalid_json"}); }
  const op = typeof input?.op === "string" ? input.op : "";
  if (!OPS.has(op)) return reply(400, {error:"invalid_operation"});
  const data = input?.data && typeof input.data === "object" && !Array.isArray(input.data) ? input.data : {};
  const url = Deno.env.get("SUPABASE_URL") || "";
  let key = "";
  try { key = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || ""; } catch {}
  if (!key) key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !key) return reply(503, {error:"gateway_not_configured"});
  const headers: Record<string,string> = {apikey:key,"Content-Type":"application/json"};
  if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
  let upstream: Response;
  try {
    upstream = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/dject_dispatch`, {method:"POST",headers,body:JSON.stringify({p_owner:DJECT_OWNER_ID,p_op:op,p_data:data})});
  } catch { return reply(503, {error:"upstream_unavailable"}); }
  const text = await upstream.text();
  return new Response(text || "null", {status:upstream.status,headers:{...cors,"Content-Type":upstream.headers.get("content-type") || "application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
});
