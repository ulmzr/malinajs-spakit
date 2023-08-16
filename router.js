export default (routes = [], e404) => {
   let cbs = [];
   let re = (p) => new RegExp("^" + p.replace(/:\w+/g, "(.+)"));
   let curr;

   function route(x = location.pathname) {
      if (curr === x) return;
      if (typeof x !== "string") x = location.pathname;
      else history.pushState(x, null, x);

      let result = [];
      for (let r = 0; r < routes.length; r++) {
         let route = routes[r];
         let matched,
            keys,
            values = [],
            params = {},
            found = x.match(re(route.path));
         matched = found && found[0] === found.input;
         if (matched) {
            curr = found[0];
            if (found[1]) values = found[1].split("/");
            keys = route.path.match(/(:\w+)/g);
            if (keys) {
               keys = keys.map((x) => x.replace(":", ""));
               for (let i = 0; i < values.length; i++) {
                  if (i < keys.length) params[keys[i]] = values[i];
                  else params[i] = values[i];
               }
               result.params = params;
            }
            result.page = route.page;
            break;
         }
      }
      if (!result.page) {
         result.page = e404;
         result.path = "/";
      }
      cbs.map((cb) => cb(result));
   }
   function listen() {
      addEventListener("popstate", route);
      addEventListener("pushstate", route);
      document.body.addEventListener("click", (e) => {
         let link = e.target.getAttribute("href");
         if (link) {
            e.preventDefault();
            route(link);
         }
      });
   }
   listen();
   return {
      route,
      unlisten() {
         removeEventListener("popstate", route);
         removeEventListener("pushstate", route);
         routes = [];
      },
      onroute(cb) {
         cbs.push(cb);
         return () => cbs.splice(cbs.indexOf(cb), 1);
      },
   };
};
