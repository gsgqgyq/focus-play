// focusplay.willz.eu.org -> 反代 focusplay.516278.xyz
export default {
  async fetch(req) {
    const u = new URL(req.url);
    const upstream = "https://focusplay.516278.xyz" + u.pathname + u.search;
    const r = new Request(upstream, req);
    r.headers.set("Host", "focusplay.516278.xyz");
    return fetch(r);
  }
};