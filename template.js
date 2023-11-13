function reloadScript(port) {
   return `<script>
let socketUrl="ws://localhost:${port}";
let wss = new WebSocket(socketUrl);
wss.onclose = () => {
   let start = () => {
      wss = new WebSocket(socketUrl);
      wss.onerror = () => setTimeout(start, 3000);
      wss.onopen = () => location.reload();
   };
   start();
};
wss.onmessage = async (ev) => {
   if (ev.data === "reload") {
      location.reload();
   }
}
</script>`;
}

const malinaConfig = `const sassPlugin = require("malinajs/plugins/sass.js");\n
module.exports = function (option, filename) {
   option.css = false;
   option.hideLabel = true;
   option.immutable = true;
   option.plugins = [sassPlugin()];
   option.autoimport = (name) => \`import {\${name}} from "@cmp";\`;
   return option;
};`;

const jsConfig = `{
   "compilerOptions": {
      "baseUrl": ".",
      "paths": {
         "@cmp": ["src"],
         "@store": ["src/stores/index.js"],
         "@menu": ["src/stores/menu.js"]
      }
   }
}`;

const indexOfComponents = `export * from "./components";
export * from "./containers";
export * from "./stores";
`;

const indexOfRoutes = `import Home from "./pages/Home.xht";
import About from "./pages/About.xht";\n
export default [
	{ path: "/", page: Home },
	{ path: "/about", page: About },
]`;

const indexOfHome = `<script>
</script>\n
<article>
   <hgroup>
      <h1>Home</h1>
      <h3 mute>About home</h3>
   </hgroup>
   <hr>
   <p>...contents here</p>
</article>
`;

const indexOfAbout = `<script>
</script>\n
<article>
   <hgroup>
      <h1>About</h1>
      <h3 mute>Application and developers</h3>
   </hgroup>
   <hr>
   <p>...nothing much here</p>
</article>
`;

const e404 = `<script>
</script>\n
<article>
   <hgroup>
      <h1>404</h1>
      <h3>Page not found</h3>
   </hgroup>
   <hr>
</article>
`;

const indexOfLayout = `<script>
   import Router from "../../router";
   import routes from "./routes";
   import { E404 } from "@cmp";\n
   let cmp, params;\n
   const router = Router(routes, E404, (route) => {
      cmp = route.page;
      params = route.params;
   });\n
   $onMount(router.listen);
   $onDestroy(router.unlisten);
</script>\n
<aside>
   <header><h4>Header</h4></header>
   <main>
      <a href="/">Home</a>
      <a href="/about">About</a>
   </main>
   <footer><h4>Footer</h4></footer>
</aside>\n
{#if cmp}
   <main>
      <component:cmp {params} />
   </main>
{/if}
`;

function indexOfPage(title) {
   return `<script>
   import * as pages from './index.js';
   export let params;\n
   let cmp;\n 
   $:params, cmp = pages[params["0"]] || null;
</script>

{#if cmp}
   <component:cmp {params} />
{:elif Object.keys(params).length === 0 || typeof params === 'object' }
   <article>
      <hgroup>
         <h1>${title}</h1>
         <h3 mute>About ${title}</h3>
      </hgroup>
      <hr>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Fugit impedit, magnam voluptatum excepturi earum unde adipisci nihil minus, autem voluptate quidem alias quos accusantium maxime dolores laboriosam. Sapiente, sunt veniam.</p>
   </article>
{:else}
   <E404/>
{/if}`;
}

module.exports = {
   reloadScript,
   malinaConfig,
   jsConfig,
   indexOfComponents,
   indexOfRoutes,
   indexOfHome,
   indexOfAbout,
   indexOfLayout,
   indexOfPage,
   e404,
};
