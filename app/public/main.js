(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // node_modules/malinajs/runtime.js
  var current_destroyList;
  var current_mountList;
  var current_cd;
  var destroyResults;
  var $onDestroy = (fn) => fn && current_destroyList.push(fn);
  var $onMount = (fn) => current_mountList.push(fn);
  var __app_onerror = console.error;
  var isFunction = (fn) => typeof fn == "function";
  var isObject = (d) => typeof d == "object";
  var safeCall = (fn) => {
    try {
      return fn?.();
    } catch (e) {
      __app_onerror(e);
    }
  };
  var safeGroupCall = (list) => {
    try {
      list?.forEach((fn) => fn?.());
    } catch (e) {
      __app_onerror(e);
    }
  };
  var safeGroupCall2 = (list, resultList, onlyFunction) => {
    list?.forEach((fn) => {
      let r = safeCall(fn);
      r && (!onlyFunction || isFunction(r)) && resultList.push(r);
    });
  };
  function WatchObject(fn, cb) {
    this.fn = fn;
    this.cb = cb;
    this.value = NaN;
    this.cmp = null;
  }
  function $watch(fn, callback, option) {
    let w = new WatchObject(fn, callback);
    option && Object.assign(w, option);
    current_cd.watchers.push(w);
    return w;
  }
  function removeItem(array, item) {
    let i = array.indexOf(item);
    if (i >= 0)
      array.splice(i, 1);
  }
  function $ChangeDetector(parent) {
    this.parent = parent;
    this.children = [];
    this.watchers = [];
    this.prefix = [];
  }
  var cd_component = (cd) => {
    while (cd.parent)
      cd = cd.parent;
    return cd.component;
  };
  var cd_new = (parent) => new $ChangeDetector(parent);
  var cd_attach = (parent, cd) => {
    if (cd) {
      cd.parent = parent;
      parent.children.push(cd);
    }
  };
  var cd_detach = (cd) => removeItem(cd.parent.children, cd);
  var isArray = (a) => Array.isArray(a);
  var _compareDeep = (a, b, lvl) => {
    if (lvl < 0 || !a || !b)
      return a !== b;
    if (a === b)
      return false;
    let o0 = isObject(a);
    let o1 = isObject(b);
    if (!(o0 && o1))
      return a !== b;
    let a0 = isArray(a);
    let a1 = isArray(b);
    if (a0 !== a1)
      return true;
    if (a0) {
      if (a.length !== b.length)
        return true;
      for (let i = 0; i < a.length; i++) {
        if (_compareDeep(a[i], b[i], lvl - 1))
          return true;
      }
    } else if (a instanceof Date) {
      if (b instanceof Date)
        return +a !== +b;
    } else {
      let set = {};
      for (let k in a) {
        if (_compareDeep(a[k], b[k], lvl - 1))
          return true;
        set[k] = true;
      }
      for (let k in b) {
        if (set[k])
          continue;
        return true;
      }
    }
    return false;
  };
  function cloneDeep(d, lvl) {
    if (lvl < 0 || !d)
      return d;
    if (isObject(d)) {
      if (d instanceof Date)
        return d;
      if (d instanceof Element)
        return d;
      if (isArray(d))
        return d.map((i) => cloneDeep(i, lvl - 1));
      let r = {};
      for (let k in d)
        r[k] = cloneDeep(d[k], lvl - 1);
      return r;
    }
    return d;
  }
  function deepComparator(depth) {
    return function(w, value) {
      let diff = _compareDeep(w.value, value, depth);
      diff && (w.value = cloneDeep(value, depth), !w.idle && w.cb(value));
      w.idle = false;
    };
  }
  var compareDeep = deepComparator(10);
  var keyComparator = (w, value) => {
    let diff = false;
    for (let k in value) {
      if (w.value[k] != value[k])
        diff = true;
      w.value[k] = value[k];
    }
    diff && !w.idle && w.cb(value);
    w.idle = false;
  };
  var fire = (w) => {
    let value = w.fn();
    if (w.cmp)
      w.cmp(w, value);
    else {
      w.value = value;
      w.cb(w.value);
    }
    return value;
  };
  function $digest($cd, flag) {
    let loop = 10;
    let w;
    while (loop >= 0) {
      let index = 0;
      let queue = [];
      let i, value, cd = $cd, changes = 0;
      while (cd) {
        for (i = 0; i < cd.prefix.length; i++)
          cd.prefix[i]();
        for (i = 0; i < cd.watchers.length; i++) {
          w = cd.watchers[i];
          value = w.fn();
          if (w.value !== value) {
            flag[0] = 0;
            if (w.cmp) {
              w.cmp(w, value);
            } else {
              w.cb(w.value = value);
            }
            changes += flag[0];
          }
        }
        if (cd.children.length)
          queue.push.apply(queue, cd.children);
        cd = queue[index++];
      }
      loop--;
      if (!changes)
        break;
    }
    if (loop < 0)
      __app_onerror("Infinity changes: ", w);
  }
  var templatecache = {};
  var htmlToFragmentClean = (html, option) => {
    let result = templatecache[html];
    if (!result) {
      let t = document.createElement("template");
      t.innerHTML = html.replace(/<>/g, "<!---->");
      result = t.content;
      let it = document.createNodeIterator(result, 128);
      let n;
      while (n = it.nextNode()) {
        if (!n.nodeValue)
          n.parentNode.replaceChild(document.createTextNode(""), n);
      }
      if (!(option & 2) && result.firstChild == result.lastChild)
        result = result.firstChild;
      templatecache[html] = result;
    }
    return option & 1 ? result.cloneNode(true) : result;
  };
  var iterNodes = (el, last, fn) => {
    let next;
    while (el) {
      next = el.nextSibling;
      fn(el);
      if (el == last)
        break;
      el = next;
    }
  };
  var removeElements = (el, last) => iterNodes(el, last, (n) => n.remove());
  var resolvedPromise = Promise.resolve();
  function $tick(fn) {
    fn && resolvedPromise.then(fn);
    return resolvedPromise;
  }
  var current_component;
  var $context;
  var makeApply = () => {
    let $cd = current_component.$cd = current_cd = cd_new();
    $cd.component = current_component;
    let planned, flag = [0];
    let apply = (r) => {
      flag[0]++;
      if (planned)
        return r;
      planned = true;
      $tick(() => {
        try {
          $digest($cd, flag);
        } finally {
          planned = false;
        }
      });
      return r;
    };
    current_component.$apply = apply;
    current_component.$push = apply;
    apply();
    return apply;
  };
  var makeComponent = (init) => {
    return ($option = {}) => {
      $context = $option.context || {};
      let prev_component = current_component, prev_cd = current_cd, $component = current_component = { $option };
      current_cd = null;
      try {
        $component.$dom = init($option);
      } finally {
        current_component = prev_component;
        current_cd = prev_cd;
        $context = null;
      }
      return $component;
    };
  };
  var callComponent = (component, context, option = {}) => {
    option.context = { ...context };
    let $component = safeCall(() => component(option));
    if ($component instanceof Node)
      $component = { $dom: $component };
    return $component;
  };
  var callComponentDyn = (component, context, option = {}, propFn, cmp, setter, classFn) => {
    let $component, parentWatch;
    if (propFn) {
      parentWatch = $watch(propFn, (value) => {
        $component.$push?.(value);
        $component.$apply?.();
      }, { value: {}, idle: true, cmp });
      option.props = fire(parentWatch);
    }
    if (classFn) {
      fire($watch(classFn, (value) => {
        option.$class = value;
        $component?.$apply?.();
      }, { value: {}, cmp: keyComparator }));
    }
    $component = callComponent(component, context, option);
    if (setter && $component?.$exportedProps) {
      let parentCD = current_cd, w = new WatchObject($component.$exportedProps, (value) => {
        setter(value);
        cd_component(parentCD).$apply();
        $component.$push(parentWatch.fn());
        $component.$apply();
      });
      Object.assign(w, { idle: true, cmp, value: parentWatch.value });
      $component.$cd.watchers.push(w);
    }
    return $component;
  };
  var attachDynComponent = (label, exp, bind, parentLabel) => {
    let parentCD = current_cd;
    let destroyList, $cd, first;
    const destroy = () => safeGroupCall(destroyList);
    $onDestroy(destroy);
    $watch(exp, (component) => {
      destroy();
      if ($cd)
        cd_detach($cd);
      if (first)
        removeElements(first, parentLabel ? null : label.previousSibling);
      if (component) {
        destroyList = current_destroyList = [];
        current_mountList = [];
        $cd = current_cd = cd_new(parentCD);
        try {
          const $dom = bind(component).$dom;
          cd_attach(parentCD, $cd);
          first = $dom.nodeType == 11 ? $dom.firstChild : $dom;
          if (parentLabel)
            label.appendChild($dom);
          else
            label.parentNode.insertBefore($dom, label);
          safeGroupCall2(current_mountList, destroyList);
        } finally {
          current_destroyList = current_mountList = current_cd = null;
        }
      } else {
        $cd = first = destroyList = null;
      }
    });
  };
  var autoSubscribe = (...list) => {
    list.forEach((i) => {
      if (isFunction(i.subscribe)) {
        let unsub = i.subscribe(current_component.$apply);
        if (isFunction(unsub))
          $onDestroy(unsub);
      }
    });
  };
  var addClass = (el, className) => el.classList.add(className);
  var bindClass = (element, fn, className) => {
    $watch(fn, (value) => {
      if (value)
        addClass(element, className);
      else
        element.classList.remove(className);
    }, { value: false });
  };
  var bindText = (element, fn) => {
    $watch(() => "" + fn(), (value) => {
      element.textContent = value;
    });
  };
  var bindAttributeBase = (element, name, value) => {
    if (value != null)
      element.setAttribute(name, value);
    else
      element.removeAttribute(name);
  };
  var bindAction = (element, action, fn, subscribe) => {
    let handler, value;
    if (fn) {
      value = fn();
      handler = action.apply(null, [element].concat(value));
    } else
      handler = action(element);
    if (isFunction(handler))
      $onDestroy(handler);
    else {
      $onDestroy(handler?.destroy);
      subscribe?.(fn, handler, value);
      handler?.init && $onMount(handler.init);
    }
  };
  var spreadAttributes = (el, fn) => {
    const props = Object.getOwnPropertyDescriptors(el.__proto__);
    let prev = {};
    const set = (k, v) => {
      if (k == "style")
        el.style.cssText = v;
      else if (props[k]?.set)
        el[k] = v;
      else
        bindAttributeBase(el, k, v);
    };
    const apply = (state) => {
      for (let k in state) {
        let value = state[k];
        if (prev[k] != value) {
          set(k, value);
          prev[k] = value;
        }
      }
      for (let k in prev) {
        if (!(k in state)) {
          set(k, null);
          delete prev[k];
        }
      }
    };
    $watch(fn, apply, {
      cmp: (_, state) => {
        apply(state);
        return 0;
      }
    });
  };
  var makeBlock = (fr, fn) => {
    return (v) => {
      let $dom = fr.cloneNode(true);
      fn?.($dom, v);
      return $dom;
    };
  };
  var insertBlock = (label, $dom) => {
    if (!$dom)
      return;
    label.parentNode.insertBefore($dom.$dom || $dom, label);
  };
  var mount = (label, component, option) => {
    let app, first, last, destroyList = current_destroyList = [];
    current_mountList = [];
    try {
      app = component(option);
      let $dom = app.$dom;
      delete app.$dom;
      if ($dom.nodeType == 11) {
        first = $dom.firstChild;
        last = $dom.lastChild;
      } else
        first = last = $dom;
      label.appendChild($dom);
      safeGroupCall2(current_mountList, destroyList);
    } finally {
      current_destroyList = current_mountList = null;
    }
    app.destroy = () => {
      safeGroupCall(destroyList);
      removeElements(first, last);
    };
    return app;
  };
  var refer = (active, line) => {
    let result = [], i, v;
    const code = (x, d) => x.charCodeAt() - d;
    for (i = 0; i < line.length; i++) {
      let a = line[i];
      switch (a) {
        case ">":
          active = active.firstChild;
          break;
        case "+":
          active = active.firstChild;
        case ".":
          result.push(active);
          break;
        case "!":
          v = code(line[++i], 48) * 42 + code(line[++i], 48);
          while (v--)
            active = active.nextSibling;
          break;
        case "#":
          active = result[code(line[++i], 48) * 26 + code(line[++i], 48)];
          break;
        default:
          v = code(a, 0);
          if (v >= 97)
            active = result[v - 97];
          else {
            v -= 48;
            while (v--)
              active = active.nextSibling;
          }
      }
    }
    return result;
  };
  function ifBlock(label, fn, parts, parentLabel) {
    let first, last, $cd, destroyList, parentCD = current_cd;
    $onDestroy(() => safeGroupCall2(destroyList, destroyResults));
    function createBlock(builder) {
      let $dom;
      destroyList = current_destroyList = [];
      let mountList = current_mountList = [];
      $cd = current_cd = cd_new(parentCD);
      try {
        $dom = builder();
      } finally {
        current_destroyList = current_mountList = current_cd = null;
      }
      cd_attach(parentCD, $cd);
      if ($dom.nodeType == 11) {
        first = $dom.firstChild;
        last = $dom.lastChild;
      } else
        first = last = $dom;
      if (parentLabel)
        label.appendChild($dom);
      else
        label.parentNode.insertBefore($dom, label);
      safeGroupCall2(mountList, destroyList, 1);
    }
    function destroyBlock() {
      if (!first)
        return;
      destroyResults = [];
      safeGroupCall2(destroyList, destroyResults);
      destroyList.length = 0;
      if ($cd) {
        cd_detach($cd);
        $cd = null;
      }
      if (destroyResults.length) {
        let f = first, l = last;
        Promise.allSettled(destroyResults).then(() => {
          removeElements(f, l);
        });
      } else
        removeElements(first, last);
      first = last = null;
      destroyResults = null;
    }
    $watch(fn, (value) => {
      destroyBlock();
      if (value != null)
        createBlock(parts[value]);
    });
  }

  // ../router.js
  function router() {
    let len = arguments.length - 1;
    let callback = arguments[len];
    let routes = arguments[0];
    let e404 = `404 - PAGE NOT FOUND`;
    if (len === 2)
      e404 = arguments[1];
    let curr;
    addEventListener("popstate", route);
    addEventListener("pushstate", route);
    document.body.addEventListener("click", (ev) => {
      let href = ev.target.getAttribute("href");
      if (!href)
        return;
      ev.preventDefault();
      route(href);
    });
    route();
    function route(x, replace) {
      if (curr === x)
        return;
      if (typeof x !== "string")
        x = location.pathname;
      history.pushState(x, null, x);
      let params = {};
      let query = x.includes("?");
      if (query) {
        query = x.replace(/.*\?/, "").replace(/\=\=/g, "=").replace(/\&\&/g, "&").split("&");
        query.map((q) => {
          params[q.split("=")[0]] = q.split("=")[1];
        });
      }
      let match = routes.filter((route2) => {
        let path = route2.path;
        let keys = path.match(/\/:\w+/g);
        let re = new RegExp(path.replace(keys?.join(""), "(.*)"));
        let matched = location.pathname.match(re);
        let isMatch = matched && matched[0] === matched.input;
        if (isMatch) {
          let values = matched[1]?.split("/").slice(1);
          if (values && keys) {
            keys = keys?.join("").split("/:").slice(1);
            for (let i = 0; i < values.length; i++) {
              if (i < keys.length)
                params[keys[i]] = values[i];
              else
                params[i] = values[i];
            }
          }
        }
        return isMatch;
      });
      match = match[match.length - 1];
      if (match) {
        callback({ page: match.page, params });
      } else {
        if (typeof e404 === "string")
          console.log(e404);
        else
          callback({ page: e404, params });
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
        removeEventListener("popstate", route);
        removeEventListener("pushstate", route);
        routes = [];
      }
    };
  }
  var router_default = router;

  // src/components/Img.xht
  var Img_default = makeComponent(($option) => {
    const $$apply = makeApply();
    let $props = $option.props || {};
    let { src, avatar, ...$attributes } = $props;
    current_component.$push = ($$props) => ({ src = src, avatar = avatar, ...$attributes } = $props = $$props);
    current_component.$exportedProps = () => ({ src, avatar });
    let savedSrc = src, height;
    src = "";
    if (avatar) {
      height = 24 * Number(avatar);
    }
    function interObs(el) {
      $$apply();
      const io = new IntersectionObserver((entries, o) => {
        $$apply();
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            let e = entry.target;
            e.src = savedSrc;
            o.unobserve(e);
          }
        });
      });
      io.observe(el);
    }
    {
      const $parentElement = htmlToFragmentClean(`<><>`, 3);
      let [el2] = refer($parentElement, ">1.");
      ifBlock(
        el2,
        () => avatar ? 0 : 1,
        [makeBlock(htmlToFragmentClean(` <img class="mkdu7le"/> `), ($parentElement2) => {
          let [el0] = refer($parentElement2, ">1.");
          spreadAttributes(el0, () => ({ ...$attributes, height: `${height}` }));
          bindAction(el0, interObs);
          bindClass(el0, () => !!avatar, "avatar");
        }), makeBlock(htmlToFragmentClean(` <img/> `), ($parentElement2) => {
          let [el1] = refer($parentElement2, ">1.");
          spreadAttributes(el1, () => ({ ...$attributes }));
          bindAction(el1, interObs);
        })]
      );
      return $parentElement;
    }
  });

  // src/containers/E404.xht
  var E404_default = ($option = {}) => {
    {
      const $parentElement = htmlToFragmentClean(`<article> <hgroup class="myypk5h"><h1>404</h1><h6 mute class="myypk5h">Page not found</h6></hgroup> </article>`, 1);
      return { $dom: $parentElement };
    }
  };

  // src/pages/features/index.js
  var features_exports = {};
  __export(features_exports, {
    paragraph: () => paragraph_default
  });

  // src/pages/features/paragraph.xht
  var paragraph_default = makeComponent(($option) => {
    const $$apply = makeApply();
    let $props = $option.props || {};
    let { params } = $props;
    current_component.$push = ($$props) => ({ params = params } = $props = $$props);
    current_component.$exportedProps = () => ({ params });
    {
      const $parentElement = htmlToFragmentClean(`<article> <hgroup><h1>Paragraph</h1><h3 mute>About paragraph</h3></hgroup> <hr/> <p>Lorem ipsum dolor, sit amet consectetur adipisicing elit. Mollitia saepe, aperiam magnam sequi officiis quas nulla amet illo perspiciatis rem! Deleniti obcaecati aut illo quibusdam voluptas omnis eligendi asperiores est.</p><br/> </article>`, 1);
      let [el1] = refer($parentElement, ">7.");
      ifBlock(
        el1,
        () => params ? 0 : null,
        [makeBlock(htmlToFragmentClean(` <pre> </pre> `), ($parentElement2) => {
          let [el0] = refer($parentElement2, ">1+");
          bindText(el0, () => `${JSON.stringify(params)}`);
        })]
      );
      return $parentElement;
    }
  });

  // src/pages/features/index.xht
  var features_default = makeComponent(($option) => {
    const $$apply = makeApply();
    let $props = $option.props || {};
    const $context2 = $context;
    autoSubscribe(features_exports);
    let { params } = $props;
    current_component.$push = ($$props) => ({ params = params } = $props = $$props);
    current_component.$exportedProps = () => ({ params });
    let cmp;
    $watch(() => params, () => {
      cmp = features_exports[params["0"]] || null;
    });
    $watch(() => params, () => {
      console.log(params);
    });
    {
      const $parentElement = htmlToFragmentClean(`<><>`, 3);
      let [el4] = refer($parentElement, ">1.");
      ifBlock(
        el4,
        () => {
          if (cmp)
            return 0;
          if (Object.keys(params).length === 0 || typeof params === "object")
            return 1;
          return 2;
        },
        [makeBlock(htmlToFragmentClean(` <> `, 2), ($parentElement2) => {
          let [el0] = refer($parentElement2, ">1.");
          attachDynComponent(el0, () => cmp, ($ComponentConstructor) => callComponentDyn(
            $ComponentConstructor,
            $context2,
            {},
            () => ({ params }),
            compareDeep
          ));
        }), makeBlock(htmlToFragmentClean(` <article> <hgroup><h1>Features</h1><h3 mute>About Features</h3></hgroup> <hr/> <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Fugit impedit, magnam voluptatum excepturi earum unde adipisci nihil minus, autem voluptate quidem alias quos accusantium maxime dolores laboriosam. Sapiente, sunt veniam.</p> <> </article> `), ($parentElement2) => {
          let [el2] = refer($parentElement2, ">1>7.");
          ifBlock(
            el2,
            () => typeof params === "object" ? 0 : null,
            [makeBlock(htmlToFragmentClean(`<br/><pre> </pre> `), ($parentElement3) => {
              let [el1] = refer($parentElement3, ">1+");
              bindText(el1, () => `${JSON.stringify(params)}`);
            })]
          );
        }), makeBlock(htmlToFragmentClean(` <> `, 2), ($parentElement2) => {
          let [el3] = refer($parentElement2, ">1.");
          insertBlock(el3, callComponent(
            E404_default,
            $context2,
            {}
          ));
        })]
      );
      return $parentElement;
    }
  });

  // src/pages/Home.xht
  var Home_default = makeComponent(($option) => {
    const $context2 = $context;
    {
      const $parentElement = htmlToFragmentClean(`<article> <hgroup><h1>Home</h1><h3 mute>About homepage</h3></hgroup> <hr/> <p>Lorem ipsum, dolor sit amet consectetur adipisicing elit. Optio dicta culpa eligendi accusamus. Dolorum vitae earum at molestiae odio culpa commodi, recusandae eaque ex eius, maiores iure suscipit consequatur nemo.</p> <p> <> </p> </article>`, 1);
      let [el0] = refer($parentElement, ">7>1.");
      insertBlock(el0, callComponent(
        Img_default,
        $context2,
        { props: { src: `/img/benih.webp` } }
      ));
      return $parentElement;
    }
  });

  // src/pages/About.xht
  var About_default = makeComponent(($option) => {
    const $$apply = makeApply();
    let $props = $option.props || {};
    let { params } = $props;
    current_component.$push = ($$props) => ({ params = params } = $props = $$props);
    current_component.$exportedProps = () => ({ params });
    console.log("uiparams:", params);
    {
      const $parentElement = htmlToFragmentClean(`<article> <hgroup><h1>About</h1><h3 mute>Application and developers</h3></hgroup> <hr/> <p>...nothing much here...</p> </article>`, 1);
      return $parentElement;
    }
  });

  // src/routes.js
  var routes_default = [
    { path: "/features/:0", page: features_default },
    { path: "/", page: Home_default },
    { path: "/about", page: About_default }
  ];

  // src/Layout.xht
  var Layout_default = makeComponent(($option) => {
    const $$apply = makeApply();
    const $context2 = $context;
    autoSubscribe(routes_default);
    let cmp, params;
    let me = window.location.pathname + window.location.search;
    const router2 = router_default(routes_default, E404_default, (route) => {
      $$apply();
      cmp = route.page;
      params = route.params;
    });
    $onMount(router2.listen);
    $onDestroy(router2.unlisten);
    {
      const $parentElement = htmlToFragmentClean(`<aside> <header><h4>Header</h4></header> <main> <a href="/">Home</a> <a href="/about">About</a> <a href="/features">Features</a> <a href="/features/paragraph">Paragraph Page</a> <a href="/features/paragraph/01/12/2023">Paragraph Others</a> <a href="/features/error">Error 404</a> <a href="/features?token=sljdlfgdfdsfmnnvclj&username=pasrah">Params</a> </main> <footer><h4>Footer</h4></footer> </aside> <>`, 3);
      let [el1] = refer($parentElement, ">2.");
      ifBlock(
        el1,
        () => cmp ? 0 : null,
        [makeBlock(htmlToFragmentClean(` <main> <> </main> `), ($parentElement2) => {
          let [el0] = refer($parentElement2, ">1>1.");
          attachDynComponent(el0, () => cmp, ($ComponentConstructor) => callComponentDyn(
            $ComponentConstructor,
            $context2,
            {},
            () => ({ params }),
            compareDeep
          ));
        })]
      );
      return $parentElement;
    }
  });

  // src/main.js
  mount(document.body, Layout_default);
})();
