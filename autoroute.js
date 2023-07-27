const chokidar = require("chokidar");

const path = require("path");
const fsp = require("fs/promises");
const fs = require("fs");

const cwd = process.cwd();

const dirs = ["src/modules", "src/components", "src/modules", "src/libs", "src/store"];

const capitalizeFirstLetter = (string) => string.charAt(0).toUpperCase() + string.slice(1);
const getFilename = (pathname) => pathname.split("/").pop().replace(".html", "");
const isUppercase = (word) => /^\p{Lu}/u.test(word);

let ready;

// autoroute

regRoute();

chokidar
   .watch(["src"], {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      cwd,
   })
   .on("ready", () => (ready = true))
   .on("add", (filepath) => {
      if (!ready) return;
      if (!filepath.includes("routes")) return;
      onAddFile(filepath);
   })
   .on("unlink", (filepath) => {
      if (!ready) return;
      onRemoveFile(filepath);
   })
   .on("addDir", (filepath) => {
      if (!ready) return;
      onAddDir(filepath);
   })
   .on("unlinkDir", (filepath) => {
      if (!ready) return;
      onRemoveDir(filepath);
   });

function regRoute() {
   dirs.forEach((dir) => {
      dir = path.join(cwd, dir);
      if (!fs.existsSync(dir)) {
         fs.mkdirSync(dir);
      }
   });

   const getFileList = async (dirName) => {
      let files = [];
      let items = await fsp.readdir(dirName, { withFileTypes: true });

      for (const item of items) {
         if (item.isDirectory()) {
            files = [...files, ...(await getFileList(`${dirName}/${item.name}`))];
         } else {
            if (item.name.includes("Index.xht") || isUppercase(item.name)) {
               files.push(`${dirName}/${item.name}`);
            }
         }
      }

      return files;
   };

   // check Index component
   let cmpIndexPath = "src/components/Index.xht";
   if (!fs.existsSync(cmpIndexPath)) {
      fs.writeFileSync(cmpIndexPath, cmpIndex());
   }

   // check Index component
   let cmpErrorPath = "src/modules/Error.xht";
   if (!fs.existsSync(cmpErrorPath)) {
      fs.writeFileSync(cmpErrorPath, cmpError());
   }

   // check routesIndex
   let routesIndexPath = "src/routes/routesIndex.xht";
   if (!fs.existsSync(routesIndexPath)) {
      fs.writeFileSync(routesIndexPath, pageTpl());
   }

   getFileList("src/routes").then((files) => {
      let tmp = "export default [";

      files.forEach((file) => {
         file = file.replace("src/routes/", "");
         let rou = file.split("/").slice(0, -1).join("/");
         tmp += `\n\t{`;

         if (rou === "") {
            let filename = getFilename(file).replace(".xht", "");
            if (isUppercase(filename)) {
               tmp += `\n\t\tpath: "/${filename.toLowerCase()}",`;
            } else {
               tmp += `\n\t\tpath: "/",`;
            }
         } else {
            tmp += `\n\t\tpath: "/${rou}/:params",`;
         }

         tmp += `\n\t\tpage: import("./routes/${file}"),`;
         tmp += `\n\t},`;
      });

      tmp += "\n]";

      fs.writeFileSync("src/routes.js", tmp);
   });
}

function onAddFile(filepath) {
   filepath = filepath.replaceAll("\\", "/");

   if (!filepath.includes(".xht")) return;

   let arrFilepath = filepath.split("/");

   if (arrFilepath.length === 3) {
      if (arrFilepath[2].charAt(0) !== arrFilepath[2].charAt(0).toUpperCase()) {
         return;
      }
   } else {
      if (!filepath.includes("+")) return;
   }

   let filename = getFilename(filepath).replace(".xht", "").replace("+", "");
   let title = capitalizeFirstLetter(filename);
   let indexFilename = arrFilepath.slice(0, -1).pop() + "Index.xht";

   fs.writeFileSync(filepath, pageTpl(title));

   reIndex(filepath);

   if (!fs.existsSync(path)) {
      let dir = arrFilepath.slice(0, -1).join("/");
      fs.writeFileSync(dir + `/${indexFilename}`, pageIndex());
   }

   regRoute();
}

function onAddDir(filepath) {
   if (!filepath.includes("routes")) return;
   regRoute();
}

function onRemoveFile(filepath) {
   if (!filepath.includes("routes")) return;

   try {
      reIndex(filepath);
   } catch (error) {
      //console.log(error);
   }
}

function onRemoveDir(filepath) {
   if (!filepath.includes("routes")) return;
   regRoute();
}

function reIndex(filepath) {
   if (filepath.split("/") === 3) return;
   filepath = filepath.replaceAll("\\", "/");

   let arrFilepath = filepath.split("/");
   let dir = arrFilepath.slice(0, -1).join("/");
   let files = fs.readdirSync(dir);
   let content = "";

   files.forEach((file) => {
      if (!file.includes(".xht")) return;
      if (!file.includes("+")) return;
      if (file.includes("index")) return;
      let page = file.replace("+", "").replace(".xht", "");
      content += `export {default as ${page}} from "./${file}";\n`;
   });

   fs.writeFileSync(dir + "/index.js", content);
}

// templates

function pageTpl(title = "Home") {
   return `<script>
   let title = '${title}';
</script>

<article>
   <h1>{title}</h1>
   <h3>Short description of {title.toLowerCase()}</h3>
   <hr>
   <p>Continue here...!</p>
</article>   
`;
}

function pageIndex() {
   return `<script>
   import * as pages from './';
   export let params;
</script>

<Index {params} {pages}/>
`;
}

function cmpIndex() {
   return `<script>
   export let params;
   export let pages;
</script>

{#if params.$1 in pages}
   <component:pages[params.$1]/>
{:else}
   <Error/>
{/if}      
`;
}

function cmpError() {
   return `<article>
      <h1>404</h1>
      <h6>
         <small>PAGE NOT FOUND</small>
      </h6>
   </article>
   
   <style>
      article {
         text-align: center;
      }
   
      h1 {
         font-size: 4em;
         font-weight: 200;
         color: orangered;
      }
   
      h6 {
         font-weight: 800;
         color: #c5c5c5;
         letter-spacing: 4px;
      }
   
   </style>      
`;
}
