import { v2 as cloudinary } from 'cloudinary';

// 配置 Cloudinary 参数（优先读取环境变量，回退到系统内置凭证）
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'iy8eo8r1',
  api_key: process.env.CLOUDINARY_API_KEY || '451866264288452',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'phPc8y_Ub0UbeBLqq8fsKv7ASD8',
  secure: true,
});

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format?: string;
  bytes?: number;
}

/**
 * 将 Buffer 上传至 Cloudinary 永久云存储
 * 针对手机端上传（支持 HEIC/HEIF/高像素大图）：
 * 1. 自动转换图片为通用的 JPEG 格式，确保各类手机/微信/电脑端均能直接显示
 * 2. 优化超时时间至 60 秒，避免移动网络弱网时超时
 * 3. 失败时自动重试一次
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  options: {
    folder?: string;
    resource_type?: 'image' | 'raw' | 'auto';
    filename?: string;
    format?: string;
    timeoutMs?: number;
  } = {}
): Promise<CloudinaryUploadResult> {
  const timeoutMs = options.timeoutMs || 60000;
  const isImage = options.resource_type === 'image';
  const targetFormat = options.format || (isImage ? 'jpg' : undefined);

  const doUpload = (): Promise<CloudinaryUploadResult> => {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error(`Cloudinary 上传超时 (${timeoutMs}ms)`));
        }
      }, timeoutMs);

      const uploadOptions: Record<string, any> = {
        folder: options.folder || 'gengpeng_teaching',
        resource_type: options.resource_type || 'auto',
        use_filename: true,
        unique_filename: true,
      };

      // 对图片资源启用通用格式转换与规格优化，解决手机拍出的 HEIC/大图在其他浏览器打不开的问题
      if (targetFormat) {
        uploadOptions.format = targetFormat;
      }
      if (isImage) {
        uploadOptions.transformation = [
          { quality: 'auto:good' },
          { width: 2400, height: 2400, crop: 'limit' },
        ];
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          clearTimeout(timer);
          if (settled) return;
          settled = true;
          if (error || !result) {
            console.error('Cloudinary upload error:', error);
            reject(error || new Error('Cloudinary upload failed'));
          } else {
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
              format: result.format,
              bytes: result.bytes,
            });
          }
        }
      );

      uploadStream.end(buffer);
    });
  };

  try {
    return await doUpload();
  } catch (firstErr) {
    console.warn('First Cloudinary upload attempt failed, retrying once...', firstErr);
    return await doUpload();
  }
}

export async function deleteFromCloudinary(urlOrPublicId: string): Promise<boolean> {
  try {
    let publicId = urlOrPublicId;
    if (urlOrPublicId.startsWith('http')) {
      const match = urlOrPublicId.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
      if (match && match[1]) {
        publicId = match[1];
      }
    }
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (err) {
    console.warn('Cloudinary delete error (non-fatal):', err);
    return false;
  }
}

export default cloudinary;
