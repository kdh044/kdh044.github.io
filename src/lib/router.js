export function createRouter(routes) {
  function current() {
    const hash = window.location.hash.slice(1) || '/';
    return hash in routes ? hash : '/';
  }
  function trigger() {
    const handler = routes[current()];
    if (handler) handler();
  }
  return {
    current,
    navigate(path) {
      window.location.hash = path;
      if (current() === path) trigger();
    },
    start() {
      window.addEventListener('hashchange', trigger);
      trigger();
    },
  };
}
