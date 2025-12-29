import { Capacitor } from "@capacitor/core";

export function preLoadCheck(){
    const searchParams = new URLSearchParams(location.search);

    //@ts-expect-error __TAURI_INTERNALS__ is injected by Tauri runtime, not defined in Window interface
    const isTauri = !!window.__TAURI_INTERNALS__
    const isNodeServer = !!globalThis.__NODE__
    const isCapacitor = Capacitor.isNativePlatform();

    const isWeb = !isTauri && !isNodeServer && location.hostname === 'risuai.xyz' && !isCapacitor;
    
    
    // Check if the user has visited the main page
    if(!isWeb) {
        localStorage.setItem('mainpage', 'visited');
    }
    else if(searchParams.has('mainpage')) {
        localStorage.setItem('mainpage', searchParams.get('mainpage'));
    }

    if(isWeb) {
        //Add beforeunload event listener to prevent the user from leaving the page
        window.addEventListener('beforeunload', (e) => {
            e.preventDefault()
            //legacy browser
            e.returnValue = true
        })
    }
    
    return true;
}