// Ảnh do người dùng tải lên: ảnh đại diện, ảnh bìa kèo (WBS 4.9).
// - Nhận file trong bộ nhớ (multer), tối đa 5 MB, chỉ JPEG / PNG / WebP — kiểm tra bằng NỘI DUNG file (sharp), không tin đuôi file.
// - Xoay đúng chiều theo EXIF, cắt + thu nhỏ, đổi sang WebP. sharp mặc định BỎ toàn bộ metadata (EXIF, GPS…) khi xuất:
//   ảnh chụp bằng điện thoại không còn lộ vị trí (rủi ro R6).
// - Tên file ngẫu nhiên; lưu ở UPLOAD_DIR (ngoài repo), Nginx phục vụ qua /uploads/<loại>/<tên>.
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const AppError = require('./AppError');

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_FORMATS = ['jpeg', 'png', 'webp'];

/** Kích thước đầu ra theo loại ảnh */
const KINDS = {
    avatars: { width: 256, height: 256 },
    covers: { width: 1200, height: 630 },
    // Ảnh bill / hóa đơn (WBS 4.11): giữ nguyên tỉ lệ để đọc được chữ, cạnh dài tối đa 1600
    bills: { width: 1600, height: 1600, fit: 'inside' },
    // Ảnh chụp màn hình chuyển khoản (WBS 4.14): chỉ chủ kèo và người gửi xem
    proofs: { width: 1600, height: 1600, fit: 'inside' }
};

const FILE_NAME = /^[a-f0-9]{32}\.webp$/;

const uploadDir = () => process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');

/** Đường dẫn công khai của ảnh, null nếu không có */
const publicUrl = (kind, fileName) => (fileName ? `/uploads/${kind}/${fileName}` : null);

/**
 * Middleware nhận đúng 1 file ở trường "image". Lỗi của multer được đổi thành AppError tiếng Việt.
 */
const receiveImage = (req, res, next) => {
    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 }
    }).single('image');

    upload(req, res, (err) => {
        if (!err) return next();
        if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new AppError(413, 'FILE_TOO_LARGE', 'Ảnh tối đa 5 MB'));
        }
        return next(new AppError(400, 'INVALID_IMAGE', 'Tải ảnh không thành công, chỉ gửi một file ở trường "image"'));
    });
};

/**
 * Kiểm tra, xử lý và lưu ảnh. Trả về tên file mới.
 * @param {'avatars' | 'covers' | 'bills' | 'proofs'} kind
 * @param {Buffer | undefined} buffer
 */
const saveImage = async (kind, buffer) => {
    if (!buffer || buffer.length === 0) {
        throw new AppError(400, 'INVALID_IMAGE', 'Chưa chọn ảnh');
    }

    let meta;
    try {
        meta = await sharp(buffer).metadata();
    } catch {
        meta = null;
    }
    if (!meta || !ALLOWED_FORMATS.includes(meta.format)) {
        throw new AppError(400, 'INVALID_IMAGE', 'Chỉ nhận ảnh JPEG, PNG hoặc WebP');
    }

    const { width, height, fit = 'cover' } = KINDS[kind];
    const output = await sharp(buffer, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize(width, height, fit === 'cover' ? { fit, position: 'attention' } : { fit, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

    const fileName = `${crypto.randomBytes(16).toString('hex')}.webp`;
    const dir = path.join(uploadDir(), kind);
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, fileName);
    await fs.writeFile(file, output);
    // Nginx (www-data) phục vụ thư mục này trên máy chủ: đặt quyền đọc rõ ràng, không phụ thuộc umask của PM2
    await fs.chmod(file, 0o644);
    return fileName;
};

/** Xóa ảnh cũ; bỏ qua nếu không còn file. Chỉ xóa đúng dạng tên do saveImage tạo (chống xóa nhầm file khác). */
const removeImage = async (kind, fileName) => {
    if (!fileName || !FILE_NAME.test(fileName)) return;
    await fs.rm(path.join(uploadDir(), kind, fileName), { force: true });
};

module.exports = {
    MAX_UPLOAD_BYTES,
    KINDS,
    uploadDir,
    publicUrl,
    receiveImage,
    saveImage,
    removeImage
};
