const express = require('express');

const { authenticate } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { getMe, updateMe, setBankAccount, deleteBankAccount, setAvatar, deleteAvatar, setTabBar } = require('./user.controller');
const { receiveImage } = require('../../utils/images');
const { displayNameRule, genderRule, levelRule, bankAccountRules, tabBarRules } = require('./user.rules');
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
router.put('/me/bank-account', bankAccountRules(), validate, setBankAccount);
router.delete('/me/bank-account', deleteBankAccount);
router.put('/me/avatar', receiveImage, setAvatar);
router.delete('/me/avatar', deleteAvatar);
router.put('/me/tab-bar', tabBarRules(), validate, setTabBar);

module.exports = router;
