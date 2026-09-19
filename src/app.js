import { mountBlog } from "./ui/blog.js";
import { mountWorkbench } from "./ui/ideWorkbench.js";

const DEFAULT_MAKE = "#/make?lesson=catch-fruit&level=secondary";

export function startApp(root) {
  let unmount = () => {};

  function render() {
    unmount();
    const { path, params } = parseHash();

    if (path === "/" || path === "/home") {
      history.replaceState(null, "", DEFAULT_MAKE);
      unmount = mountWorkbench(root, { level: "secondary" }) || (() => {});
      return;
    }

    if (path === "/make") {
      unmount = mountWorkbench(root, { level: params.get("level") || "secondary" }) || (() => {});
      return;
    }

    if (path === "/blog") {
      unmount = mountBlog(root) || (() => {});
      return;
    }

    history.replaceState(null, "", DEFAULT_MAKE);
    unmount = mountWorkbench(root, { level: "secondary" }) || (() => {});
  }

  window.addEventListener("hashchange", render);
  if (!location.hash || location.hash === "#/" || location.hash === "#") {
    history.replaceState(null, "", DEFAULT_MAKE);
  }
  render();
}

function parseHash() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, query] = raw.split("?");
  return { path: path || "/", params: new URLSearchParams(query || "") };
}
