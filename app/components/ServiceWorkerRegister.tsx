'use client';

import { useEffect } from 'react';

// Registra o service worker (public/sw.js) depois que a página carrega.
// Silencioso em dev/localhost sem problema — só ativa de fato em produção,
// onde o Chrome exige HTTPS pra service worker funcionar.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Falha ao registrar o service worker do VORTEX:', err);
      });
    });
  }, []);

  return null;
}
