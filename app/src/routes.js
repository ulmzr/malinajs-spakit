import Features from "./pages/features/index.xht";
import Home from "./pages/Home.xht";
import About from "./pages/About.xht";

export default [
   { path: "/features/:0", page: Features },
   { path: "/", page: Home },
   { path: "/about", page: About },
];
