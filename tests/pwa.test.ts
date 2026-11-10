import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import manifest from "../app/manifest";
function worker(fetcher: () => Promise<unknown>) {
  const handlers: Record<string, (e: any) => void> = {};
  const context = {
    URL,
    Promise,
    self: {
      location: { origin: "https://illam.test" },
      addEventListener: (name: string, fn: (e: any) => void) =>
        (handlers[name] = fn),
    },
    fetch: fetcher,
    caches: { match: async () => ({ offline: true }) },
  };
  vm.runInNewContext(readFileSync("public/sw.js", "utf8"), context);
  return handlers;
}
test("Private API responses never go through service worker caching", () => {
  const h = worker(async () => {
    throw new Error("must not fetch");
  });
  let intercepted = false;
  h.fetch({
    request: {
      url: "https://illam.test/api/projects",
      method: "GET",
      mode: "navigate",
    },
    respondWith: () => (intercepted = true),
  });
  assert.equal(intercepted, false);
});
test("Failed navigation shows only the generic offline page", async () => {
  const h = worker(async () => {
    throw new Error("offline");
  });
  let response: Promise<any> | undefined;
  h.fetch({
    request: { url: "https://illam.test/", method: "GET", mode: "navigate" },
    respondWith: (p: Promise<any>) => (response = p),
  });
  assert.deepEqual(await response, { offline: true });
});
test("Online navigation stays fresh and is not replaced by cache", async () => {
  const h = worker(async () => ({ fresh: true }));
  let response: Promise<any> | undefined;
  h.fetch({
    request: { url: "https://illam.test/", method: "GET", mode: "navigate" },
    respondWith: (p: Promise<any>) => (response = p),
  });
  assert.deepEqual(await response, { fresh: true });
});
test("Install manifest has real PNG icons matching declared dimensions", () => {
  const m = manifest();
  assert.equal(m.display, "standalone");
  assert.equal(m.start_url, "/");
  for (const icon of m.icons || []) {
    const data = readFileSync("public" + icon.src);
    const [w, h] = icon.sizes!.split("x").map(Number);
    assert.equal(data.readUInt32BE(16), w);
    assert.equal(data.readUInt32BE(20), h);
  }
});
