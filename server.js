const fastify = require("fastify");
const esbuild = require("esbuild");
const { sassPlugin } = require("esbuild-sass-plugin");
const malina = require("malinajs");

const path = require("node:path");
const fs = require("fs");
const fsp = require("fs/promises");

const cwd = process.cwd();
const watch = process.argv.includes("-w");
const serve = process.argv.includes("-s");

const apiExist = fs.existsSync(path.join(cwd, "api"));
const env = fs.existsSync(path.join(cwd, "config.js")) ? require(path.join(cwd, "config.js")) : {};

const port = env.port || 8080;
const outdir = env.outdir || "public";
const esbuildConfig = env.esbuild || {};
const autoroute = env.autoroute;

const app = fastify({
   logger: {
      level: "warn",
   },
});

if (watch) {
   // for spa handler
   let indexFilepath = path.join(cwd, "public", "index.html");
   let indexFile;
   if (fs.existsSync(indexFilepath)) indexFile = fs.readFileSync(indexFilepath, "utf8");
   else indexFile = `<html><head><script defer src="/main.js"></script></head><body></body></html>`;
   indexFile = indexFile.replace(
      "</head>",
      `<script>let u="ws://localhost:1969";w=new WebSocket(u);w.onclose=_=>{let s=_=>{w=new WebSocket(u);w.onerror=_=>setTimeout(s,2e3);w.onopen=_=>location.reload()};s()};w.onmessage=_=>location.reload()</script></head>`
   );

   app.addHook("onRequest", async (request, reply) => {
      let url = request.url.replace(/[\#\?].*$/, "");
      url = url.endsWith("/") ? url + "index.html" : url;

      if (url.startsWith("/api")) return;

      let mime = mimeType(url);
      let isIndex = [url === "/", url.endsWith("index.html")].some((x) => x);
      let filename = path.join(cwd, outdir, url);
      let content = indexFile;
      let code = "200";

      if (!isIndex) {
         if (fs.existsSync(filename)) content = fs.readFileSync(filename);
         else code = 404;
      }

      if (watch) console.log(code == "200" ? code : 404, url);

      reply.type(mime).send(content);
   });
}

if (apiExist) {
   const autoload = require("@fastify/autoload");

   app.register(autoload, {
      dir: path.join(cwd, "api", "plugins"),
   });

   app.register(autoload, {
      dir: path.join(cwd, "api", "routes"),
      options: { prefix: "/api" },
   });
}

async function start() {
   if (!serve) buildApp();

   if (watch || serve) {
      const ip = require("ip").address();
      try {
         console.log(`Server run on http://${ip}:${port}`);
         await app.listen({ port });
         if (watch) watching();
      } catch (err) {
         app.log.error(err);
         process.exit(1);
      }
   }
}

async function buildApp() {
   const ctx = await esbuild.context({
      entryPoints: ["src/main.js"],
      bundle: true,
      minify: !watch,
      format: "iife",
      outdir,
      plugins: [malinaPlugin(), sassPlugin()],
      ...esbuildConfig,
   });
   ctx.watch();
   if (!watch) ctx.dispose();
}

function watching() {
   const chokidar = require("chokidar");
   // watch fastify source
   if (apiExist)
      chokidar
         .watch(path.join(cwd, "api"), {
            ignored: /(^|[\/\\])\../,
            persistent: true,
            cwd,
         })
         .on("change", function (path) {
            console.log(`\nChange on: ${path}.\nReload Server...!\n`);
            process.exit();
         });

   // Start websocket jika tdk dlm mode serve
   if (watch) {
      const { WebSocketServer } = require("ws");
      const wss = new WebSocketServer({ port: 1969 });
      wss.on("connection", function connection(ws) {
         chokidar
            .watch(outdir, {
               ignored: /(^|[\/\\])\../,
               persistent: true,
               cwd,
            })
            .on("change", (path) => {
               if (path.endsWith(".js")) ws.send("reload");
            });
      });
      // Watch cmp folder
      createRoutes();
      let ready = false;
      chokidar
         .watch(["src", "pages"], {
            ignored: /(^|[\/\\])\../,
            persistent: true,
            cwd,
         })
         .on("change", (pathname) => {
            if (!ready) return;
            createRoutes();
            pathname = pathname.replace(/\\/g, "/");
            if (!pathname.endsWith(".xht")) return;
            let dir = /.*(?<=\/)/.exec(pathname)[0];
            if (dir[dir.length - 1] === "/") dir = dir.slice(0, -1);
            let _files = getCmp(dir);
            let files = _files.filter((x) => {
               return !x.includes("/+");
            });
            let pages = _files.filter((x) => {
               return x.includes("/+");
            });
            files = files.join("");
            pages = pages.join("");
            if (dir.includes("pages")) {
               if (dir === "src/pages") files += 'export * from "../cmp";\n';
               else files += 'export * from "../";\n';
               if (files) fs.writeFileSync(path.join(dir, "index.js"), files);
               if (pages) fs.writeFileSync(path.join(dir, "pages.js"), pages);
            } else fs.writeFileSync(path.join(dir, "index.js"), files);
         });

      // Watch cmp folder
      chokidar
         .watch("src/pages", {
            ignored: /(^|[\/\\])\../,
            persistent: true,
            cwd,
         })
         .on("addDir", (dir) => {
            if (!ready) return;
            dir = dir.replace(/\\/g, "/");
            if (!dir.includes("/pages/") && dir === "src/pages") return;
            createRoutes();
            if (!fs.existsSync(path.join(dir, "pages.js"))) fs.writeFileSync(path.join(dir, "pages.js"), "");
            if (!fs.existsSync(path.join(dir, "pageIndex.xht"))) {
               let content = `<script>\n\timport * as pages from "./pages.js";\n\texport let params = {};\n\tconst page = pages[params.page];\n</script>\n\n{#if page}\n\t<component:page />\n{:else}\n{/if}\n `;
               fs.writeFileSync(path.join(dir, "pageIndex.xht"), content);
            }
         })
         .on("unlinkDir", (path) => {
            if (!ready) return;
            createRoutes();
         })
         .on("ready", (path) => {
            ready = true;
         });
   }
}

function malinaPlugin() {
   const cssModules = new Map();
   console.log("! Malina.js", malina.version);
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

function mimeType(url) {
   const map = {
      default: "text/html, 'UTF-8'",
      ".ico": "image/x-icon",
      ".html": "text/html",
      ".js": "text/javascript",
      ".json": "application/json",
      ".css": "text/css",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".webp": "image/webp",
      ".wav": "audio/wav",
      ".mp3": "audio/mpeg",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
   };
   return map[url.match(/\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/g)] || map.default;
}

function getCmp(dir, recursive = 0) {
   let res = getFiles(dir, recursive);
   res = res
      .filter((x) => x.endsWith(".xht") && !x.includes("pageIndex.xht"))
      .map((x) => {
         let cmp = /(\w+).xht/g.exec(x);
         x = `export { default as ${cmp[1]} } from ".${x.replace(dir, "")}";\n`;
         return x;
      });
   return res;
}

function getFiles(dir, recursive = 0) {
   let res = [];
   let list = fs.readdirSync(dir);
   list.forEach(function (file) {
      file = dir + "/" + file;
      let stat = fs.statSync(file);
      if (stat && stat.isDirectory() && recursive) res = res.concat(getFiles(file, recursive));
      else res.push(file);
   });
   res = res.map((x) => {
      return x.replaceAll("\\", "/");
   });
   return res;
}

function createRoutes() {
   if (!autoroute) return;
   let files = getFiles("src/pages", 1);
   files = files.filter((x) => {
      return x.includes("pageIndex.xht") || x.includes("Home.xht");
   });
   files = files.map((x) => {
      let cmp = x.replace("src/pages/", "").split("/").slice(0, -1);
      cmp = cmp.length ? cmp : ["Home"];
      cmp = cmp.join("/").replace(/.*(\/)/, "");
      cmp = cmp[0].toUpperCase() + cmp.slice(1);
      let content = [
         `import ${cmp} from "${x.replace("src/", "")}";`,
         cmp === "Home" ? "/" : x.replace("pageIndex.xht", ":page/:id"),
         cmp,
      ];
      return content;
   });

   let content = "";
   for (let i = 0; i < files.length; i++) {
      content += files[i][0] + "\n";
   }

   files = files.reverse();
   content += "export default [\n";
   for (let i = 0; i < files.length; i++) {
      content += '\t{ path: "' + files[i][1].replace("src/pages", "") + '", ' + "page: " + files[i][2] + " },\n";
   }
   content += "]";

   fs.writeFileSync("src/routes.js", content);
}

start();
