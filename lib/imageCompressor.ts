/**
 * 客户端图片智能压缩与预处理工具
 * 针对手机拍照大图（10MB~20MB）、微信截图等进行快速前置压缩与格式归一化：
 * 1. 自动等比缩放至最大 1920px 宽/高，质量 0.82，将 10MB+ 实拍图压缩至约 300KB~600KB
 * 2. 解决大文件在手机 4G/5G 弱网下上传超时的问题
 * 3. 针对 iPhone HEIC 格式及无法客户端解码的情况，自动优雅回退并由服务端云存储自动转换
 * 4. 内置安全超时（3.5 秒），防止低配移动设备在 Canvas 渲染时卡死
 */
export async function compressImageIfNeeded(file: File): Promise<File> {
  // 只处理图片类型，课件 PPT、PDF 等非图片文件原样返回
  const fileNameLower = file.name.toLowerCase();
  const isImage =
    file.type.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|bmp|gif|heic|heif)$/i.test(fileNameLower);

  if (!isImage) {
    return file;
  }

  // GIF 动图不压缩以保留动效
  if (file.type === 'image/gif' || fileNameLower.endsWith('.gif')) {
    return file;
  }

  // 如果已经是小于 600KB 的小图，无需再压缩，直接返回
  if (file.size <= 600 * 1024) {
    return file;
  }

  // 针对明显是 iOS HEIC/HEIF 的文件，大部分移动浏览器端 Canvas 不支持直接解码，直接交给云端处理
  if (
    fileNameLower.endsWith('.heic') ||
    fileNameLower.endsWith('.heif') ||
    file.type.includes('heic') ||
    file.type.includes('heif')
  ) {
    return file;
  }

  return new Promise((resolve) => {
    let resolved = false;
    const finish = (result: File) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
    };

    // 移动端安全熔断：如果 3.5 秒内由于移动端内存限制无法完成 Canvas 渲染，直接上传原文件
    const timer = setTimeout(() => {
      finish(file);
    }, 3500);

    const maxWidth = 1920;
    const maxHeight = 1920;

    // 优先尝试现代浏览器的 createImageBitmap（支持硬件加速且内存占用极低）
    if (typeof createImageBitmap === 'function') {
      createImageBitmap(file)
        .then((bitmap) => {
          try {
            let width = bitmap.width;
            let height = bitmap.height;

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
              clearTimeout(timer);
              finish(file);
              return;
            }

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(bitmap, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                clearTimeout(timer);
                if (!blob || blob.size >= file.size) {
                  finish(file);
                  return;
                }
                const newFileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
                const compressedFile = new File([blob], newFileName, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                finish(compressedFile);
              },
              'image/jpeg',
              0.82
            );
          } catch {
            clearTimeout(timer);
            finish(file);
          }
        })
        .catch(() => {
          fallbackWithImageElement();
        });
      return;
    }

    fallbackWithImageElement();

    function fallbackWithImageElement() {
      let objectUrl = '';
      try {
        objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          try {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;

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
              clearTimeout(timer);
              finish(file);
              return;
            }

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                clearTimeout(timer);
                if (!blob || blob.size >= file.size) {
                  finish(file);
                  return;
                }
                const newFileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
                const compressedFile = new File([blob], newFileName, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                finish(compressedFile);
              },
              'image/jpeg',
              0.82
            );
          } catch {
            clearTimeout(timer);
            finish(file);
          }
        };

        img.onerror = () => {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          clearTimeout(timer);
          finish(file);
        };

        img.src = objectUrl;
      } catch {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        clearTimeout(timer);
        finish(file);
      }
    }
  });
}
