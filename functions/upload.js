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
    
    const formData = await parseMultipartFormData(clonedRequest);

    if (!formData || !formData.file) {
        return new Response('No file uploaded', { status: 400 });
    }
    const { fileName, fileContent, contentType } = formData.file;

    const fileId = new Date().getTime();
    const fileExtension = fileName.split('.').pop();
    const key=fileId+"."+fileExtension;
    const newFilePath=`/file/v1/${key}`
    try{
        await env.img_static.put(key, fileContent, {
            metadata: { contentType }
        });       
        // await env.img_url.put(key, "", {
        //     metadata: { ListType: "None", Label: "None", TimeStamp: fileId },
        // });  
     }catch(error){
        return new Response(`Upload fail`, { status: 400 });
    }
    return new Response(`[{\"src\":\"${newFilePath}\"}]`);
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
            if (part.trim() === '' || part.startsWith('--')) continue;

            const [headersPart, body] = part.split('\r\n\r\n');
            if (headersPart && body) {
                const headers = headersPart.split('\r\n');
                const contentDispositionHeader = headers.find(header => header.startsWith('Content-Disposition:'));
                const contentTypeHeader = headers.find(header => header.startsWith('Content-Type:'));
                
                if (contentDispositionHeader) {
                    const fileNameMatch = contentDispositionHeader.match(/filename="(.+?)"/);
                    if (fileNameMatch) {
                        const fileName = fileNameMatch[1];
                        formData.file = { 
                            fileName, 
                            fileContent: body.slice(0, -2), 
                            contentType: contentTypeHeader ? contentTypeHeader.split(':')[1].trim() : 'application/octet-stream' 
                        };
                    }
                }
            }
        }
    }

    return formData;
}
