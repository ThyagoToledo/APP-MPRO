import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Geolocation } from '@capacitor/geolocation';
if (Capacitor.isNativePlatform()) {
  window.MPRO_NATIVE = true;
  const Print = registerPlugin('MproPrint');
  const Speech = registerPlugin('MproSpeech');
  window.MPRO_DICTATE = async () => {
    if (!window.confirm('O ditado usa o serviço de reconhecimento de voz do Android. O provedor do seu aparelho pode processar sua fala pela internet. Deseja continuar?')) throw new Error('Ditado cancelado.');
    const result = await Speech.recognize();
    return result.text;
  };
  window.print = () => Print.print().catch(e => window.MPRO?.ui?.snack(e.message));
  navigator.geolocation.getCurrentPosition = (success, error, opts) => {
    // A explicação aparece antes da solicitação do sistema e somente após a ação do usuário.
    if (!window.confirm('O M-PRO usa a localização apenas durante o uso para marcar a fazenda ou a visita. Ela será salva com o registro e sincronizada com sua conta. Permitir?')) {
      error?.({ code: 1, message: 'Localização não autorizada.' }); return;
    }
    Geolocation.getCurrentPosition(opts || {}).then(success).catch(error || (() => {}));
  };
  document.addEventListener('click', event => {
    if (event.target.matches('input[type="file"][capture]') && !window.confirm('A câmera será usada para registrar uma foto da visita. A imagem será salva com o registro e sincronizada com sua conta. Continuar?')) { event.preventDefault(); return; }
    const link = event.target.closest('a[href]');
    if (!link) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin && /^https?:$/.test(url.protocol)) {
      event.preventDefault(); Browser.open({ url: url.href });
    }
  });
  App.addListener('backButton', ({ canGoBack }) => {
    const ui = window.MPRO?.ui;
    if (!document.getElementById('sheet-host')?.hidden) { ui?.closeSheet(); return; }
    if (!document.getElementById('drawer')?.hidden) { ui?.closeDrawer(); return; }
    if (canGoBack && location.hash !== '#/' && location.hash !== '#/login') history.back();
    else App.minimizeApp();
  });
  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) window.MPRO?.sync?.automaticamente();
    else if (window.MPRO?.audio?.estaGravando()) window.MPRO.audio.pararGravacao().then(audio => {
      if (audio) window.MPRO.db.salvar('photos', { id: audio.id, tipo: 'audios', titulo: 'Nota de campo interrompida', url: audio.dataUrl, legenda: audio.transcricao, duracao: audio.duracaoFormatada, criadoEm: new Date().toISOString() });
    });
  });
}
