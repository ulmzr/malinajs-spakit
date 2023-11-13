const malina = require("malinajs");
const path = require("node:path");
// const fs = require("node:fs");
const fsp = require("node:fs/promises");

function getTime() {
   return `[${new Date().toLocaleTimeString().replaceAll(".", ":")}]`;
}

function contentType(ext) {
   const contentType = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "text/javascript",
      ".json": "application/json",
      ".xml": "application/xml",
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
      ".webp": "image/webp",
      ".txt": "text/plain",
      ".md": "text/markdown",
      ".zip": "application/zip",
      ".tar": "application/x-tar",
      ".gz": "application/gzip",
      ".mp3": "audio/mpeg",
      ".ogg": "audio/ogg",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".woff": "application/font-woff",
      ".woff2": "application/font-woff2",
      ".eot": "application/vnd.ms-fontobject",
      ".ttf": "font/ttf",
      ".otf": "font/otf",
      ".csv": "text/csv",
      ".xls": "application/vnd.ms-excel",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".ogg": "audio/ogg",
      ".weba": "audio/webm",
      ".webm": "video/webm",
      ".avi": "video/avi",
      ".mpg": "video/mpeg",
      ".mpeg": "video/mpeg",
      ".wav": "audio/wav",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
   };
   return contentType[ext] || "application/octet-stream";
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
            let source, ctx, code;
            try {
               source = await fsp.readFile(args.path, "utf8");
               ctx = await malina.compile(source, {
                  path: args.path,
                  name: args.path.match(/([^/\\]+)\.\w+$/)[1],
               });
               code = ctx.result;
               if (ctx.css.result) {
                  const cssPath = args.path.replace(/\.\w+$/, ".malina.css").replace(/\\/g, "/");
                  cssModules.set(cssPath, ctx.css.result);
                  code += `\nimport "${cssPath}";`;
               }
            } catch (e) {
               if (e.details) console.log(e.details);
               // throw e;
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

module.exports = { getTime, contentType, malinaPlugin };
