import { Capacitor } from "@capacitor/core";

export function preLoadCheck(){
    const searchParams = new URLSearchParams(location.search);

    //@ts-ignore
    const isTauri = !!window.__TAURI_INTERNALS__
    //@ts-ignore
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
    
    
    // Redirect to the main page if the user has not visited the main page
    if(localStorage.getItem('mainpage') !== 'visited') {
        localStorage.setItem('mainpage', 'visited');
        location.replace('https://risuai.net');
        return false;
    }
    return true;
}