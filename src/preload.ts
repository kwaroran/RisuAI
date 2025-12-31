import { isWeb } from "./ts/platform";

export function preLoadCheck(){
    const searchParams = new URLSearchParams(location.search);

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