// Local preview of dist/ (mirrors Cloudflare Pages' directory-index behaviour).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const root = join(import.meta.dirname, "..", "dist");
const types = { ".html": "text/html; charset=utf-8" };
createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.endsWith("/")) path += "index.html";
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { "Content-Type": types[extname(path)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404, { "Content-Type": types[".html"] }).end(await readFile(join(root, "404.html")));
  }
}).listen(8080, () => console.log("http://localhost:8080"));
