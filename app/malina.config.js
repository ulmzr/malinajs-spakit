const sassPlugin = require("malinajs/plugins/sass.js");

module.exports = function (option, filename) {
   option.css = false;
   option.hideLabel = true;
   option.immutable = true;
   option.plugins = [sassPlugin()];
   option.autoimport = (name) => `import { ${name} } from "@cmp";`;
   return option;
};
