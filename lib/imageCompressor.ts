/**
 * 客户端图片智能压缩与预处理工具
 * 针对微信聊天记录拖拽图片、手机实拍大图进行快速无损缩放和压缩，
 * 避免大文件触发反向代理 413 错误或上传超时
 */

export async function compressImageIfNeeded(file: File): Promise<File> {
  // 只处理图片类型，课件 PPT、PDF 等非图片文件原样返回
  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(file.name);
  if (!isImage) {
    return file;
  }

  // GIF 动图不压缩以保留动效
  if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) {
    return file;
  }

  // 小于 1MB 的图片无需压缩，直接上传
  if (file.size <= 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          const maxWidth = 1920;
          const maxHeight = 1920;
          let width = img.width;
          let height = img.height;

          // 等比例缩放至最大 1920px
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          // 白色背景防止透明通道变黑
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob || blob.size >= file.size) {
                resolve(file);
                return;
              }
              const newFileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
              const compressedFile = new File([blob], newFileName, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            0.82
          );
        } catch (err) {
          console.warn('Canvas compression error:', err);
          resolve(file);
        }
      };

      img.onerror = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    } catch {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(file);
    }
  });
}
