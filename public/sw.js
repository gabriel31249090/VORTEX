// Service Worker do VORTEX
//
// Objetivo: só o necessário pra passar nos requisitos de PWA instalável
// (Bubblewrap/TWA exige um SW com fallback offline) sem arriscar servir
// dado velho do feed, chat ou Supabase Realtime.
//
// Estratégia:
// - Navegação (troca de página): tenta rede primeiro; se falhar (offline),
//   mostra a página estática /offline.html.
// - Ícones e manifest.json: cache-first (são estáticos, não mudam sozinhos).
// - Todo o resto (API routes, chamadas ao Supabase, chunks JS, imagens de
//   post/avatar): NÃO é interceptado — vai direto pra rede, como se o SW
//   não existisse. Isso evita servir feed/chat desatualizado.

const CACHE_VERSION = 'vortex-shell-v1';
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  // Navegação de página (o usuário abrindo/trocando de rota)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Assets estáticos precacheados: cache-first
  const path = new URL(request.url).pathname;
  if (PRECACHE_ASSETS.includes(path)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Qualquer outra coisa (API, Supabase, chunks, mídia) -> não intercepta
});
