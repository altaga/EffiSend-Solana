import { ScrollViewStyleReset } from "expo-router/html";

export default function Root({ children }) {
  return (
    <html lang="en" style={{ backgroundColor: "black" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="base:app_id" content="69b0ea1f57ef805ff2c36970" />
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Effisend" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <style>
          {`
            body {
              background-color: #000000;
            }
            #native-splash {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-color: #000000;
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 999999;
              transition: opacity 0.5s ease-out;
              pointer-events: none;
            }
            #native-splash img {
              width: 120px;
              height: 120px;
              object-fit: contain;
              filter: brightness(1);
            }
            #native-splash.fade-out {
              opacity: 0;
            }
          `}
        </style>
        <ScrollViewStyleReset />
        <script>
          {`
            (function() {
              // Version Check & Cache Busting
              var APP_VERSION = "${require('../../package.json').version}";
              
              function clearCacheAndReload(newVersion) {
                console.log('🚀 New version detected: ' + newVersion + '. Clearing cache and reloading...');
                if ('caches' in window) {
                  caches.keys().then(function(names) {
                    for (let name of names) caches.delete(name);
                  });
                }
                localStorage.setItem('app_version', newVersion);
                location.reload(true);
              }

              // 1. Immediate check against localStorage (for quick refreshes)
              var storedVersion = localStorage.getItem('app_version');
              if (storedVersion && storedVersion !== APP_VERSION) {
                clearCacheAndReload(APP_VERSION);
              }

              // 2. Network check against version.json (to bypass browser/SW cache of index.html)
              fetch('/version.json?t=' + Date.now())
                .then(function(r) { return r.json(); })
                .then(function(data) {
                  if (data && data.version && data.version !== APP_VERSION) {
                    clearCacheAndReload(data.version);
                  }
                })
                .catch(function(e) { console.error('Version check failed', e); });

              // Silent Warnings
              var patterns = [
                'style props are deprecated',
                'usenativedriver',
                'use boxshadow',
                'use textshadow',
                'expected value to be of type number',
                'found null instead',
              ];
              function shouldIgnore(args) {
                var msg = Array.prototype.join.call(args, ' ').toLowerCase();
                return patterns.some(function(p) { return msg.indexOf(p) !== -1; });
              }
              var _warn = console.warn;
              console.warn = function() { if (!shouldIgnore(arguments)) _warn.apply(console, arguments); };
              var _error = console.error;
              console.error = function() { if (!shouldIgnore(arguments)) _error.apply(console, arguments); };

              // Hide Splash when app is ready
              window.addEventListener('load', function() {
                setTimeout(function() {
                  var splash = document.getElementById('native-splash');
                  if (splash) splash.classList.add('fade-out');
                  setTimeout(function() {
                     if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
                  }, 500);
                }, 100);
              });
            })();
          `}
        </script>
      </head>
      <body style={{ backgroundColor: "black", margin: 0, padding: 0 }}>
        <div id="native-splash">
          <img src="/icon.webp" alt="Loading..." />
        </div>
        {children}
      </body>
    </html>
  );
}

