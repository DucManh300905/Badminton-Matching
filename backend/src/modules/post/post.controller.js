const asyncHandler = require('../../utils/asyncHandler');
const postService = require('./post.service');
const { toPostSummary, toPostDetail } = require('./post.serializer');

// GET /api/posts?district=&date=YYYY-MM-DD&level= — kèo sắp diễn ra, không cần đăng nhập
const listPosts = asyncHandler(async (req, res) => {
    const { district, date, level } = req.query;
    const posts = await postService.listPosts({ district, date, level }, new Date());

    res.json({ success: true, data: posts.map(toPostSummary) });
});

// GET /api/posts/:id — không cần đăng nhập
const getPost = asyncHandler(async (req, res) => {
    const post = await postService.getPost(req.params.id);

    res.json({ success: true, data: toPostDetail(post) });
});

// POST /api/posts
const createPost = asyncHandler(async (req, res) => {
    const post = await postService.createPost(req.user.userId, req.body, new Date());

    res.status(201).json({ success: true, message: 'Đăng kèo thành công', data: toPostDetail(post) });
});

// POST /api/posts/:id/join
const joinPost = asyncHandler(async (req, res) => {
    const post = await postService.joinPost(req.params.id, req.user, new Date());

    res.json({ success: true, message: 'Tham gia kèo thành công', data: toPostDetail(post) });
});

// DELETE /api/posts/:id/join
const leavePost = asyncHandler(async (req, res) => {
    const post = await postService.leavePost(req.params.id, req.user.userId, new Date());

    res.json({ success: true, message: 'Đã rời kèo', data: toPostDetail(post) });
});

// POST /api/posts/:id/cancel — chỉ chủ kèo (BR-13)
const cancelPost = asyncHandler(async (req, res) => {
    const post = await postService.cancelPost(req.params.id, req.user.userId, new Date());

    res.json({ success: true, message: 'Đã hủy kèo', data: toPostDetail(post) });
});

module.exports = {
    listPosts,
    getPost,
    createPost,
    joinPost,
    leavePost,
    cancelPost
};
