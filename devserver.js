const malina = require("malinajs");
const http = require("http");

const esbuild = require("esbuild");
const { sassPlugin } = require("esbuild-sass-plugin");

const chokidar = require("chokidar");
const ws = require("ws");

const fsp = require("fs/promises");
const fs = require("fs");
const path = require("path");

const cwd = process.cwd();

const esbuildConfigPath = path.join(cwd, "esbuild.config.js");
const esbuildConfig = fs.existsSync(esbuildConfigPath) ? require(esbuildConfigPath) : {};
const serverConfigPath = path.join(cwd, "server.config.js");
const serverConfig = fs.existsSync(serverConfigPath) ? require(serverConfigPath) : {};

const dev = process.argv.includes("-w");
const pre = process.argv.includes("-p");

const port = serverConfig.port || 3000;
const outdir = serverConfig.outdir || "public";

const index = indexHTML();

build();
createServer();

function createServer() {
   if (!dev && !pre) return;

   const server = http.createServer((req, res) => {
      let content;
      let code = "200";
      let url = req.url.replace(/(.*\/|\?.*)$/g, "") || "/";
      let arr = url.split(".");

      if (arr[1]) {
         let filename = path.join(cwd, outdir, url);
         if (fs.existsSync(filename)) content = fs.readFileSync(filename);
         else code = "404";
         res.writeHead(code, { "Content-Type": mime(arr[1]) });
      } else {
         res.writeHead(code, { "Content-Type": "text/html" });
         content = index;
      }
      if (dev) console.log(code == "200" ? code : 400, url);
      res.end(content);
   });

   server.listen(port);
   console.log(`Listening on http://localhost${port === 80 ? `` : `:${port}`}`);

   if (!dev) return;

   const wss = new ws.WebSocketServer({ server });
   wss.on("connection", function connection(ws) {
      let timer;

      const startTimer = () => {
         timer = setTimeout(() => {
            ws.send("reload");
         }, 500);
      };

      const reload = () => {
         clearTimeout(timer);
         startTimer();
      };

      ws.on("error", console.error);

      chokidar
         .watch(outdir, {
            ignored: /(^|[\/\\])\../,
            persistent: true,
            cwd,
         })
         .on("change", () => reload());
   });
}

async function build() {
   const ctx = await esbuild.context({
      entryPoints: [path.join(cwd, "src/main.js")],
      bundle: true,
      minify: false,
      format: "iife",
      outdir,
      plugins: [malinaPlugin(), sassPlugin()],
      ...esbuildConfig,
   });
   ctx.watch();
   if (!dev) ctx.dispose();
}

function malinaPlugin(options = {}) {
   const cssModules = new Map();

   if (options.displayVersion !== false) console.log("! Malina.js", malina.version);

   return {
      name: "malina-plugin",
      setup(build) {
         build.onResolve({ filter: /^malinajs$/ }, async (args) => {
            const runtime = await build.resolve("malinajs/runtime.js", {
               resolveDir: args.resolveDir,
            });
            return {
               path: runtime.path,
               sideEffects: false,
            };
         });

         build.onResolve({ filter: /\.(xht|ma|html)$/ }, (arg) => {
            return {
               path: path.resolve(arg.resolveDir, arg.path),
               sideEffects: false,
            };
         });

         build.onLoad({ filter: /\.(xht|ma|html)$/ }, async (args) => {
            let source = await fsp.readFile(args.path, "utf8");

            let ctx = await malina.compile(source, {
               path: args.path,
               name: args.path.match(/([^/\\]+)\.\w+$/)[1],
               ...options,
            });

            let code = ctx.result;

            if (ctx.css.result) {
               const cssPath = args.path.replace(/\.\w+$/, ".malina.css").replace(/\\/g, "/");
               cssModules.set(cssPath, ctx.css.result);
               code += `\nimport "${cssPath}";`;
            }

            return { contents: code };
         });

         build.onResolve({ filter: /\.malina\.css$/ }, ({ path }) => {
            return { path, namespace: "malinacss" };
         });

         build.onLoad({ filter: /\.malina\.css$/, namespace: "malinacss" }, ({ path }) => {
            const css = cssModules.get(path);
            return css ? { contents: css, loader: "css" } : null;
         });
      },
   };
}

function mime(ext) {
   const map = {
      bin: "application/octet-stream",
      pdf: "application/pdf",
      json: "application/json",
      webmanifest: "application/json",
      html: "text/html, charset=UTF-8",
      js: "text/javascript",
      css: "text/css",
      ico: "image/x-icon",
      png: "image/png",
      jpg: "image/jpeg",
      webp: "image/webp",
      svg: "image/svg+xml",
      wav: "audio/wav",
      mp3: "audio/mpeg",
      mp4: "video/mp4",
      webm: "video/webm",
   };
   return map[ext] || map.bin;
}

function indexHTML() {
   const readIndex = fs.readFileSync(outdir + "/index.html", "utf8");
   if (!dev) return readIndex;
   else return readIndex.replace(`</head>`, `<script>${reloadScript()}</script></head>`);
}

function reloadScript() {
   return `let socketUrl="ws://localhost:${port}";
let wss=new WebSocket(socketUrl);
wss.onclose = () => {
   let start = () => {
      wss = new WebSocket(socketUrl);
      wss.onerror = () => setTimeout(start, 2e3);
      wss.onopen = () => location.reload();
   };
   start();
};
wss.onmessage = e => location.reload();
`;
}
