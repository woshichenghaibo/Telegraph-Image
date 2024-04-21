export async function onRequest(context) {
  // 假设你的图片存储在本地的 /local/images 目录下
  // 并且你有5张图片分别命名为 wallpaper1.jpg, wallpaper2.jpg, ..., wallpaper5.jpg
  const localImagePaths = [
    '/wallpaper1.png',
    'wallpaper1.png',
    'wallpaper1.png',
    'wallpaper4.jpg',
    'wallpaper5.jpg'
  ];

  // 读取本地图片的URL并准备返回的数据
  const bing_data = {
    images: localImagePaths.map((path, index) => ({
      url: path, // 本地图片的路径
      // 如果你的图片数据需要包含其他信息，如标题或描述，可以在这里添加
      title: `Wallpaper ${index + 1}`,
      // ... 其他需要的数据字段
    })),
  };

  const return_data = {
    status: true,
    message: "操作成功",
    data: bing_data,
  };

  const info = JSON.stringify(return_data);
  return new Response(info);
}
