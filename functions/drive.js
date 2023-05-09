export function onRequest(context) {
    const request = context.request
    return drive(request, context.env);
}

const encodedRedirectUri = encodeURIComponent("https://risuai.xyz/")

async function drive(request, env){

    const url = new URL(request.url);

    const headerE = {
        "Access-Control-Allow-Origin": "https://risuai.xyz",
        "Access-Control-Allow-Headers": "*"
    }
    
    const params = url.searchParams
    const code = params.get('code')
    if(!code){
        return new Response("No code provided", {
            status: 400,
            headers: headerE
        })
    }
    const resp = await fetch("https://oauth2.googleapis.com/token", {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `code=${code}&client_id=${env.CLIENT_ID}&client_secret=${env.CLIENT_SECRET}&redirect_uri=${encodedRedirectUri}&grant_type=authorization_code`
    })


    const json = await resp.json()

    if(json.access_token && json.expires_in){
        return new Response(JSON.stringify({
            access_token: json.access_token,
            expires_in: json.expires_in
        }), {
            status: 200,
            headers: headerE
        })
    }
    else{
        return new Response("Response Failed", {
            status: 400,
            headers: headerE
        })
    }
}