(function () {
 'use strict';
 window.__quexuBootStarted = true;
 var panel = document.getElementById('startup-status');
 var message = document.getElementById('startup-message');
 var help = document.getElementById('startup-help');
 var localHelp = document.getElementById('startup-local-help');
 var details = document.getElementById('startup-details');
 var retry = document.getElementById('startup-retry');
 function problem(state, text, reason) {
  panel.dataset.state = state;
  panel.hidden = false;
  message.textContent = text;
  help.hidden = false;
  localHelp.hidden = state !== 'file' && ['localhost', '127.0.0.1', '[::1]'].indexOf(location.hostname) === -1;
  if (reason) {
   details.hidden = false;
   document.getElementById('startup-error').textContent = String(reason.message || reason);
  }
 }
 if (location.protocol === 'file:') {
  retry.hidden = true;
  problem('file', '这是网页文件，请通过本地服务启动游戏。');
  return;
 }
 if (location.protocol !== 'http:' && location.protocol !== 'https:') {
  problem('unsupported', '请通过网页网址打开游戏。');
  return;
 }
 if (!window.isSecureContext) {
  problem('unsupported', '请使用 HTTPS 网址，或在本机通过 localhost／127.0.0.1 打开；账号保存需要安全连接。');
  return;
 }
 if (!Array.prototype.at || !window.PointerEvent || !window.Promise || !window.crypto || typeof window.crypto.randomUUID !== 'function') {
  problem('unsupported', '此浏览器缺少游戏所需的网页功能，请更新浏览器后重试。');
  return;
 }
 var slow = setTimeout(function () {
  problem('slow', '游戏加载较慢，请检查连接或重新加载。');
 }, 15000);
 import('./app.js?v=0.26.1').then(function () {
  clearTimeout(slow);
  panel.remove();
 }).catch(function (error) {
  clearTimeout(slow);
  problem('error', '游戏文件未能完整加载，请重新加载；本地使用请通过启动文件打开。', error);
 });
}());
