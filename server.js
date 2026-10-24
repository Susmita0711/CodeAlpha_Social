const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, run, get, all, initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'post-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------------------------------------------------------
// API Endpoints: USERS
// -----------------------------------------------------------------------------

// Get all users (with counts & follow status relative to current user)
app.get('/api/users', async (req, res) => {
  try {
    const currentUserId = parseInt(req.query.currentUserId) || 1;
    const users = await all(`
      SELECT u.*,
        (SELECT COUNT(*) FROM followers WHERE following_id = u.id) AS followers_count,
        (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) AS following_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS posts_count,
        EXISTS(SELECT 1 FROM followers WHERE follower_id = ? AND following_id = u.id) AS is_followed_by_me
      FROM users u
      ORDER BY u.id ASC
    `, [currentUserId]);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single user profile
app.get('/api/users/:id', async (req, res) => {
  try {
    const currentUserId = parseInt(req.query.currentUserId) || 1;
    const userId = parseInt(req.params.id);
    const user = await get(`
      SELECT u.*,
        (SELECT COUNT(*) FROM followers WHERE following_id = u.id) AS followers_count,
        (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) AS following_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS posts_count,
        EXISTS(SELECT 1 FROM followers WHERE follower_id = ? AND following_id = u.id) AS is_followed_by_me
      FROM users u
      WHERE u.id = ?
    `, [currentUserId, userId]);

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new user (Sign up)
app.post('/api/users', async (req, res) => {
  try {
    const { username, name, bio, location, avatar, cover_photo, badge } = req.body;
    if (!username || !name) {
      return res.status(400).json({ error: 'Username and Name are required' });
    }

    const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80';
    const defaultCover = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80';

    const result = await run(
      `INSERT INTO users (username, name, bio, location, avatar, cover_photo, badge) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        username.toLowerCase().trim().replace(/\s+/g, '_'),
        name.trim(),
        bio || 'Exploring Charcha 🇮🇳',
        location || 'India',
        avatar || defaultAvatar,
        cover_photo || defaultCover,
        badge || 'Creator 🌟'
      ]
    );

    const newUser = await get(`SELECT * FROM users WHERE id = ?`, [result.id]);
    res.status(201).json(newUser);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Username is already taken' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update user profile
app.put('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, bio, location, avatar, cover_photo, badge } = req.body;

    await run(`
      UPDATE users 
      SET name = COALESCE(?, name),
          bio = COALESCE(?, bio),
          location = COALESCE(?, location),
          avatar = COALESCE(?, avatar),
          cover_photo = COALESCE(?, cover_photo),
          badge = COALESCE(?, badge)
      WHERE id = ?
    `, [name, bio, location, avatar, cover_photo, badge, userId]);

    const updated = await get(`SELECT * FROM users WHERE id = ?`, [userId]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Follow / Unfollow
app.post('/api/users/:id/follow', async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    const followerId = parseInt(req.body.followerId);

    if (!followerId || followerId === targetUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself or missing follower ID' });
    }

    const existing = await get(
      `SELECT * FROM followers WHERE follower_id = ? AND following_id = ?`,
      [followerId, targetUserId]
    );

    let followed = false;
    if (existing) {
      // Unfollow
      await run(`DELETE FROM followers WHERE follower_id = ? AND following_id = ?`, [followerId, targetUserId]);
      followed = false;
    } else {
      // Follow
      await run(`INSERT INTO followers (follower_id, following_id) VALUES (?, ?)`, [followerId, targetUserId]);
      followed = true;
    }

    const followersCount = (await get(`SELECT COUNT(*) as count FROM followers WHERE following_id = ?`, [targetUserId])).count;
    res.json({ followed, followersCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// API Endpoints: POSTS
// -----------------------------------------------------------------------------

// Get posts with filtering (all, following, trending, tag, user)
app.get('/api/posts', async (req, res) => {
  try {
    const currentUserId = parseInt(req.query.currentUserId) || 1;
    const feedType = req.query.feed || 'all'; // all, following, trending
    const tag = req.query.tag;
    const userId = req.query.userId;

    let query = `
      SELECT p.*,
        u.username, u.name, u.avatar, u.badge, u.location AS user_location,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) AS is_liked_by_me,
        EXISTS(SELECT 1 FROM followers WHERE follower_id = ? AND following_id = p.user_id) AS is_author_followed
      FROM posts p
      JOIN users u ON p.user_id = u.id
    `;
    const params = [currentUserId, currentUserId];

    const whereClauses = [];

    if (userId) {
      whereClauses.push('p.user_id = ?');
      params.push(userId);
    }

    if (tag) {
      whereClauses.push('p.tags LIKE ?');
      params.push(`%${tag}%`);
    }

    if (feedType === 'following') {
      whereClauses.push(`p.user_id IN (SELECT following_id FROM followers WHERE follower_id = ?)`);
      params.push(currentUserId);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    if (feedType === 'trending') {
      query += ' ORDER BY likes_count DESC, p.created_at DESC';
    } else {
      query += ' ORDER BY p.created_at DESC';
    }

    const posts = await all(query, params);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Post
app.post('/api/posts', async (req, res) => {
  try {
    const { user_id, content, image_url, tags, location } = req.body;
    if (!user_id || !content) {
      return res.status(400).json({ error: 'User ID and Content are required' });
    }

    const result = await run(
      `INSERT INTO posts (user_id, content, image_url, tags, location) VALUES (?, ?, ?, ?, ?)`,
      [user_id, content.trim(), image_url || null, tags || null, location || null]
    );

    const post = await get(`
      SELECT p.*,
        u.username, u.name, u.avatar, u.badge, u.location AS user_location,
        0 AS likes_count,
        0 AS comments_count,
        0 AS is_liked_by_me,
        0 AS is_author_followed
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [result.id]);

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Post
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = parseInt(req.query.userId);

    const post = await get(`SELECT * FROM posts WHERE id = ?`, [postId]);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (userId && post.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this post' });
    }

    await run(`DELETE FROM posts WHERE id = ?`, [postId]);
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Like
app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = parseInt(req.body.userId);

    if (!userId) return res.status(400).json({ error: 'User ID required' });

    const existing = await get(`SELECT * FROM likes WHERE post_id = ? AND user_id = ?`, [postId, userId]);

    let liked = false;
    if (existing) {
      await run(`DELETE FROM likes WHERE post_id = ? AND user_id = ?`, [postId, userId]);
      liked = false;
    } else {
      await run(`INSERT INTO likes (post_id, user_id) VALUES (?, ?)`, [postId, userId]);
      liked = true;
    }

    const countRes = await get(`SELECT COUNT(*) as count FROM likes WHERE post_id = ?`, [postId]);
    res.json({ liked, likesCount: countRes.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// API Endpoints: COMMENTS
// -----------------------------------------------------------------------------

// Get comments for a post
app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const comments = await all(`
      SELECT c.*, u.username, u.name, u.avatar, u.badge
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `, [postId]);
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add comment to a post
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { user_id, content } = req.body;

    if (!user_id || !content || !content.trim()) {
      return res.status(400).json({ error: 'User ID and comment content are required' });
    }

    const result = await run(
      `INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`,
      [postId, user_id, content.trim()]
    );

    const comment = await get(`
      SELECT c.*, u.username, u.name, u.avatar, u.badge
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [result.id]);

    const countRes = await get(`SELECT COUNT(*) as count FROM comments WHERE post_id = ?`, [postId]);
    res.status(201).json({ comment, totalComments: countRes.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete comment
app.delete('/api/comments/:id', async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const userId = parseInt(req.query.userId);

    const comment = await get(`SELECT * FROM comments WHERE id = ?`, [commentId]);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (userId && comment.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment' });
    }

    await run(`DELETE FROM comments WHERE id = ?`, [commentId]);
    const countRes = await get(`SELECT COUNT(*) as count FROM comments WHERE post_id = ?`, [comment.post_id]);
    res.json({ success: true, totalComments: countRes.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// File Upload & Platform Stats
// -----------------------------------------------------------------------------

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// Platform stats & trending tags
app.get('/api/stats', async (req, res) => {
  try {
    const totalUsers = (await get(`SELECT COUNT(*) as count FROM users`)).count;
    const totalPosts = (await get(`SELECT COUNT(*) as count FROM posts`)).count;
    const totalLikes = (await get(`SELECT COUNT(*) as count FROM likes`)).count;
    
    // Calculate top tags
    const postsWithTags = await all(`SELECT tags FROM posts WHERE tags IS NOT NULL AND tags != ''`);
    const tagCount = {};
    for (const p of postsWithTags) {
      const tags = p.tags.split(',').map(t => t.trim()).filter(Boolean);
      for (const t of tags) {
        tagCount[t] = (tagCount[t] || 0) + 1;
      }
    }
    const trendingTags = Object.entries(tagCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    res.json({
      totalUsers,
      totalPosts,
      totalLikes,
      trendingTags: trendingTags.length ? trendingTags : [
        { tag: '#TechIndia', count: 18 },
        { tag: '#IncredibleIndia', count: 15 },
        { tag: '#BiryaniLovers', count: 12 },
        { tag: '#NammaBengaluru', count: 9 },
        { tag: '#VaranasiGhats', count: 7 }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to index.html for SPA feel
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize DB and start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Charcha Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
