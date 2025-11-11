# Reference Documentation

Integration guides for External Memory Chrome Extension project.

---

## React 19 + TypeScript + Chrome Extension

**Official Docs**: https://react.dev/

**Integration Guide**: https://blog.logrocket.com/creating-chrome-extension-react-typescript/

---

## Vite + React 19 + TypeScript + TailwindCSS + Chrome Extension

**Official Docs**: https://vite.dev/guide/

**Boilerplate (React 19 + TS + TailwindCSS ready)**: https://github.com/JohnBra/vite-web-extension

**Step-by-Step Guide**: https://medium.com/@jamesprivett29/02-building-a-chrome-extension-template-using-vite-react-and-typescript-d5d9912f1b40

---

## TypeScript 5.x

**Official Docs**: https://www.typescriptlang.org/docs/

**5-Minute Intro**: https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html

---

## Zustand (Latest Stable)

**Official Docs**: https://zustand.docs.pmnd.rs/

**NPM Package**: https://www.npmjs.com/package/zustand

---

## TailwindCSS v4 + Vite Setup

**Official Vite Integration**: https://tailwindcss.com/docs/guides/vite

**v4 Setup Guide**: https://dev.to/geane_ramos/how-to-setup-your-vite-project-with-react-typescript-and-tailwindcss-v4-2bkm

---

## Jest - Unit Testing

**Official Docs**: https://jestjs.io/

**Chrome Extension Unit Testing Guide**: https://developer.chrome.com/docs/extensions/how-to/test/unit-testing

**Setup**: Jest + mocks for Chrome APIs (e.g., `jest.spyOn()` for mocking `chrome.*` calls)

---

## Puppeteer - Integration Testing

**Official Docs**: https://pptr.dev/

**Chrome Extension Integration Testing Guide**: https://developer.chrome.com/docs/extensions/how-to/test/puppeteer

**Setup**: `npm install puppeteer jest`, launch with `headless: 'new'` and `enableExtensions: [EXTENSION_PATH]`

---

## Chrome Manifest V3

**Official Chrome for Developers**: https://developer.chrome.com/docs/extensions/

**Service Worker Setup**: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics

**Content Scripts**: https://developer.chrome.com/docs/extensions/develop/content-scripts

**Message Passing** (Content Script ↔ Service Worker): https://developer.chrome.com/docs/extensions/develop/concepts/messaging

---

## Quick Versions Reference

```
React: 19.x
TypeScript: 5.x
Zustand: 5.x (latest)
Vite: 5.x (latest)
TailwindCSS: 4.x
Jest: 29.x (latest)
Puppeteer: 22.x (latest)
Chrome Manifest: V3
Node: 18+ recommended
```
