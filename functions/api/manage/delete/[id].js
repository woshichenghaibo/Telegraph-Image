function isFileNameAllDigits(filePath) {
  const fileName = filePath.split('.').shift(); 
  const isAllDigits = /^\d+$/.test(fileName);
  return isAllDigits;
}

export async function onRequest(context) {
    // Contents of context object
    const {
      request, // same as existing Worker API
      env, // same as existing Worker API
      params, // if filename includes [id] or [[path]]
      waitUntil, // same as ctx.waitUntil in existing Worker API
      next, // used for middleware or to fetch assets
      data, // arbitrary space for passing data between middlewares
    } = context;
    console.log(env)
    console.log(params.id)
    await env.img_url.delete(params.id);
    if(isFileNameAllDigits(params.id)){
        await env.img_static.delete("/file/"+params.id);
    }
    const info = JSON.stringify(params.id);
    return new Response(info);

  }
