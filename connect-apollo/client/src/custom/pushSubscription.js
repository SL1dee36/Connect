// client/src/pushSubscription.js

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerPushNotifications(token) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Получаем публичный ключ от сервера (index.js)
    const response = await fetch(`${BACKEND_URL}/vapid-key`);
    const { publicKey } = await response.json();

    const convertedVapidKey = urlBase64ToUint8Array(publicKey);

    // Спрашиваем разрешение у пользователя (браузер покажет промпт)
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    // Отправляем подписку на сервер
    await fetch(`${BACKEND_URL}/subscribe`, {
      method: 'POST',
      body: JSON.stringify(subscription),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Push Subscribed!');

  } catch (error) {
    console.error('Push Error:', error);
  }
}