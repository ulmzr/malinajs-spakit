function router() {
   let len = arguments.length - 1;
   let callback = arguments[len];
   let routes = arguments[0];
   let e404 = `404 - PAGE NOT FOUND`;
   let curr;
   if (len === 2) e404 = arguments[1];

   addEventListener("popstate", route);
   addEventListener("pushstate", route);

   document.body.addEventListener("click", (ev) => {
      let href = ev.target.getAttribute("href");
      if (!href) return;
      ev.preventDefault();
      route(href);
   });

   route();

   function route(x, replace) {
      if (curr == x) return;
      if (typeof x === "string") history[replace ? "replace" : "push" + "State"](x, null, x);
      let params = {};
      let match = routes.filter((route) => {
         let path = route.path;
         let keys = path.match(/\/:\w+/g);
         let re = new RegExp(path.replace(keys?.join(""), "(.*)"));
         let matched = location.pathname.match(re);
         let isMatch = matched && matched[0] === matched.input;
         if (isMatch) {
            curr = location.pathname;
            let values = matched[1]?.split("/").slice(1);
            if (values && keys) {
               keys = keys?.join("").split("/:").slice(1);
               for (let i = 0; i < values.length; i++) {
                  if (i < keys.length) params[keys[i]] = values[i];
                  else params[keys[i]] = values[i];
               }
            }
         }
         return isMatch;
      });

      match = match[match.length - 1];

      if (match) {
         callback(match.page, params);
      } else {
         if (typeof e404 === "string") console.log(e404);
         else callback(e404, params);
      }
   }

   return {
      route,
      listen() {
         route(location.pathname);
      },
      unlisten() {
         removeEventListener("popstate", route);
         removeEventListener("pushstate", route);
         routes = [];
      },
   };
}

export default router;
