/* 砺知 PWA Service Worker
 * 策略：
 *  - 页面导航：先请求网络（拿到最新版），失败时回退到缓存中的 index.html。
 *  - 同源静态资源：缓存优先，后台顺带更新。
 *  - 只缓存同源 GET 请求，不接触任何第三方请求或数据。
 * 更新部署后可把 VERSION 加一，旧缓存会在 activate 时清理。
 */
const VERSION = 'v1.2.0'
const CACHE_NAME = `lizhi-kaogong-${VERSION}`
const CORE_PATHS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
]

const scopeUrl = () => new URL(self.registration.scope)
const coreUrl = (path) => new URL(path, scopeUrl()).toString()

/**
 * 首屏资源预缓存。
 * Vite 构建后的 JS/CSS 文件名带 hash，静态 sw.js 无法提前知道；
 * 所以安装时先取一次 index.html，解析出 <script>/<link> 的资源地址再缓存。
 * 这样用户第一次联网打开后，即使马上断网刷新也能看到页面。
 */
async function precache() {
  const cache = await caches.open(CACHE_NAME)

  await Promise.all(
    CORE_PATHS.map(async (path) => {
      try {
        await cache.add(coreUrl(path))
      } catch {
        // 单个核心资源失败不应让整个 Service Worker 装不上。
      }
    }),
  )

  try {
    const indexUrl = coreUrl('./index.html')
    const response = await fetch(indexUrl, { cache: 'reload' })
    if (!response.ok) return
    await cache.put(indexUrl, response.clone())
    const html = await response.text()
    const assetPaths = Array.from(
      html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g),
      (match) => new URL(match[1], indexUrl).toString(),
    )
    await Promise.all(
      Array.from(new Set(assetPaths)).map(async (assetUrl) => {
        try {
          await cache.add(assetUrl)
        } catch {
          // 忽略单个构建产物的预缓存失败，运行时仍会尝试网络缓存。
        }
      }),
    )
  } catch {
    // 离线安装等极端情况：保留核心缓存，等下一次在线时更新。
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('lizhi-kaogong-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME)
          return (
            (await cache.match(request)) ||
            (await cache.match(coreUrl('./index.html'))) ||
            (await cache.match(coreUrl('./'))) ||
            new Response('当前页面尚未缓存，请联网打开一次后再离线使用。', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          )
        }),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})
