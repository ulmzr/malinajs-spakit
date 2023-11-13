// es6 module

function router() {
   let len = arguments.length - 1;
   let callback = arguments[len];
   let routes = arguments[0];
   let e404 = `404 - PAGE NOT FOUND`;
   if (len === 2) e404 = arguments[1];
   let curr;

   // addEventListener("replacestate", route);
   addEventListener("popstate", route);
   addEventListener("pushstate", route);
   // addEventListener("click", route);

   document.body.addEventListener("click", (ev) => {
      let href = ev.target.getAttribute("href");

      if (!href) return;

      ev.preventDefault();
      route(href);
   });

   route();

   function route(x, replace) {
      if (curr === x) return;
      if (typeof x !== "string") x = location.pathname;
      // history[(x === curr || replace ? "replace" : "push") + "State"](null, null, x);
      history.pushState(x, null, x);

      let params = {};

      let query = x.includes("?");

      if (query) {
         query = x.replace(/.*\?/, "").replace(/\=\=/g, "=").replace(/\&\&/g, "&").split("&");
         query.map((q) => {
            params[q.split("=")[0]] = q.split("=")[1];
         });
      }

      let match = routes.filter((route) => {
         let path = route.path;
         let keys = path.match(/\/:\w+/g);
         let re = new RegExp(path.replace(keys?.join(""), "(.*)"));
         let matched = location.pathname.match(re);
         let isMatch = matched && matched[0] === matched.input;

         if (isMatch) {
            let values = matched[1]?.split("/").slice(1);

            if (values && keys) {
               keys = keys?.join("").split("/:").slice(1);
               for (let i = 0; i < values.length; i++) {
                  if (i < keys.length) params[keys[i]] = values[i];
                  else params[i] = values[i];
               }
            }
         }
         return isMatch;
      });

      match = match[match.length - 1];

      if (match) {
         callback({ page: match.page, params });
      } else {
         if (typeof e404 === "string") console.log(e404);
         else callback({ page: e404, params });
      }

      window.scrollTo(0, 0);

      curr = location.pathname;
   }

   return {
      route,
      listen() {
         route(location.pathname + location.search);
      },
      unlisten() {
         // removeEventListener("replacestate", route);
         removeEventListener("popstate", route);
         removeEventListener("pushstate", route);
         // removeEventListener("click", route);
         routes = [];
      },
   };
}

// module.exports = router;
export default router;
