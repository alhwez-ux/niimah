export const installStore = {
  event: null,
  installed: false,
};

if (typeof window !== 'undefined') {
  installStore.installed =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installStore.event = event;
    window.dispatchEvent(new Event('niimah-install'));
  });

  window.addEventListener('appinstalled', () => {
    installStore.installed = true;
    installStore.event = null;
    window.dispatchEvent(new Event('niimah-install'));
  });
}
