/**
 * A small notification in the bottom-right corner, closed after 10 seconds.
 * Text is set with textContent, never as HTML: customer names come from outside.
 */
export function showNotification({ title, body, url }) {
    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto w-80 rounded-lg bg-white p-4 shadow-lg ring-1 ring-black/5';
    toast.setAttribute('role', 'status');

    const heading = document.createElement('p');
    heading.className = 'text-sm font-medium text-gray-900';
    heading.textContent = title;

    const text = document.createElement('p');
    text.className = 'mt-1 text-sm text-gray-600';
    text.textContent = body;

    toast.append(heading, text);

    if (url) {
        const link = document.createElement('a');
        link.className = 'mt-2 inline-block text-sm text-indigo-600 hover:text-indigo-900';
        link.href = url;
        link.textContent = 'View order';
        toast.append(link);
    }

    container().append(toast);
    setTimeout(() => toast.remove(), 10_000);
}

function container() {
    let element = document.getElementById('notifications');

    if (!element) {
        element = document.createElement('div');
        element.id = 'notifications';
        element.className = 'pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-3';
        document.body.append(element);
    }

    return element;
}
