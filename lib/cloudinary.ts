import { v2 as cloudinary } from 'cloudinary';

// 配置 Cloudinary 参数（优先读取环境变量，回退到用户配置凭证）
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
 * 将 Buffer 上传至 Cloudinary
 * @param buffer 文件二进制 Buffer
 * @param options 上传选项，包含存储目录、资源类型等
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  options: {
    folder?: string;
    resource_type?: 'image' | 'raw' | 'auto';
    filename?: string;
    timeoutMs?: number;
  } = {}
): Promise<CloudinaryUploadResult> {
  const timeoutMs = options.timeoutMs || 8000;

  return new Promise((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`Cloudinary 上传超时 (${timeoutMs}ms)`));
      }
    }, timeoutMs);

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'gengpeng_teaching',
        resource_type: options.resource_type || 'auto',
        use_filename: true,
        unique_filename: true,
      },
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
