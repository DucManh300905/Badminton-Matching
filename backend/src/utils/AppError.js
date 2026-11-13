// Lỗi nghiệp vụ có chủ đích: controller / service chỉ cần `throw new AppError(...)`,
// errorHandler sẽ trả về { success: false, message, code, errors } với đúng status.
// Danh sách code: docs/API.md.
class AppError extends Error {
    /**
     * @param {number} status   Mã HTTP
     * @param {string} code     Mã lỗi máy đọc được, frontend dịch sang tiếng Việt
     * @param {string} message  Mô tả cho người đọc log / API
     * @param {{ field: string, msg: string }[]} [errors]  Lỗi theo từng trường
     */
    constructor(status, code, message, errors) {
        super(message);
        this.name = 'AppError';
        this.status = status;
        this.code = code;
        this.errors = errors;
    }
}

module.exports = AppError;
