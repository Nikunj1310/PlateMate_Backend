'use strict';

const router = require('express').Router();
const verifyToken = require('../middleware/auth');
const { listPosts, createPost, getPost, updatePost, deletePost, publishPost } = require('../controllers/postController');

router.get('/', listPosts);
router.post('/', verifyToken, createPost);
router.get('/:id', getPost);
router.put('/:id', verifyToken, updatePost);
router.delete('/:id', verifyToken, deletePost);
router.post('/:id/publish', verifyToken, publishPost);

module.exports = router;
