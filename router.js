export default function router(routes, callback, err) {
   if (!routes) return $;

   const regex = (path) => new RegExp("^" + path.replace(/\//g, "\\/").replace(/:\w+/g, "(.+)") + "$");

   const start = (uri) => {
      if (typeof uri === "string") history.pushState(null, null, uri);

      const params = () => {
         const mustSlice = location.pathname.split("/").length - 1;
         const values = location.pathname.split("/").slice(mustSlice);
         let obj = {};
         for (let i = 0; i < values.length; i++) {
            obj[`\$${i + 1}`] = values[i];
         }

         return obj;
      };

      const match = routes.filter((route) => {
         let path = regex(route.path);
         // let n = location.pathname.match(path);
         return location.pathname.match(path);
      })[0];

      if (match) {
         new Promise((resolve) => {
            match.page.then((m) =>
               resolve(
                  callback({
                     cmp: m.default,
                     params: params(),
                  })
               )
            );
         });
      } else if (typeof err === "object") {
         new Promise((resolve) => {
            err.then((m) =>
               resolve(
                  callback({
                     cmp: m.default,
                  })
               )
            );
         });
      } else if (typeof err === "function") {
         callback({
            cmp: err,
         });
      } else console.log("404 ☛ Page not found!");
      scroll(0, 0);
      return;
   };

   addEventListener("popstate", start);
   addEventListener("replacestate", start);
   addEventListener("pushstate", start);

   document.body.addEventListener("click", (ev) => {
      const isActive = ev.target.getAttribute("href");
      if (isActive) {
         if (isActive.includes("http")) return;
         ev.preventDefault();
         start(isActive);
      }
   });

   start(location.pathname);
}
