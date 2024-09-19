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

    // 固定的图片URL
    const fixedImageUrl = 'https://img.guao.de/i/189Cloud/ImgBed/2024/09/19/llr1ae.jpg';

    // 创建一个包含固定图片URL的images数组
    const bing_data = {
        images: [
            { url: fixedImageUrl }
        ]
    };

    const return_data = {
        "status": true,
        "message": "操作成功",
        "data": bing_data.images
    };

    const info = JSON.stringify(return_data);
    return new Response(info, {
        headers: { 'content-type': 'application/json' }
    });
}
