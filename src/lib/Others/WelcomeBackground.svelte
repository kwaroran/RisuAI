<script lang="ts">
    // Procedural night forest drawn in SVG. Seeded so the scene is identical on every load.
    const W = 1600
    const H = 900

    function seeded(seed: number){
        return () => {
            seed |= 0
            seed = seed + 0x6D2B79F5 | 0
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
            return ((t ^ t >>> 14) >>> 0) / 4294967296
        }
    }
    const rand = seeded(1013)

    type Layer = {
        base: number
        waves: [number, number, number][]
        fill: string
        treeHeight: [number, number]
        treeGap: number
    }

    const layers: Layer[] = [
        { base: 560, waves: [[40, 0.0021, 0.4], [18, 0.006, 1.7]], fill: '#1d3f63', treeHeight: [60, 110], treeGap: 26 },
        { base: 640, waves: [[34, 0.0028, 2.1], [14, 0.008, 0.3]], fill: '#15304f', treeHeight: [90, 160], treeGap: 38 },
        { base: 730, waves: [[30, 0.0024, 4.2], [12, 0.009, 2.6]], fill: '#0f223c', treeHeight: [130, 230], treeGap: 58 },
        { base: 830, waves: [[26, 0.0032, 1.1], [10, 0.011, 5.0]], fill: '#09162a', treeHeight: [200, 340], treeGap: 96 },
    ]

    function hillY(layer: Layer, x: number){
        return layer.waves.reduce((y, [amp, freq, phase]) => y + Math.sin(x * freq + phase) * amp, layer.base)
    }

    function hillPath(layer: Layer){
        let d = `M 0 ${H} L 0 ${hillY(layer, 0).toFixed(1)}`
        for(let x = 20; x <= W; x += 20){
            d += ` L ${x} ${hillY(layer, x).toFixed(1)}`
        }
        return d + ` L ${W} ${H} Z`
    }

    function pine(x: number, y: number, h: number){
        const w = h * 0.42
        let d = ''
        for(let t = 0; t < 3; t++){
            const apex = y - h + t * h * 0.24
            const bottom = apex + h * 0.46
            const half = w * (0.28 + t * 0.12)
            d += ` M ${x} ${apex} Q ${x + half * 0.4} ${bottom - h * 0.2} ${x + half} ${bottom} Q ${x} ${bottom - h * 0.05} ${x - half} ${bottom} Q ${x - half * 0.4} ${bottom - h * 0.2} ${x} ${apex} Z`
        }
        return d
    }

    const scene = layers.map((layer) => {
        let trees = ''
        for(let x = -20; x < W + 40; x += layer.treeGap * (0.6 + rand() * 0.9)){
            if(rand() < 0.18){
                continue
            }
            const [min, max] = layer.treeHeight
            trees += pine(x, hillY(layer, x) + 6, min + rand() * (max - min)) + ' '
        }
        return { fill: layer.fill, hill: hillPath(layer), trees }
    })

    const stars = Array.from({ length: 90 }, () => ({
        x: rand() * W,
        y: rand() * 420,
        r: 0.6 + rand() * 1.4,
        delay: rand() * 6,
    }))

    const fireflies = Array.from({ length: 34 }, () => ({
        x: rand() * W,
        y: 420 + rand() * 440,
        r: 1.6 + rand() * 2.6,
        color: rand() < 0.3 ? '#f9a8d4' : rand() < 0.5 ? '#99f6e4' : '#fde68a',
        delay: rand() * 8,
        duration: 6 + rand() * 6,
    }))

    const flowers = Array.from({ length: 60 }, () => ({
        x: rand() * W,
        y: 850 + rand() * 50,
        r: 2 + rand() * 3.5,
        color: rand() < 0.6 ? '#f472b6' : '#5eead4',
    }))
</script>

<svg class="absolute inset-0 h-full w-full" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs>
        <linearGradient id="welcome-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#070b1f" />
            <stop offset="0.45" stop-color="#16285a" />
            <stop offset="0.75" stop-color="#1f5c6e" />
            <stop offset="1" stop-color="#2b8a8a" />
        </linearGradient>
        <radialGradient id="welcome-moon-glow">
            <stop offset="0" stop-color="#fef9e7" stop-opacity="0.55" />
            <stop offset="1" stop-color="#fef9e7" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="welcome-path-glow" cx="0.5" cy="1" r="0.6">
            <stop offset="0" stop-color="#99f6e4" stop-opacity="0.35" />
            <stop offset="1" stop-color="#99f6e4" stop-opacity="0" />
        </radialGradient>
        <mask id="welcome-crescent">
            <circle cx="1240" cy="190" r="62" fill="white" />
            <circle cx="1268" cy="172" r="54" fill="black" />
        </mask>
        <filter id="welcome-blur-lg" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="60" />
        </filter>
        <filter id="welcome-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="3" />
        </filter>
    </defs>

    <rect width={W} height={H} fill="url(#welcome-sky)" />

    <g filter="url(#welcome-blur-lg)" opacity="0.5">
        <ellipse class="aurora" cx="520" cy="230" rx="420" ry="90" fill="#5eead4" />
        <ellipse class="aurora aurora-delay" cx="1050" cy="170" rx="380" ry="70" fill="#a78bfa" />
    </g>

    {#each stars as star}
        <circle class="star" cx={star.x} cy={star.y} r={star.r} fill="#e0f2fe" style:animation-delay={`${star.delay}s`} />
    {/each}

    <circle cx="1240" cy="190" r="170" fill="url(#welcome-moon-glow)" />
    <circle cx="1240" cy="190" r="62" fill="#fef9e7" mask="url(#welcome-crescent)" />

    <ellipse cx="800" cy="900" rx="700" ry="420" fill="url(#welcome-path-glow)" />

    {#each scene as layer}
        <path d={layer.hill} fill={layer.fill} />
        <path d={layer.trees} fill={layer.fill} />
    {/each}

    {#each flowers as flower}
        <circle cx={flower.x} cy={flower.y} r={flower.r} fill={flower.color} opacity="0.75" />
    {/each}

    <g filter="url(#welcome-glow)">
        {#each fireflies as fly}
            <circle class="firefly" cx={fly.x} cy={fly.y} r={fly.r} fill={fly.color} style:animation-delay={`${fly.delay}s`} style:animation-duration={`${fly.duration}s`} />
        {/each}
    </g>
</svg>

<style>
    .star{
        animation: twinkle 4s ease-in-out infinite;
    }
    @keyframes twinkle {
        0%, 100% {
            opacity: 0.9;
        }
        50% {
            opacity: 0.2;
        }
    }

    .aurora{
        animation: aurora 16s ease-in-out infinite alternate;
    }
    .aurora-delay{
        animation-delay: -8s;
    }
    @keyframes aurora {
        from {
            transform: translateX(-60px);
        }
        to {
            transform: translateX(60px);
        }
    }

    .firefly{
        transform-box: fill-box;
        animation-name: drift;
        animation-timing-function: ease-in-out;
        animation-iteration-count: infinite;
        animation-direction: alternate;
    }
    @keyframes drift {
        0% {
            opacity: 0.15;
            transform: translate(0, 0);
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0.3;
            transform: translate(18px, -26px);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .star, .aurora, .firefly{
            animation: none;
        }
    }
</style>
