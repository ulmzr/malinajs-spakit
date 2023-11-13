const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");

const glob = require("fast-glob");

const {
   reloadScript,
   malinaConfig,
   jsConfig,
   indexOfComponents,
   indexOfHome,
   indexOfAbout,
   indexOfLayout,
   indexOfPage,
   indexOfRoutes,
   e404,
} = require("./template");

const { getTime, contentType, malinaPlugin } = require("./libs");

const cwd = process.cwd();
const outdir = "public";
const port = 8000;
const dev = process.argv.includes("-w");
const configName = "config.js";
const config = fs.existsSync(configName) ? fs.readFileSync(configName, "utf8") : {};
const esbuildConfig = config.esbuild || {};

// color
const WHITE = "\x1b[39m";
const RED = "\x1b[91m";
const GREEN = "\x1b[32m";

// index.html
const indexFilePath = path.join(cwd, outdir, "index.html");
const indexContent = fs.readFileSync(indexFilePath, "utf8");
// const index = indexContent.replace("</head>", reloadScript(port) + "</head>");

let ctx,
   ready = false;

const server = http.createServer(function (req, res) {
   const url = req.url.replace(/\?.*/, "");
   const ext = path.extname(url) || ".html";
   const filePath = path.join(outdir, url.endsWith("/") ? "index.html" : url);
   const index = indexContent.replace("</head>", reloadScript(port) + "</head>");

   let content = "",
      code = 200;

   if (fs.existsSync(filePath)) {
      content = ext === ".html" ? index : fs.readFileSync(filePath);
   } else {
      if (ext !== ".html") code = 404;
      content = index;
   }

   res.writeHead(code, { "Content-Type": contentType(ext) });
   res.end(content);

   console.log(GREEN + getTime(), code, url, code === 200 ? GREEN + "✔" : RED + "✘");
});

server.listen(port, () => {
   console.log(`Server is running on http://localhost:${port}`);

   initialize();
   compile();

   const { WebSocketServer } = require("ws");
   new WebSocketServer({ server }).on("connection", watch);
});

// Library

function initialize() {
   const dirs = ["pages", "components", "containers", "libs", "stores"];
   for (const dir of dirs) {
      // ensure all needed dir exists
      const dirPath = path.join(cwd, "src", dir);
      if (!fs.existsSync(dirPath)) {
         fs.mkdirSync(dirPath);
      }
   }
   //

   const files = [
      "components/index.js",
      "containers/index.js",
      "stores/index.js",
      "containers/E404.xht",
      "index.js",
      "pages/Home.xht",
      "pages/About.xht",
      "routes.js",
      "Layout.xht",
   ];

   // malina.config.js
   if (!fs.existsSync(path.join(cwd, "malina.config.js"))) {
      fs.writeFileSync(path.join(cwd, "malina.config.js"), malinaConfig);
   }

   // jsconfig.json
   if (!fs.existsSync(path.join(cwd, "jsconfig.json"))) {
      fs.writeFileSync(path.join(cwd, "jsconfig.json"), jsConfig);
   }

   for (const file of files) {
      // ensure all needed file exists
      const filePath = path.join(cwd, "src", file);
      if (!fs.existsSync(filePath)) {
         if (file === "index.js") fs.writeFileSync(filePath, indexOfComponents);
         else if (file === "pages/Home.xht") fs.writeFileSync(filePath, indexOfHome);
         else if (file === "pages/About.xht") fs.writeFileSync(filePath, indexOfAbout);
         else if (file === "routes.js") fs.writeFileSync(filePath, indexOfRoutes);
         else if (file === "Layout.xht") fs.writeFileSync(filePath, indexOfLayout);
         else if (file === "containers/E404.xht") fs.writeFileSync(filePath, e404);
         else fs.writeFileSync(filePath, "");
      }
   }
}

async function compile() {
   const esbuild = require("esbuild");
   const { sassPlugin } = require("esbuild-sass-plugin");

   ctx = await esbuild.context({
      entryPoints: ["src/main.js"],
      bundle: true,
      minify: !dev,
      outdir,
      plugins: [malinaPlugin(), sassPlugin()],
      ...esbuildConfig,
      define: {
         process: JSON.stringify({
            env: { env: "aa" },
            dev,
         }),
      },
   });

   try {
      await ctx.rebuild();
   } catch (err) {
      console.log(err);
   }
}

function watch(ws) {
   const chokidar = require("chokidar");
   const publicChange = () => {
      ws.send("reload");
   };
   // console.log(ready);
   chokidar
      .watch("src", { ignored: /(^|[\/\\])\../, persistent: true })
      .on("change", sourceChange)
      .on("add", sourceAdd)
      .on("unlink", sourceUnlink)
      .on("addDir", sourceAddDir)
      .on("unlinkDir", sourceUnlinkDir)
      .on("ready", () => (ready = true));
   chokidar.watch(outdir, { ignored: /(^|[\/\\])\../, persistent: true }).on("change", publicChange);
   // console.log(ready);
}

async function rewriteRoutes(pathname) {
   const entries = glob.sync("src/pages/**/*.xht").reverse();
   let content = "";
   let routes = "\nexport default [\n";
   entries.map((entry) => {
      const testEntry = entry.split("/");
      if (testEntry.length === 3) {
         const page = upperCaseFirst(testEntry[2].replace(".xht", ""));
         const path = page === "Home" ? "" : page.toLowerCase();
         content += `import ${page} from "${entry.replace("src/pages", "./pages")}";\n`;
         routes += `\t{ path: "/${path}", page: ${page} },\n`;
      } else if (entry.endsWith("index.xht")) {
         const path = testEntry[2].toLowerCase();
         content += `import ${upperCaseFirst(path)} from "${entry.replace("src/pages", "./pages")}";\n`;
         routes += `\t{ path: "/${path}/:0", page: ${upperCaseFirst(path)} },\n`;
      }
   });
   routes += "]";
   fs.writeFileSync("src/routes.js", content + routes);
   await ctx.rebuild();
}

async function reIndex(pathname) {
   // create index of components
   if (pathname.startsWith("src/components")) {
      const entries = glob.sync("src/components/**/*.xht");
      let content = "";
      entries.map((entry) => {
         const filepath = entry.replace("src/components", ".");
         const _cmpName = path.basename(filepath).replace(".xht", "");
         const cmpName = _cmpName[0].toUpperCase() + _cmpName.slice(1);
         content += `export { default as ${cmpName} } from "${filepath}";\n`;
      });
      fs.writeFileSync("src/components/index.js", content);
   } else if (pathname.startsWith("src/containers")) {
      // create index of containers
      const entries = glob.sync("src/containers/**/*.xht");
      let content = "";
      entries.map((entry) => {
         const filepath = entry.replace("src/containers", ".");
         const cmp = upperCaseFirst(path.basename(filepath).replace(".xht", ""));
         content += `export { default as ${cmp} } from "${filepath}";\n`;
      });
      fs.writeFileSync("src/containers/index.js", content);
   } else if (pathname.startsWith("src/pages")) {
      // create index of pages
      const dir = pathname.split("/").slice(0, -1).join("/");
      let content = "";
      if (dir !== "src/pages") {
         const entries = glob.sync(dir + "/*.xht");
         entries.map((entry) => {
            if (!entry.endsWith("index.xht")) {
               const basename = path.basename(entry);
               const page = basename.replace(".xht", "");
               content += `export { default as ${page} } from "./${basename}";\n`;
            }
         });
         fs.writeFileSync(dir + "/index.js", content);
      }
   }
   ready = true;
   await ctx.rebuild();
}

async function sourceChange(pathname) {
   if (!ready) return;
   await ctx.rebuild();
}

async function sourceAdd(pathname) {
   if (!ready) return;
   reIndex(pathname);
}

async function sourceUnlink(pathname) {
   if (!ready) return;
   pathname = pathname.replaceAll("\\", "/");
   if (pathname.startsWith("src/pages")) {
      reIndex(pathname);
      rewriteRoutes(pathname);
   } else {
      reIndex(pathname);
   }
}

async function sourceAddDir(pathname) {
   if (!ready) return;
   ready = false;
   pathname = pathname.replaceAll("\\", "/");
   if (pathname.startsWith("src/pages") && pathname !== "src/pages") {
      const checkDir = pathname.split("/").length;
      if (checkDir > 3) {
         try {
            fs.rmdirSync(pathname);
         } catch (e) {}
         fs.writeFileSync(pathname + ".xht", "");
         return reIndex(pathname + ".xht");
      }

      if (!fs.existsSync(path.join(pathname, "index.xht"))) {
         const title = upperCaseFirst(pathname.split("/")[2]);
         fs.writeFileSync(path.join(pathname, "index.xht"), indexOfPage(title));
         fs.writeFileSync(path.join(pathname, "index.js"), "");
      }
      rewriteRoutes(pathname);
   }
}

async function sourceUnlinkDir(pathname) {
   if (!ready) return;
   ready = false;
   pathname = pathname.replaceAll("\\", "/");
   if (pathname.startsWith("src/pages")) {
      rewriteRoutes(pathname);
   } else {
      reIndex(pathname);
   }
}

function upperCaseFirst(str) {
   return str[0].toUpperCase() + str.slice(1);
}
