const asyncHandler = require('../../utils/asyncHandler');
const postService = require('./post.service');
const { toPostSummary, toPostDetail } = require('./post.serializer');

// GET /api/posts?district=&date=YYYY-MM-DD&level= — kèo sắp diễn ra, không cần đăng nhập
const listPosts = asyncHandler(async (req, res) => {
    const { district, date, level } = req.query;
    const posts = await postService.listPosts({ district, date, level }, new Date());

    res.json({ success: true, data: posts.map(toPostSummary) });
});

// GET /api/users/me/posts — kèo tôi đã đăng và đã tham gia
const listMyPosts = asyncHandler(async (req, res) => {
    const { authored, joined } = await postService.listMyPosts(req.user.userId);

    res.json({
        success: true,
        data: { authored: authored.map(toPostSummary), joined: joined.map(toPostSummary) }
    });
});

// GET /api/posts/:id — không cần đăng nhập
const getPost = asyncHandler(async (req, res) => {
    const post = await postService.getPost(req.params.id);

    res.json({ success: true, data: toPostDetail(post, req.user?.userId) });
});

// POST /api/posts
const createPost = asyncHandler(async (req, res) => {
    const post = await postService.createPost(req.user.userId, req.body, new Date());

    res.status(201).json({ success: true, message: 'Đăng kèo thành công', data: toPostDetail(post, req.user.userId) });
});

// POST /api/posts/:id/join
const joinPost = asyncHandler(async (req, res) => {
    const post = await postService.joinPost(req.params.id, req.user, new Date());

    res.json({ success: true, message: 'Tham gia kèo thành công', data: toPostDetail(post, req.user.userId) });
});

// DELETE /api/posts/:id/join
const leavePost = asyncHandler(async (req, res) => {
    const post = await postService.leavePost(req.params.id, req.user.userId, new Date());

    res.json({ success: true, message: 'Đã rời kèo', data: toPostDetail(post, req.user.userId) });
});

// POST /api/posts/:id/cancel — chỉ chủ kèo (BR-13)
const cancelPost = asyncHandler(async (req, res) => {
    const post = await postService.cancelPost(req.params.id, req.user.userId, new Date());

    res.json({ success: true, message: 'Đã hủy kèo', data: toPostDetail(post, req.user.userId) });
});

// PATCH /api/posts/:id/participants/:userId/payment — chủ kèo đánh dấu đã / chưa trả (BR-14)
const setPaid = asyncHandler(async (req, res) => {
    const { paid } = req.body;
    const post = await postService.setPaid(req.params.id, req.user.userId, req.params.userId, paid, new Date());

    res.json({
        success: true,
        message: paid ? 'Đã đánh dấu đã trả' : 'Đã bỏ đánh dấu',
        data: toPostDetail(post, req.user.userId)
    });
});

// PUT /api/posts/:id/costs — chủ kèo lưu các khoản chi + bạn không dùng app (BR-16, BR-17)
const updateCosts = asyncHandler(async (req, res) => {
    const { guests, expenses } = req.body;
    const post = await postService.updateCosts(req.params.id, req.user.userId, { guests, expenses }, new Date());

    res.json({ success: true, message: 'Đã lưu chi phí', data: toPostDetail(post, req.user.userId) });
});

// PUT /api/posts/:id/attendance — chủ kèo điểm danh, từ giờ bắt đầu
const setAttendance = asyncHandler(async (req, res) => {
    const post = await postService.setAttendance(req.params.id, req.user.userId, { attendance: req.body.attendance }, new Date());

    res.json({ success: true, message: 'Đã lưu điểm danh', data: toPostDetail(post, req.user.userId) });
});

module.exports = {
    updateCosts,
    setAttendance,
    setPaid,
    listPosts,
    listMyPosts,
    getPost,
    createPost,
    joinPost,
    leavePost,
    cancelPost
};
