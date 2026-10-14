import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { showNotification } from './notifications';

/**
 * Live notifications for the admin panel: Laravel Echo listening to Laravel Reverb.
 *
 * Only the admin pages carry the Reverb key (layouts/app.blade.php), so the login page never connects.
 * Reverb is reached through nginx on the page's own host and port (path /app); the private "admin" channel is
 * authorized by /broadcasting/auth (routes/channels.php).
 */
const key = document.querySelector('meta[name="reverb-key"]')?.content;

if (key) {
    window.Pusher = Pusher;

    const secure = window.location.protocol === 'https:';
    const port = Number(window.location.port) || (secure ? 443 : 80);

    window.Echo = new Echo({
        broadcaster: 'reverb',
        key,
        wsHost: window.location.hostname,
        wsPort: port,
        wssPort: port,
        forceTLS: secure,
        enabledTransports: ['ws', 'wss'],
    });

    window.Echo.private('admin').listen('.order.updated', (order) => {
        showNotification({
            title: order.isNew ? `New order from ${order.customerName}` : `${order.customerName}'s order: ${order.status}`,
            body: order.total,
            url: order.url,
        });
    });
}
