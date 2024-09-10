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
    if (env.CFP_PASSWORD && extractedPassword !== env.CFP_PASSWORD) {
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
    const newFilePath=`/file/${key}`;
    console.log(newFilePath);
    console.log(contentType);
    try{
        await env.img_static.put(newFilePath, fileContent, {
            metadata: { 
                'Content-Type': contentType
            }
        });       
        await env.img_url.put(key, "", {
            metadata: { ListType: "None", Label: "None", TimeStamp: fileId },
        });  
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

    const boundary = `--${boundaryMatch[1]}`;
    const reader = request.body.getReader();
    let chunks = [];
    let formData = {};

    // Read all chunks of the request body
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }

    // Combine all chunks into one Uint8Array
    const body = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.length;
    }

    // Convert Uint8Array to string for parsing headers and form fields
    const textBody = new TextDecoder().decode(body);
    const parts = textBody.split(boundary);

    for (const part of parts) {
        if (part.trim() === '' || part.startsWith('--')) continue;

        const [headersPart, bodyContent] = part.split('\r\n\r\n');
        if (headersPart && bodyContent) {
            const headers = headersPart.split('\r\n');
            const contentDispositionHeader = headers.find(header => header.startsWith('Content-Disposition:'));
            const contentTypeHeader = headers.find(header => header.startsWith('Content-Type:'));

            if (contentDispositionHeader) {
                const fileNameMatch = contentDispositionHeader.match(/filename="(.+?)"/);
                if (fileNameMatch) {
                    const fileName = fileNameMatch[1];
                    const contentType = contentTypeHeader ? contentTypeHeader.split(':')[1].trim() : 'application/octet-stream';

                    // Convert bodyContent to binary data (fileContent)
                    const start = textBody.indexOf(bodyContent);
                    const fileContent = body.slice(start, start + bodyContent.length);

                    formData.file = { fileName, fileContent, contentType };
                }
            }
        }
    }

    return formData;
}
