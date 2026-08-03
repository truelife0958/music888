import { createFeedbackState, createIconButton, createLoadMoreButton, createMediaItem } from './ui-components';

describe('可复用 UI 组件', () => {
    it('图标按钮应补齐按钮类型和可访问名称', () => {
        const button = createIconButton({
            className: 'action-btn',
            iconClass: 'fas fa-play',
            label: '播放',
        });

        expect(button.type).toBe('button');
        expect(button.getAttribute('aria-label')).toBe('播放');
        expect(button.querySelector('i')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('媒体项目应安全写入内容并启用延迟加载与异步解码', () => {
        const item = createMediaItem({
            className: 'radio-item',
            imageClassName: 'radio-cover',
            imageUrl: 'https://example.com/cover.jpg',
            imageAlt: '<巡检封面>',
            bodyClassName: 'radio-info',
            titleClassName: 'radio-name',
            title: '<script>巡检</script>',
            metaClassName: 'radio-meta',
            meta: '2 期',
        });
        const image = item.querySelector('img');

        expect(item.querySelector('script')).toBeNull();
        expect(item.querySelector('.radio-name')?.textContent).toBe('<script>巡检</script>');
        expect(image?.loading).toBe('lazy');
        expect(image?.decoding).toBe('async');
    });

    it('加载更多按钮应复用统一结构并响应点击', () => {
        const onClick = vi.fn();
        const button = createLoadMoreButton(onClick);
        button.click();

        expect(button.className).toBe('load-more-btn');
        expect(button.textContent).toContain('加载更多');
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('反馈状态应通过文本节点渲染外部内容', () => {
        const feedback = createFeedbackState({
            state: 'error',
            message: '<img src=x onerror=alert(1)>',
            iconClass: 'fas fa-circle-exclamation',
        });

        expect(feedback.dataset.feedbackState).toBe('error');
        expect(feedback.querySelector('img')).toBeNull();
        expect(feedback.textContent).toContain('<img src=x onerror=alert(1)>');
    });
});
