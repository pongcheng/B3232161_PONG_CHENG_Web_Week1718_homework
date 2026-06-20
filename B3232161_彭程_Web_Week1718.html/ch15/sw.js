// 監聽install事件
self.addEventListener("install", (e) => {
    console.log("install.");
	self.skipWaiting();
});
// 監聽activate事件
self.addEventListener("activate", (e) => {
    console.log("activate.");
});
// 監聽fetch事件
self.addEventListener('fetch', (e) => {
	console.log("fetch");
});