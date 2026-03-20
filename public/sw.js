/**
 * LUNA DIAL - Web Push Service Worker
 */

self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json()
      const title = data.title || 'Luna Dial 알림'
      const options = {
        body: data.body || '',
        icon: data.icon || '/icon-192x192.png',
        badge: data.badge || '/badge.png',
        image: data.image || undefined,
        tag: data.tag || 'lunadial-push', // 태그를 붙이면 동일 태그 알림은 겹쳐서 표시됨
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
          url: data.url || '/'
        },
      }
      event.waitUntil(self.registration.showNotification(title, options))
    } catch (e) {
      console.error('Push payload parsing error:', e)
      // 텍스트 기반 페이로드 방어 처리
      const text = event.data.text()
      event.waitUntil(
        self.registration.showNotification('Luna Dial', {
          body: text,
          icon: '/icon-192x192.png',
          data: { url: '/' }
        })
      )
    }
  }
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    let matchingClient = null

    for (let i = 0; i < windowClients.length; i++) {
        const windowClient = windowClients[i]
        if (windowClient.url === urlToOpen) {
            matchingClient = windowClient
            break
        }
    }

    if (matchingClient) {
        return matchingClient.focus()
    } else {
        return clients.openWindow(urlToOpen)
    }
  })

  event.waitUntil(promiseChain)
})
