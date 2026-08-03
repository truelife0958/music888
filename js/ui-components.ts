import { FeedbackRenderOptions } from './types';

type IconButtonOptions = {
    className: string;
    iconClass: string;
    label: string;
    title?: string;
};

type MediaItemOptions = {
    className: string;
    imageClassName: string;
    imageUrl: string;
    imageAlt: string;
    bodyClassName: string;
    titleClassName: string;
    title: string;
    metaClassName?: string;
    meta?: string;
};

export function createIconButton(options: IconButtonOptions): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = options.className;
    button.title = options.title ?? options.label;
    button.setAttribute('aria-label', options.label);

    const icon = document.createElement('i');
    icon.className = options.iconClass;
    icon.setAttribute('aria-hidden', 'true');
    button.appendChild(icon);
    return button;
}

export function createMediaItem(options: MediaItemOptions): HTMLButtonElement {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = options.className;

    const image = document.createElement('img');
    image.className = options.imageClassName;
    image.src = options.imageUrl;
    image.alt = options.imageAlt;
    image.loading = 'lazy';
    image.decoding = 'async';

    const body = document.createElement('span');
    body.className = options.bodyClassName;
    const title = document.createElement('span');
    title.className = options.titleClassName;
    title.textContent = options.title;
    body.appendChild(title);

    if (options.meta && options.metaClassName) {
        const meta = document.createElement('span');
        meta.className = options.metaClassName;
        meta.textContent = options.meta;
        body.appendChild(meta);
    }

    item.append(image, body);
    return item;
}

export function createLoadMoreButton(onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'load-more-btn';

    const icon = document.createElement('i');
    icon.className = 'fas fa-plus-circle';
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = '加载更多';

    button.append(icon, label);
    button.addEventListener('click', onClick);
    return button;
}

export function createFeedbackState(options: FeedbackRenderOptions): HTMLDivElement {
    const stateClass: Record<FeedbackRenderOptions['state'], string> = {
        loading: 'loading',
        empty: 'empty-state',
        error: 'error',
    };
    const root = document.createElement('div');
    root.className = `feedback-state ${stateClass[options.state]}`;
    root.dataset.feedbackState = options.state;
    if (options.contentStyle) root.style.cssText = options.contentStyle;

    const icon = document.createElement('i');
    icon.className = options.iconClass;
    icon.setAttribute('aria-hidden', 'true');
    const message = document.createElement('div');
    message.className = 'feedback-state-message';
    message.textContent = options.message;
    root.append(icon, message);

    if (options.description) {
        const description = document.createElement('div');
        description.className = 'feedback-state-description';
        description.textContent = options.description;
        if (options.descriptionStyle) description.style.cssText = options.descriptionStyle;
        root.appendChild(description);
    }
    return root;
}
