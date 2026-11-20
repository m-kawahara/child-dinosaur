// リアルなティラノサウルスの絵（実験）を、ブラウザで描くための小さなサーバー。
// node experiments/realistic-trex/serve.mjs → http://localhost:5178/ を開くと描きはじめ、
// 描き終わると out/realistic-trex*.png に保存する（動画には使わない）。
// / は最初の版（index.html）、/v2.html は霧の森でほえる版
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "..", "out");
const PORT = 5178;

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  try {
    const page = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    if (req.method === "GET" && /^[a-z0-9-]+\.html$/i.test(page)) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(await readFile(join(here, page)));
      return;
    }
    if (req.method === "POST" && url.pathname === "/save") {
      const name = (url.searchParams.get("name") ?? "realistic-trex").replace(/[^a-z0-9-]/gi, "");
      const chunks = [];
      for await (const c of req) chunks.push(c);
      await mkdir(outDir, { recursive: true });
      const file = join(outDir, `${name}.png`);
      await writeFile(file, Buffer.concat(chunks));
      console.log(`saved ${file}`);
      res.writeHead(200).end("ok");
      return;
    }
    res.writeHead(404).end("not found");
  } catch (e) {
    console.error(e);
    res.writeHead(500).end(String(e));
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}/`));
