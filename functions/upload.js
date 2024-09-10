import { errorHandling, telemetryData } from "./utils/middleware";
import { v4 as uuidv4 } from 'uuid';

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
    
    const formData = await parseMultipartFormData(clonedRequest);

    if (!formData || !formData.file) {
        return new Response('No file uploaded', { status: 400 });
    }
    const { fileName, fileContent } = formData.file;

    const fileId = uuidv4().replace(/-/g, '');
    const fileExtension = fileName.split('.').pop();
    const newFileName = `/file/v1/${fileId}.${fileExtension}`;
   
    try{
        await env.img_static.put(newFileName,fileContent);
    }catch(error){
        return new Response(`Upload fail`, { status: 400 });
    }
    return new Response(`[{\"src\":\"${newFileName}\"}]`);
}

async function parseMultipartFormData(request) {
    const contentType = request.headers.get('Content-Type') || '';
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    if (!boundaryMatch) {
        return null;
    }

    const boundary = boundaryMatch[1];
    const reader = request.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let formData = {};


    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split(`--${boundary}`);
        buffer = parts.pop() || '';

        for (const part of parts) {
            const [headersPart, body] = part.split('\r\n\r\n');
            if (headersPart && body) {
                const headers = headersPart.split('\r\n');
                const contentDispositionHeader = headers.find(header => header.startsWith('Content-Disposition:'));
                if (contentDispositionHeader) {
                    const fileNameMatch = contentDispositionHeader.match(/filename="(.+?)"/);
                    if (fileNameMatch) {
                        const fileName = fileNameMatch[1];
                        formData.file = { fileName, fileContent: body.slice(0, -2) };
                    }
                }
            }
        }
    }

    return formData;
}
