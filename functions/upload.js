import { errorHandling, telemetryData } from "./utils/middleware";
export async function onRequestPost(context) {  // Contents of context object  
    const {
        request, // same as existing Worker API    
        env, // same as existing Worker API    
        params, // if filename includes [id] or [[path]]   
        waitUntil, // same as ctx.waitUntil in existing Worker API    
        next, // used for middleware or to fetch assets    
        data, // arbitrary space for passing data between middlewares 
    } = context;
    const cookies = request.headers.get('Cookie') || '';
    const cookiePassword = cookies.split(';').find(cookie => cookie.trim().startsWith('CFP_PASSWORD='));
    const extractedPassword = cookiePassword ? cookiePassword.split('=')[1].trim() : null;
    if (extractedPassword !== env.CFP_PASSWORD) {
        return new Response('Unauthorized: Invalid password', { status: 403 });
    }
    const clonedRequest = request.clone();
    await errorHandling(context);
    telemetryData(context);
    const url = new URL(clonedRequest.url);
    const response = fetch('https://img-proxy.tushangchuan.buzz/' + url.pathname + url.search, {
        method: clonedRequest.method,
        headers: clonedRequest.headers,
        body: clonedRequest.body,
    });
    return response;
}
