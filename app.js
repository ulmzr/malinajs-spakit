const path = require("node:path");

const start = () => {
   let server = require("child_process").spawn("node", [path.join(__dirname, "server.js"), "--", `-w`], {
      stdio: ["ignore", "inherit", "inherit"],
      shell: true,
   });
   server.on("close", start);
};

start();
