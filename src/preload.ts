import { Capacitor } from "@capacitor/core";

export function preLoadCheck(){
    const searchParams = new URLSearchParams(location.search);

    //@ts-ignore
    const isTauri = !!window.__TAURI__
    //@ts-ignore
    const isNodeServer = !!globalThis.__NODE__
    const isCapacitor = Capacitor.isNativePlatform();

    const isWeb = !isTauri && !isNodeServer && location.hostname !== 'risuai.xyz' && !isCapacitor;
    
    
    // Check if the user has visited the main page
    if(!isWeb) {
        localStorage.setItem('mainpage', 'visited');
    }
    else if(searchParams.has('mainpage')) {
        localStorage.setItem('mainpage', searchParams.get('main-page'));
    }
    
    
    // Redirect to the main page if the user has not visited the main page
    if(localStorage.getItem('mainpage') !== 'visited') {
        localStorage.setItem('mainpage', 'visited');
        location.replace('https://risuai.net');
        return false;
    }
    return true;
}