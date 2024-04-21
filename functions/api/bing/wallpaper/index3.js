import fs from 'fs/promises';
import path from 'path';

export async function onRequest(context) {
  // 假设本地图片和元数据存储路径
  const localImagePath = '/;
  const imagesInfo = [];

  try {
    // 遍历本地图片目录，模拟从API获取的5张图片信息
    const files = await fs.readdir(localImagePath);
    for (let i = 0; i < 5; i++) {
      const fileName = files[i];
      const filePath = path.join(localImagePath, fileName);

      // 获取本地图片的基本元数据
      const fileStat = await fs.stat(filePath);
      if (!fileStat.isFile()) continue;

      // 模拟从Bing获取的图片信息
      const imageInfo = {
        startdate: new Date().toISOString(), // 使用当前日期替换实际开始日期
        fullstartdate: new Date().toISOString(),
        enddate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 结束日期为当前日期后一天
        url: `/bing_wallpapers/${fileName}`,
        urlbase: `/th?id=OHR.LocalImage_${i}_ZH-CN`, // 本地图片ID模拟
        copyright: 'Local Image Copyright Info', // 替换为本地图片的实际版权信息
        copyrightlink: `https://example.com/local-image-${i}`, // 替换为指向版权详细信息的链接
        title: '本地图片标题', // 替换为本地图片的实际标题
        quiz: '', // 如果不需要在线问答环节，可以留空
        wp: true,
        hsh: 'local_hash', // 这里可以用某种哈希函数生成实际哈希值
        drk: 1,
        top: 1,
        bot: 1,
        hs: [],
      };

      imagesInfo.push(imageInfo);
    }

    const return_data = {
      status: true,
      message: "操作成功",
      data: imagesInfo,
    };
    const info = JSON.stringify(return_data);

    return new Response(info);
  } catch (error) {
    console.error('Error fetching local images:', error);
    return new Response(JSON.stringify({
      status: false,
      message: "操作失败：无法读取本地图片资源",
      data: null,
    }), { status: 500 });
  }
}
