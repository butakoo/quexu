const PREFIX='quexu-static-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const CACHE=PREFIX+'9ff4983f7d7a';
const ASSETS=['./','./index.html','./app.js','./game.js','./style.css','./account.css','./local-accounts.js','./local-account-ui.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 const navigation=event.request.mode==='navigate';if(!navigation&&!ASSETS.some(asset=>new URL(asset,self.location.href).pathname===url.pathname))return;
 event.respondWith(fetch(event.request).then(async response=>{if(response.ok){const cache=await caches.open(CACHE);await cache.put(navigation?'./index.html':event.request,response.clone());}return response;}).catch(async()=>{const cache=await caches.open(CACHE),cached=await cache.match(navigation?'./index.html':event.request);return cached||new Response('暂时离线，请联网后再打开。',{status:503});}));
});
