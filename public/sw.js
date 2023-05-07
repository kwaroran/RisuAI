// @ts-nocheck

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url)
    const path = url.pathname.split('/')
    if(path[1] === 'sw'){
        try {
            switch (path[2]){
                case "check":{
                    event.respondWith(checkCache(url))
                    break
                }
                case "img": {
                    event.respondWith(getImg(url))
                    break
                }
                case "register": {
                    event.respondWith(registerCache(url, event.request.arrayBuffer()))
                    break
                }
                case "init":{
                    event.respondWith(new Response("true"))
                }
                default: {
                    event.respondWith(new Response(
                        path[2]
                    ))
                }
            }
        } catch (error) {
            event.respondWith(new Response(`${error}`))
        }
    }
})


async function checkCache(url){
    const cache = await caches.open('risuCache')

    return new Response(JSON.stringify({
        "able": !!(await cache.match(url))
    }))
}

async function getImg(url){
    const cache = await caches.open('risuCache')
    return await cache.match(url)
}

async function check(){

}

async function registerCache(urlr, buffer){
    const cache = await caches.open('risuCache')
    const url = new URL(urlr)
    let path = url.pathname.split('/')
    path[2] = 'img'
    url.pathname = path.join('/')
    const buf = new Uint8Array(await buffer)
    await cache.put(url, new Response(buf, {
        headers: {
            "cache-control": "max-age=604800",
            "content-type": "image/png"
        }
    }))
    return new Response(JSON.stringify({
        "done": true
    }))
}