// Headless runner for posedetect.html's deadlift self-tests.
// Usage: node tools/dl_selftest.mjs "?exercise=deadlift&ui=full&spineforce=1"
// Extracts the <script> from assets/posedetect.html and runs it against minimal DOM stubs
// (camera errors from init() are expected and ignored; the test hooks are defined before init()).
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dir, '..', 'assets', 'posedetect.html');
const search = process.argv[2] || '?exercise=deadlift&ui=full';

let t = 0;
globalThis.performance = { now: () => t };
const ctxStub = new Proxy({}, { get: () => () => {} });
const fakeEl = () => ({
  textContent: '', style: new Proxy({}, { get: () => '', set: () => true }),
  classList: { add() {}, remove() {} }, offsetWidth: 0, setProperty() {}, appendChild() {},
  addEventListener() {}, getContext: () => ctxStub,
});
const els = {};
globalThis.document = {
  getElementById: id => (els[id] ||= fakeEl()), createElement: () => fakeEl(),
  addEventListener() {}, head: { appendChild() {} }, visibilityState: 'visible',
};
const sent = [];
globalThis.window = {
  location: { search },
  ReactNativeWebView: { postMessage: s => sent.push(JSON.parse(s)) },
  addEventListener() {},
};
Object.defineProperty(globalThis, 'navigator', {
  value: { mediaDevices: { getUserMedia: async () => { throw Object.assign(new Error('no-cam'), { name: 'NotFoundError' }); } } },
  configurable: true,
});
globalThis.requestAnimationFrame = () => {};
globalThis.setInterval = () => {};
globalThis.setTimeout = () => {};
globalThis.fetch = async () => ({ ok: false, status: 404, headers: { get: () => null } });

const html = fs.readFileSync(htmlPath, 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const tmp = path.join(__dir, '.app.mjs');
fs.writeFileSync(tmp, code);
await import(pathToFileURL(tmp).href);
fs.unlinkSync(tmp);

const W = globalThis.window;
console.log('URL:', search);
console.log('__dlSelfTest:', JSON.stringify(W.__dlSelfTest()));
