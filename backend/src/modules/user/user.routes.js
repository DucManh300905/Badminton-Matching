const express = require('express');

const { authenticate } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { getMe, updateMe } = require('./user.controller');
const { displayNameRule, genderRule, levelRule } = require('./user.rules');
const { listMyPosts } = require('../post/post.controller');

const router = express.Router();

router.use(authenticate);

router.get('/me', getMe);
router.put(
    '/me',
    [displayNameRule({ optional: true }), genderRule({ optional: true }), levelRule({ optional: true })],
    validate,
    updateMe
);
router.get('/me/posts', listMyPosts);

module.exports = router;
