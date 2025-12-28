<script lang="ts">
    import DOMPurify from 'dompurify';

    let {
        ico,
        className = 'w-5 h-5'
    }: {
        ico: {
            iconType:'html'|'img'|'none',
            icon:string
        },
        className?:string
    } = $props()

    const iconPurify = (icon:string) => {
        
        return DOMPurify.sanitize(icon, {
            FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
            FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'style', 'class']
        });
    }

    const isSafeSchema = (url:string) => {
        try {
            const parsedUrl = new URL(url);
            const allowedProtocols = ['http:', 'https:', 'data:', 'blob:'];
            if (allowedProtocols.includes(parsedUrl.protocol)) {
                return url;
            } else {
                console.warn(`Blocked URL with unsafe protocol: ${parsedUrl.protocol}`);
                return '';
            }
        } catch (e) {
            console.warn(`Invalid URL: ${url}`);
            return '';
        }
    }

</script>

<div class={className}>
    {#if ico.iconType === 'html'}
        {@html iconPurify(ico.icon)}
    {:else if ico.iconType === 'img'}
        <img src={isSafeSchema(ico.icon)} alt="icon" />
    {/if}
</div>