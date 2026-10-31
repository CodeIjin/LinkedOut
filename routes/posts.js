/**
 * LinkedOut Resignation Posts API
 * Allows employees to anonymously share exit stories, react, comment,
 * and manage their own submissions with strict ownership enforcement.
 */

const express = require('express');
const { postLimiter } = require('../middleware/rateLimiter');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const {
  createPost,
  getAllPosts,
  getPostById,
  getRawPostById,
  deletePost,
  reactToPost,
  addComment,
  getCommentsForPost
} = require('../models/store');

const router = express.Router();

/**
 * GET /api/posts
 * Public feed with filtering and search
 */
router.get('/', (req, res) => {
  const { company, tag, query, sortBy } = req.query;
  const posts = getAllPosts({ company, tag, query, sortBy });
  return res.json({
    success: true,
    count: posts.length,
    posts
  });
});

/**
 * GET /api/posts/:id
 * Retrieve specific resignation story with comments
 */
router.get('/:id', (req, res) => {
  const post = getPostById(req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, error: 'Resignation story not found.' });
  }

  const comments = getCommentsForPost(req.params.id);
  return res.json({
    success: true,
    post,
    comments
  });
});

/**
 * POST /api/posts
 * Submit new anonymous resignation story
 */
router.post('/', postLimiter, optionalAuth, (req, res) => {
  try {
    const {
      companyName,
      department,
      role,
      tenure,
      resignationType,
      redFlagScore,
      toxicityTags,
      headline,
      story,
      partingAdvice,
      customAlias,
      verifiedExEmployee
    } = req.body;

    if (!companyName || typeof companyName !== 'string' || companyName.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Company name is required.' });
    }

    if (!story || typeof story !== 'string' || story.trim().length < 15) {
      return res.status(400).json({
        success: false,
        error: 'Please provide the context/story of your resignation (minimum 15 characters).'
      });
    }

    const newPost = createPost({
      authorId: req.user ? req.user.id : null,
      companyName,
      department,
      role,
      tenure,
      resignationType,
      redFlagScore,
      toxicityTags,
      headline,
      story,
      partingAdvice,
      customAlias,
      verifiedExEmployee: verifiedExEmployee !== false
    });

    return res.status(201).json({
      success: true,
      message: 'Resignation story published safely. Whistleblower identity protected.',
      post: newPost
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to publish post.' });
  }
});

/**
 * DELETE /api/posts/:id
 * Strict User Ownership Check: Only the post creator or an admin can delete a post!
 */
router.delete('/:id', requireAuth, (req, res) => {
  const rawPost = getRawPostById(req.params.id);
  if (!rawPost) {
    return res.status(404).json({ success: false, error: 'Post not found.' });
  }

  // Ensure user owns this post or is an admin
  const isOwner = rawPost.authorId && rawPost.authorId === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: You can only delete your own resignation stories.'
    });
  }

  const deleted = deletePost(req.params.id, req.user.id, isAdmin);
  if (deleted) {
    return res.json({ success: true, message: 'Resignation story successfully removed.' });
  } else {
    return res.status(500).json({ success: false, error: 'Could not delete story.' });
  }
});

/**
 * POST /api/posts/:id/react
 * Anonymous community reactions (resonated, dodgedBullet, spillTea)
 */
router.post('/:id/react', (req, res) => {
  const { reactionType } = req.body;
  const allowed = ['resonated', 'dodgedBullet', 'spillTea'];

  if (!allowed.includes(reactionType)) {
    return res.status(400).json({ success: false, error: 'Invalid reaction type.' });
  }

  const updatedReactions = reactToPost(req.params.id, reactionType);
  if (!updatedReactions) {
    return res.status(404).json({ success: false, error: 'Post not found.' });
  }

  return res.json({ success: true, reactions: updatedReactions });
});

/**
 * POST /api/posts/:id/comments
 * Add anonymous comment to resignation post
 */
router.post('/:id/comments', postLimiter, optionalAuth, (req, res) => {
  const { text, alias } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length < 2) {
    return res.status(400).json({ success: false, error: 'Comment text cannot be empty.' });
  }

  const comment = addComment({
    postId: req.params.id,
    authorId: req.user ? req.user.id : null,
    text,
    alias
  });

  if (!comment) {
    return res.status(404).json({ success: false, error: 'Post not found.' });
  }

  return res.status(201).json({ success: true, comment });
});

module.exports = router;
