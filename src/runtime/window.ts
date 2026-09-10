// Created by Autokaka (qq1909698494@gmail.com) on 2026/09/10.

// The stego wrapper is an iframe, but the page must observe a standalone document: parent/frameElement are forgeable, top/ancestorOrigins are not.
export function installWindowFacade() {
  Object.defineProperty(window, "parent", { get: () => window, configurable: true });
  Object.defineProperty(window, "frameElement", { get: () => null, configurable: true });
}
