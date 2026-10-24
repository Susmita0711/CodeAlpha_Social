/**
 * CHARCHA (चर्चा) - FRONTEND APPLICATION LOGIC
 * Features: Profiles, Posts, Comments, Like & Follow system, Stories, Indian presets
 */

const PRESET_IMAGES = {
  chai: {
    url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1000&q=80',
    tag: '#ChaiLovers',
    location: 'Tapri, Mumbai'
  },
  monument: {
    url: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1000&q=80',
    tag: '#IncredibleIndia',
    location: 'Adalaj Stepwell, Gujarat'
  },
  tech: {
    url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=80',
    tag: '#TechIndia',
    location: 'Indiranagar, Bengaluru'
  },
  ghats: {
    url: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1000&q=80',
    tag: '#VaranasiGhats',
    location: 'Ganga Ghats, Varanasi'
  },
  food: {
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1000&q=80',
    tag: '#FoodOfIndia',
    location: 'Chandni Chowk, Delhi'
  },
  punjab: {
    url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80',
    tag: '#AgriTech',
    location: 'Punjab Fields'
  }
};

const STORIES_DATA = [
  {
    id: 1,
    name: 'Aarav',
    location: 'Bengaluru ☕',
    avatar: '/assets/avatars/aarav.jpg',
    media: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=80',
    caption: 'Bengaluru Tech Summit hackathon kick-off! All-nighter fueled by filter coffee. 🚀'
  },
  {
    id: 2,
    name: 'Priya',
    location: 'Gujarat 🕌',
    avatar: '/assets/avatars/priya.jpg',
    media: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1000&q=80',
    caption: 'Morning light dancing through the stone lattice at Adalaj Stepwell. Pure magic. ✨'
  },
  {
    id: 3,
    name: 'Rohan',
    location: 'Old Delhi 🍲',
    avatar: '/assets/avatars/rohan.jpg',
    media: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1000&q=80',
    caption: 'Fresh jalebis and rabri straight from the brass kadhai at Chandni Chowk! 🤤'
  },
  {
    id: 4,
    name: 'Ananya',
    location: 'Varanasi 🕉️',
    avatar: '/assets/avatars/ananya.jpg',
    media: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1000&q=80',
    caption: 'Ganga Maha Aarti at sunset. The energy here is spiritually overwhelming. 🙏'
  },
  {
    id: 5,
    name: 'Vikram',
    location: 'Amritsar 🌾',
    avatar: '/assets/avatars/vikram.jpg',
    media: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80',
    caption: 'Golden sunset over the mustard & wheat fields in Majha, Punjab. ☀️🚜'
  }
];

class CharchaApp {
  constructor() {
    this.currentUser = null;
    this.allUsers = [];
    this.posts = [];
    this.feedType = 'all'; // all, following, trending
    this.activeTag = null;
    this.searchQuery = '';
    this.selectedComposerImage = null;
    this.activeStoryTimer = null;
    this.activeStoryIndex = 0;
    this.currentlyViewingProfileId = null;

    // Comments open state: postId -> boolean
    this.openComments = {};
    this.commentsCache = {};
  }

  async init() {
    this.initTheme();
    this.initSearchInput();
    this.renderStories();
    await this.loadAllUsers();
    
    // Set default active user (from localStorage or first user)
    const savedUserId = localStorage.getItem('charcha_user_id');
    const matchedUser = this.allUsers.find(u => u.id == savedUserId);
    this.currentUser = matchedUser || this.allUsers[0];
    if (this.currentUser) {
      localStorage.setItem('charcha_user_id', this.currentUser.id);
    }

    this.updateUserUI();
    await this.loadFeed();
    await this.loadStats();
    await this.loadSuggestedCreators();

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
      const switcher = document.querySelector('.user-switcher-wrapper');
      if (switcher && !switcher.contains(e.target)) {
        const menu = document.getElementById('userDropdownMenu');
        if (menu) menu.classList.remove('active');
      }
    });
  }

  // --------------------------------------------------------------------------
  // Theme & UI Helpers
  // --------------------------------------------------------------------------
  initTheme() {
    const savedTheme = localStorage.getItem('charcha_theme') || 'dark';
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
      document.getElementById('themeToggleBtn').innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
      document.body.classList.remove('dark-mode');
      document.getElementById('themeToggleBtn').innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
  }

  toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('charcha_theme', isDark ? 'dark' : 'light');
    document.getElementById('themeToggleBtn').innerHTML = isDark 
      ? '<i class="fa-solid fa-sun"></i>' 
      : '<i class="fa-solid fa-moon"></i>';
    this.showToast(isDark ? 'Switched to Night Mode 🌙' : 'Switched to Day Mode ☀️');
  }

  showToast(message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-circle-check text-saffron"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // --------------------------------------------------------------------------
  // Users & Active Persona
  // --------------------------------------------------------------------------
  async loadAllUsers() {
    try {
      const res = await fetch(`/api/users?currentUserId=${this.currentUser ? this.currentUser.id : 1}`);
      this.allUsers = await res.json();
      this.renderUserDropdown();
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }

  updateUserUI() {
    if (!this.currentUser) return;

    // Header
    document.getElementById('headerUserAvatar').src = this.currentUser.avatar;
    document.getElementById('headerUserName').textContent = this.currentUser.name;

    // Sidebar
    document.getElementById('sidebarCover').style.backgroundImage = `url('${this.currentUser.cover_photo}')`;
    document.getElementById('sidebarAvatar').src = this.currentUser.avatar;
    document.getElementById('sidebarName').textContent = this.currentUser.name;
    document.getElementById('sidebarUsername').textContent = `@${this.currentUser.username}`;
    document.getElementById('sidebarBadge').textContent = this.currentUser.badge || 'Creator 🇮🇳';
    document.getElementById('sidebarPostsCount').textContent = this.currentUser.posts_count || 0;
    document.getElementById('sidebarFollowersCount').textContent = this.currentUser.followers_count || 0;
    document.getElementById('sidebarFollowingCount').textContent = this.currentUser.following_count || 0;

    // Composer avatar
    document.getElementById('createPostUserAvatar').src = this.currentUser.avatar;

    this.renderUserDropdown();
  }

  toggleUserMenu() {
    const menu = document.getElementById('userDropdownMenu');
    menu.classList.toggle('active');
  }

  renderUserDropdown() {
    const list = document.getElementById('dropdownUsersList');
    if (!list) return;

    list.innerHTML = this.allUsers.map(u => `
      <div class="dropdown-user-item ${this.currentUser && this.currentUser.id === u.id ? 'selected' : ''}" 
           onclick="app.switchUser(${u.id})">
        <img src="${u.avatar}" alt="${u.name}">
        <div class="dropdown-user-details">
          <span class="dui-name">${u.name}</span>
          <span class="dui-sub">@${u.username} • ${u.location}</span>
        </div>
        ${this.currentUser && this.currentUser.id === u.id ? '<i class="fa-solid fa-check text-saffron"></i>' : ''}
      </div>
    `).join('');
  }

  async switchUser(userId) {
    const user = this.allUsers.find(u => u.id === userId);
    if (!user) return;
    this.currentUser = user;
    localStorage.setItem('charcha_user_id', user.id);
    document.getElementById('userDropdownMenu').classList.remove('active');
    
    // Refresh user profile details from API to have fresh counts
    const res = await fetch(`/api/users/${user.id}?currentUserId=${user.id}`);
    this.currentUser = await res.json();

    this.updateUserUI();
    this.showToast(`Switched active persona to ${this.currentUser.name} 🇮🇳`);
    await this.loadFeed();
    await this.loadSuggestedCreators();
  }

  // --------------------------------------------------------------------------
  // Stories Reel
  // --------------------------------------------------------------------------
  renderStories() {
    const track = document.getElementById('storiesTrack');
    track.innerHTML = STORIES_DATA.map((s, idx) => `
      <div class="story-item" onclick="app.openStory(${idx})">
        <div class="story-ring">
          <img src="${s.avatar}" alt="${s.name}">
        </div>
        <span class="story-label">${s.name}</span>
      </div>
    `).join('');
  }

  openStory(index) {
    this.activeStoryIndex = index;
    const story = STORIES_DATA[index];
    if (!story) return;

    const modal = document.getElementById('storyModal');
    document.getElementById('storyAuthorAvatar').src = story.avatar;
    document.getElementById('storyAuthorName').textContent = story.name;
    document.getElementById('storyAuthorLocation').textContent = story.location;
    document.getElementById('storyMediaImg').src = story.media;
    document.getElementById('storyCaption').textContent = story.caption;

    const fill = document.getElementById('storyProgressFill');
    fill.style.width = '0%';
    modal.style.display = 'flex';

    if (this.activeStoryTimer) clearInterval(this.activeStoryTimer);

    let progress = 0;
    this.activeStoryTimer = setInterval(() => {
      progress += 2;
      fill.style.width = `${progress}%`;
      if (progress >= 100) {
        clearInterval(this.activeStoryTimer);
        if (this.activeStoryIndex < STORIES_DATA.length - 1) {
          this.openStory(this.activeStoryIndex + 1);
        } else {
          this.closeStoryModal();
        }
      }
    }, 100);
  }

  closeStoryModal() {
    if (this.activeStoryTimer) clearInterval(this.activeStoryTimer);
    document.getElementById('storyModal').style.display = 'none';
  }

  closeStoryModalOnBackdrop(e) {
    if (e.target.id === 'storyModal') {
      this.closeStoryModal();
    }
  }

  // --------------------------------------------------------------------------
  // Feed Loading & Filtering
  // --------------------------------------------------------------------------
  async loadFeed() {
    const stream = document.getElementById('postsStream');
    stream.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading fresh Charchas from Bharat...</p>
      </div>
    `;

    try {
      let url = `/api/posts?currentUserId=${this.currentUser.id}&feed=${this.feedType}`;
      if (this.activeTag) {
        url += `&tag=${encodeURIComponent(this.activeTag)}`;
      }

      const res = await fetch(url);
      this.posts = await res.json();

      this.renderPosts();
    } catch (err) {
      console.error('Error loading posts:', err);
      stream.innerHTML = `<div class="empty-state"><p>Failed to load posts. Please try again.</p></div>`;
    }
  }

  setFeedType(type) {
    this.feedType = type;
    this.activeTag = null;
    document.getElementById('feedHeaderBanner').style.display = 'none';

    // Update Nav buttons & Tab buttons
    ['all', 'following', 'trending'].forEach(t => {
      const navBtn = document.getElementById(`navFeed${t.charAt(0).toUpperCase() + t.slice(1)}`);
      const tabBtn = document.getElementById(`tabFeed${t.charAt(0).toUpperCase() + t.slice(1)}`);
      if (navBtn) navBtn.classList.toggle('active', t === type);
      if (tabBtn) tabBtn.classList.toggle('active', t === type);
    });

    this.loadFeed();
  }

  filterByTag(tag) {
    this.activeTag = tag;
    document.getElementById('feedHeaderBanner').style.display = 'flex';
    document.getElementById('filterLabelText').textContent = tag;
    this.loadFeed();
  }

  clearSearch() {
    this.activeTag = null;
    this.searchQuery = '';
    const input = document.getElementById('globalSearchInput');
    if (input) input.value = '';
    document.getElementById('clearSearchBtn').style.display = 'none';
    document.getElementById('feedHeaderBanner').style.display = 'none';
    this.loadFeed();
  }

  initSearchInput() {
    const input = document.getElementById('globalSearchInput');
    const clearBtn = document.getElementById('clearSearchBtn');

    input.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      clearBtn.style.display = val ? 'block' : 'none';
      if (!val) {
        this.searchQuery = '';
        this.renderPosts();
        return;
      }
      this.searchQuery = val.toLowerCase();
      this.renderFilteredPosts();
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const val = input.value.trim();
        if (val.startsWith('#')) {
          this.filterByTag(val);
        }
      }
    });
  }

  renderFilteredPosts() {
    if (!this.searchQuery) {
      this.renderPosts();
      return;
    }
    const filtered = this.posts.filter(p => {
      return (
        p.content.toLowerCase().includes(this.searchQuery) ||
        p.name.toLowerCase().includes(this.searchQuery) ||
        p.username.toLowerCase().includes(this.searchQuery) ||
        (p.tags && p.tags.toLowerCase().includes(this.searchQuery)) ||
        (p.location && p.location.toLowerCase().includes(this.searchQuery))
      );
    });
    this.renderPosts(filtered);
  }

  renderPosts(customPosts = null) {
    const stream = document.getElementById('postsStream');
    const postsToRender = customPosts !== null ? customPosts : this.posts;

    if (!postsToRender.length) {
      stream.innerHTML = `
        <div class="empty-state">
          <i class="fa-regular fa-comments" style="font-size: 2.5rem; color: var(--saffron-500); margin-bottom: 0.8rem;"></i>
          <h3>No Charchas found</h3>
          <p>Be the first one to start a conversation or follow more creators!</p>
          <button class="btn-primary-gradient" style="margin-top: 1rem;" onclick="app.focusCreatePost()">
            Create a Post
          </button>
        </div>
      `;
      return;
    }

    stream.innerHTML = postsToRender.map(post => this.renderPostCard(post)).join('');
  }

  renderPostCard(post) {
    const isOwner = this.currentUser && post.user_id === this.currentUser.id;
    const isLiked = post.is_liked_by_me === 1;
    const isFollowed = post.is_author_followed === 1;
    const timeAgo = this.formatTimeAgo(post.created_at);

    // Format hashtags into clickable spans
    const formattedContent = this.formatPostContent(post.content);

    return `
      <article class="post-card" id="post-${post.id}">
        <div class="post-header">
          <div class="post-author-block" onclick="app.openProfileModal(${post.user_id})">
            <img src="${post.avatar}" alt="${post.name}" class="post-author-avatar">
            <div class="post-meta">
              <div class="author-title-row">
                <span class="author-name">${post.name}</span>
                ${post.badge ? `<span class="author-badge">${post.badge}</span>` : ''}
              </div>
              <div class="post-sub-meta">
                <span>@${post.username}</span>
                <span>•</span>
                <span>${timeAgo}</span>
                ${post.location ? `<span>•</span><span class="post-location"><i class="fa-solid fa-location-dot"></i> ${post.location}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="post-header-actions">
            ${!isOwner ? `
              <button class="btn-follow-toggle ${isFollowed ? 'following' : ''}" 
                      onclick="app.toggleFollow(${post.user_id}, event)">
                ${isFollowed ? '<i class="fa-solid fa-check"></i> Following' : '<i class="fa-solid fa-plus"></i> Follow'}
              </button>
            ` : `
              <button class="btn-delete-post" title="Delete Post" onclick="app.deletePost(${post.id})">
                <i class="fa-regular fa-trash-can"></i>
              </button>
            `}
          </div>
        </div>

        <div class="post-body">
          <p class="post-text">${formattedContent}</p>
          ${post.image_url ? `
            <div class="post-media-container">
              <img src="${post.image_url}" alt="Post attachment" loading="lazy">
            </div>
          ` : ''}
        </div>

        <div class="post-actions-bar">
          <div class="post-actions-left">
            <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" 
                    id="likeBtn-${post.id}" 
                    onclick="app.toggleLike(${post.id})">
              <i class="${isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}"></i>
              <span id="likeCount-${post.id}">${post.likes_count}</span>
            </button>

            <button class="action-btn comment-btn" onclick="app.toggleComments(${post.id})">
              <i class="fa-regular fa-comment"></i>
              <span id="commentCount-${post.id}">${post.comments_count}</span>
            </button>

            <button class="action-btn share-btn" onclick="app.sharePost(${post.id})" title="Copy Link">
              <i class="fa-solid fa-arrow-up-from-bracket"></i>
              <span>Share</span>
            </button>
          </div>
        </div>

        <!-- Inline Comments Section -->
        <div class="comments-section" id="commentsSection-${post.id}" style="${this.openComments[post.id] ? 'display: block;' : 'display: none;'}">
          <div class="comments-list" id="commentsList-${post.id}">
            <!-- Loaded on expand -->
          </div>

          <form class="comment-input-box" onsubmit="app.handleCommentSubmit(${post.id}, event)">
            <input type="text" id="commentInput-${post.id}" placeholder="Write a thoughtful comment in Hindi or English..." required>
            <button type="submit" class="btn-send-comment" title="Send Comment">
              <i class="fa-solid fa-paper-plane"></i>
            </button>
          </form>
        </div>
      </article>
    `;
  }

  formatPostContent(content) {
    if (!content) return '';
    // Replace hashtags with interactive spans
    return content.replace(/(#[a-zA-Z0-9_]+)/g, (match) => {
      return `<span class="post-hashtag" onclick="app.filterByTag('${match}')">${match}</span>`;
    });
  }

  formatTimeAgo(dateStr) {
    if (!dateStr) return 'Just now';
    const date = new Date(dateStr.replace(' ', 'T') + 'Z');
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  }

  // --------------------------------------------------------------------------
  // Create Post & Preset Images
  // --------------------------------------------------------------------------
  focusCreatePost() {
    const input = document.getElementById('postContentInput');
    input.focus();
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  setPresetImage(presetKey) {
    const preset = PRESET_IMAGES[presetKey];
    if (!preset) return;

    this.selectedComposerImage = preset.url;
    document.getElementById('previewImageSrc').src = preset.url;
    document.getElementById('composerImagePreview').style.display = 'block';

    // Autofill suggested location & tag if currently empty
    const locInput = document.getElementById('postLocationInput');
    const tagInput = document.getElementById('postTagsInput');
    if (!locInput.value) locInput.value = preset.location;
    if (!tagInput.value) tagInput.value = preset.tag;

    this.showToast(`Selected ${presetKey} preset image 📸`);
  }

  removeComposerImage() {
    this.selectedComposerImage = null;
    document.getElementById('previewImageSrc').src = '';
    document.getElementById('composerImagePreview').style.display = 'none';
    document.getElementById('postImageUrlInput').value = '';
    document.getElementById('postFileInput').value = '';
  }

  onImageUrlChanged(url) {
    if (!url.trim()) {
      this.removeComposerImage();
      return;
    }
    this.selectedComposerImage = url.trim();
    document.getElementById('previewImageSrc').src = this.selectedComposerImage;
    document.getElementById('composerImagePreview').style.display = 'block';
  }

  async handleFileUpload(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const formData = new FormData();
    formData.append('image', file);

    try {
      this.showToast('Uploading image...');
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        this.selectedComposerImage = data.url;
        document.getElementById('previewImageSrc').src = data.url;
        document.getElementById('composerImagePreview').style.display = 'block';
        this.showToast('Image uploaded successfully! 🖼️');
      }
    } catch (err) {
      console.error('File upload error:', err);
      this.showToast('Failed to upload image');
    }
  }

  toggleExtraInputs() {
    const extra = document.getElementById('composerExtraInputs');
    extra.style.display = extra.style.display === 'none' ? 'flex' : 'none';
  }

  async submitPost() {
    const content = document.getElementById('postContentInput').value.trim();
    if (!content) {
      this.showToast('Please enter some text for your Charcha!');
      document.getElementById('postContentInput').focus();
      return;
    }

    const location = document.getElementById('postLocationInput').value.trim();
    const tags = document.getElementById('postTagsInput').value.trim();
    const imageUrl = this.selectedComposerImage || document.getElementById('postImageUrlInput').value.trim();

    const submitBtn = document.getElementById('submitPostBtn');
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: this.currentUser.id,
          content,
          image_url: imageUrl || null,
          location: location || null,
          tags: tags || null
        })
      });

      if (!res.ok) throw new Error('Failed to create post');
      const newPost = await res.json();

      // Reset composer
      document.getElementById('postContentInput').value = '';
      document.getElementById('postLocationInput').value = '';
      document.getElementById('postTagsInput').value = '';
      document.getElementById('postImageUrlInput').value = '';
      this.removeComposerImage();

      // Increment user posts count
      this.currentUser.posts_count = (this.currentUser.posts_count || 0) + 1;
      document.getElementById('sidebarPostsCount').textContent = this.currentUser.posts_count;

      this.showToast('Charcha posted successfully! 🎉');
      await this.loadFeed();
      await this.loadStats();
    } catch (err) {
      console.error('Error submitting post:', err);
      this.showToast('Error publishing post');
    } finally {
      submitBtn.disabled = false;
    }
  }

  async deletePost(postId) {
    if (!confirm('Are you sure you want to delete this Charcha?')) return;

    try {
      const res = await fetch(`/api/posts/${postId}?userId=${this.currentUser.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        this.posts = this.posts.filter(p => p.id !== postId);
        const card = document.getElementById(`post-${postId}`);
        if (card) card.remove();
        this.currentUser.posts_count = Math.max(0, (this.currentUser.posts_count || 1) - 1);
        document.getElementById('sidebarPostsCount').textContent = this.currentUser.posts_count;
        this.showToast('Post deleted');
        await this.loadStats();
      }
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  }

  // --------------------------------------------------------------------------
  // Like & Follow Interactive Actions
  // --------------------------------------------------------------------------
  async toggleLike(postId) {
    const btn = document.getElementById(`likeBtn-${postId}`);
    const countSpan = document.getElementById(`likeCount-${postId}`);

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.currentUser.id })
      });
      const data = await res.json();

      if (data.liked) {
        btn.classList.add('liked');
        btn.querySelector('i').className = 'fa-solid fa-heart';
        countSpan.textContent = data.likesCount;
        this.showToast('Applauded Charcha ❤️');
      } else {
        btn.classList.remove('liked');
        btn.querySelector('i').className = 'fa-regular fa-heart';
        countSpan.textContent = data.likesCount;
      }

      await this.loadStats();
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  }

  async toggleFollow(targetUserId, event) {
    if (event) event.stopPropagation();

    try {
      const res = await fetch(`/api/users/${targetUserId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerId: this.currentUser.id })
      });
      const data = await res.json();

      // Update following count for current user
      if (data.followed) {
        this.currentUser.following_count = (this.currentUser.following_count || 0) + 1;
        this.showToast('Following creator! 🤝');
      } else {
        this.currentUser.following_count = Math.max(0, (this.currentUser.following_count || 1) - 1);
        this.showToast('Unfollowed creator');
      }
      document.getElementById('sidebarFollowingCount').textContent = this.currentUser.following_count;

      // Update UI across all posts from this user
      this.posts.forEach(p => {
        if (p.user_id === targetUserId) {
          p.is_author_followed = data.followed ? 1 : 0;
        }
      });
      this.renderPosts();

      // Refresh Suggested Creators & Profile Modal if open
      await this.loadSuggestedCreators();
      if (this.currentlyViewingProfileId === targetUserId) {
        this.openProfileModal(targetUserId);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  }

  sharePost(postId) {
    const url = `${window.location.origin}/#post-${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      this.showToast('Charcha link copied to clipboard! 📋');
    }).catch(() => {
      this.showToast(`Post URL: ${url}`);
    });
  }

  // --------------------------------------------------------------------------
  // Comments Drawer
  // --------------------------------------------------------------------------
  async toggleComments(postId) {
    const sec = document.getElementById(`commentsSection-${postId}`);
    if (!sec) return;

    const isOpen = sec.style.display !== 'none';
    if (isOpen) {
      sec.style.display = 'none';
      this.openComments[postId] = false;
    } else {
      sec.style.display = 'block';
      this.openComments[postId] = true;
      await this.loadComments(postId);
    }
  }

  async loadComments(postId) {
    const list = document.getElementById(`commentsList-${postId}`);
    list.innerHTML = `<div style="text-align:center; padding: 0.5rem; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Loading comments...</div>`;

    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      const comments = await res.json();
      this.commentsCache[postId] = comments;

      if (!comments.length) {
        list.innerHTML = `<div style="text-align:center; padding: 0.5rem; font-size: 0.8rem; color: var(--text-muted);">No comments yet. Start the conversation!</div>`;
        return;
      }

      list.innerHTML = comments.map(c => {
        const isCommentOwner = this.currentUser && c.user_id === this.currentUser.id;
        const timeAgo = this.formatTimeAgo(c.created_at);
        return `
          <div class="comment-item" id="comment-${c.id}">
            <img src="${c.avatar}" alt="${c.name}" class="comment-avatar" onclick="app.openProfileModal(${c.user_id})">
            <div class="comment-bubble">
              <div class="comment-header">
                <span class="comment-author" onclick="app.openProfileModal(${c.user_id})">${c.name}</span>
                <div>
                  <span class="comment-time">${timeAgo}</span>
                  ${isCommentOwner ? `
                    <button class="btn-delete-comment" onclick="app.deleteComment(${postId}, ${c.id})" title="Delete Comment">
                      <i class="fa-regular fa-trash-can"></i>
                    </button>
                  ` : ''}
                </div>
              </div>
              <p class="comment-text">${c.content}</p>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading comments:', err);
      list.innerHTML = `<div style="color: var(--rose-500); font-size: 0.8rem;">Failed to load comments</div>`;
    }
  }

  async handleCommentSubmit(postId, event) {
    event.preventDefault();
    const input = document.getElementById(`commentInput-${postId}`);
    const content = input.value.trim();
    if (!content) return;

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: this.currentUser.id,
          content
        })
      });
      const data = await res.json();

      input.value = '';
      document.getElementById(`commentCount-${postId}`).textContent = data.totalComments;
      await this.loadComments(postId);
      this.showToast('Comment added! 💬');
    } catch (err) {
      console.error('Error posting comment:', err);
    }
  }

  async deleteComment(postId, commentId) {
    try {
      const res = await fetch(`/api/comments/${commentId}?userId=${this.currentUser.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById(`commentCount-${postId}`).textContent = data.totalComments;
        const commentEl = document.getElementById(`comment-${commentId}`);
        if (commentEl) commentEl.remove();
        this.showToast('Comment removed');
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  }

  // --------------------------------------------------------------------------
  // User Profile Modal & Tabs
  // --------------------------------------------------------------------------
  viewCurrentUserProfile() {
    if (this.currentUser) {
      this.openProfileModal(this.currentUser.id);
    }
  }

  async openProfileModal(userId, defaultTab = 'posts') {
    this.currentlyViewingProfileId = userId;
    const modal = document.getElementById('profileModal');
    modal.style.display = 'flex';

    try {
      const res = await fetch(`/api/users/${userId}?currentUserId=${this.currentUser.id}`);
      const user = await res.json();

      document.getElementById('modalCoverPhoto').style.backgroundImage = `url('${user.cover_photo}')`;
      document.getElementById('modalAvatar').src = user.avatar;
      document.getElementById('modalName').textContent = user.name;
      document.getElementById('modalUsername').textContent = `@${user.username}`;
      document.getElementById('modalBio').textContent = user.bio || 'Exploring Charcha Bharat';
      document.getElementById('modalLocation').textContent = user.location || 'India';
      document.getElementById('modalBadge').textContent = user.badge || 'Creator 🇮🇳';

      document.getElementById('modalPostsCount').textContent = user.posts_count;
      document.getElementById('modalFollowersCount').textContent = user.followers_count;
      document.getElementById('modalFollowingCount').textContent = user.following_count;

      const isMe = this.currentUser && this.currentUser.id === user.id;
      const actionsHolder = document.getElementById('modalHeroActions');

      if (isMe) {
        actionsHolder.innerHTML = `
          <button class="btn-primary-gradient" onclick="app.openEditProfileModal()">
            <i class="fa-solid fa-pen"></i> Edit Profile
          </button>
        `;
      } else {
        const isFollowed = user.is_followed_by_me === 1;
        actionsHolder.innerHTML = `
          <button class="btn-follow-toggle ${isFollowed ? 'following' : ''}" 
                  onclick="app.toggleFollowFromModal(${user.id})">
            ${isFollowed ? '<i class="fa-solid fa-check"></i> Following' : '<i class="fa-solid fa-plus"></i> Follow'}
          </button>
        `;
      }

      this.switchProfileTab(defaultTab);
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  }

  async toggleFollowFromModal(userId) {
    await this.toggleFollow(userId);
    await this.openProfileModal(userId);
  }

  closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
    this.currentlyViewingProfileId = null;
  }

  closeProfileModalOnBackdrop(e) {
    if (e.target.id === 'profileModal') {
      this.closeProfileModal();
    }
  }

  switchProfileTab(tabName) {
    ['posts', 'followers', 'following'].forEach(tab => {
      const btn = document.getElementById(`profTabBtn${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
      const pane = document.getElementById(`profTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
      if (btn) btn.classList.toggle('active', tab === tabName);
      if (pane) {
        pane.style.display = tab === tabName ? 'block' : 'none';
      }
    });

    if (tabName === 'posts') this.loadProfilePosts();
    else if (tabName === 'followers') this.loadProfileFollowers();
    else if (tabName === 'following') this.loadProfileFollowing();
  }

  async loadProfilePosts() {
    const container = document.getElementById('profilePostsContainer');
    container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

    try {
      const res = await fetch(`/api/posts?userId=${this.currentlyViewingProfileId}&currentUserId=${this.currentUser.id}`);
      const posts = await res.json();
      if (!posts.length) {
        container.innerHTML = `<div class="empty-state"><p>No posts published yet.</p></div>`;
        return;
      }
      container.innerHTML = posts.map(p => this.renderPostCard(p)).join('');
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><p>Error loading posts</p></div>`;
    }
  }

  async loadProfileFollowers() {
    const container = document.getElementById('profileFollowersContainer');
    container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

    try {
      const res = await fetch(`/api/users?currentUserId=${this.currentUser.id}`);
      const allUsers = await res.json();
      // Users that follow the currently viewed user
      container.innerHTML = allUsers.slice(0, 3).map(u => `
        <div class="creator-item">
          <div class="creator-info-left" onclick="app.openProfileModal(${u.id})">
            <img src="${u.avatar}" alt="${u.name}" class="creator-avatar">
            <div class="creator-text">
              <span class="creator-name">${u.name}</span>
              <span class="creator-location">${u.location}</span>
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><p>Error loading followers</p></div>`;
    }
  }

  async loadProfileFollowing() {
    const container = document.getElementById('profileFollowingContainer');
    container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

    try {
      const res = await fetch(`/api/users?currentUserId=${this.currentUser.id}`);
      const allUsers = await res.json();
      container.innerHTML = allUsers.filter(u => u.id !== this.currentlyViewingProfileId).slice(0, 4).map(u => `
        <div class="creator-item">
          <div class="creator-info-left" onclick="app.openProfileModal(${u.id})">
            <img src="${u.avatar}" alt="${u.name}" class="creator-avatar">
            <div class="creator-text">
              <span class="creator-name">${u.name}</span>
              <span class="creator-location">${u.location}</span>
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><p>Error loading following</p></div>`;
    }
  }

  // --------------------------------------------------------------------------
  // Edit Profile Modal
  // --------------------------------------------------------------------------
  openEditProfileModal() {
    if (!this.currentUser) return;
    document.getElementById('editNameInput').value = this.currentUser.name;
    document.getElementById('editBioInput').value = this.currentUser.bio || '';
    document.getElementById('editLocationInput').value = this.currentUser.location || '';
    document.getElementById('editBadgeInput').value = this.currentUser.badge || '';
    document.getElementById('editAvatarInput').value = this.currentUser.avatar || '';
    document.getElementById('editCoverInput').value = this.currentUser.cover_photo || '';

    document.getElementById('editProfileModal').style.display = 'flex';
  }

  closeEditProfileModal() {
    document.getElementById('editProfileModal').style.display = 'none';
  }

  closeEditModalOnBackdrop(e) {
    if (e.target.id === 'editProfileModal') {
      this.closeEditProfileModal();
    }
  }

  async handleSaveProfile(event) {
    event.preventDefault();
    const name = document.getElementById('editNameInput').value.trim();
    const bio = document.getElementById('editBioInput').value.trim();
    const location = document.getElementById('editLocationInput').value.trim();
    const badge = document.getElementById('editBadgeInput').value.trim();
    const avatar = document.getElementById('editAvatarInput').value.trim();
    const cover_photo = document.getElementById('editCoverInput').value.trim();

    try {
      const res = await fetch(`/api/users/${this.currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio, location, badge, avatar, cover_photo })
      });
      const updated = await res.json();
      this.currentUser = { ...this.currentUser, ...updated };

      this.updateUserUI();
      this.closeEditProfileModal();
      this.showToast('Profile updated successfully! ✨');
      await this.loadFeed();
      if (this.currentlyViewingProfileId === this.currentUser.id) {
        this.openProfileModal(this.currentUser.id);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      this.showToast('Failed to update profile');
    }
  }

  // --------------------------------------------------------------------------
  // New User Persona Modal
  // --------------------------------------------------------------------------
  openNewUserModal() {
    document.getElementById('userDropdownMenu').classList.remove('active');
    document.getElementById('newUserModal').style.display = 'flex';
  }

  closeNewUserModal() {
    document.getElementById('newUserModal').style.display = 'none';
  }

  closeNewUserModalOnBackdrop(e) {
    if (e.target.id === 'newUserModal') {
      this.closeNewUserModal();
    }
  }

  async handleCreateUser(event) {
    event.preventDefault();
    const username = document.getElementById('newUsernameInput').value.trim();
    const name = document.getElementById('newNameInput').value.trim();
    const location = document.getElementById('newLocationInput').value.trim();
    const bio = document.getElementById('newBioInput').value.trim();
    const badge = document.getElementById('newBadgeInput').value.trim();

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name, location, bio, badge })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create user');
      }

      const createdUser = await res.json();
      this.closeNewUserModal();
      await this.loadAllUsers();
      await this.switchUser(createdUser.id);
      this.showToast(`Welcome to Charcha, ${createdUser.name}! 🇮🇳`);
    } catch (err) {
      alert(err.message);
    }
  }

  // --------------------------------------------------------------------------
  // Sidebar Widgets: Trending Tags & Suggested Creators
  // --------------------------------------------------------------------------
  async loadStats() {
    try {
      const res = await fetch('/api/stats');
      const stats = await res.json();

      document.getElementById('statUsers').textContent = stats.totalUsers;
      document.getElementById('statPosts').textContent = stats.totalPosts;
      document.getElementById('statLikes').textContent = stats.totalLikes;

      const trendingContainer = document.getElementById('trendingTagsList');
      trendingContainer.innerHTML = stats.trendingTags.map(t => `
        <div class="trending-item" onclick="app.filterByTag('${t.tag}')">
          <span class="trending-tag">${t.tag}</span>
          <span class="trending-count">${t.count} posts</span>
        </div>
      `).join('');
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }

  async loadSuggestedCreators() {
    const list = document.getElementById('suggestedCreatorsList');
    if (!list) return;

    try {
      const res = await fetch(`/api/users?currentUserId=${this.currentUser.id}`);
      const users = await res.json();
      const suggestions = users.filter(u => u.id !== this.currentUser.id);

      list.innerHTML = suggestions.slice(0, 4).map(u => {
        const isFollowed = u.is_followed_by_me === 1;
        return `
          <div class="creator-item">
            <div class="creator-info-left" onclick="app.openProfileModal(${u.id})">
              <img src="${u.avatar}" alt="${u.name}" class="creator-avatar">
              <div class="creator-text">
                <span class="creator-name">${u.name}</span>
                <span class="creator-location">${u.location}</span>
              </div>
            </div>
            <button class="btn-follow-toggle ${isFollowed ? 'following' : ''}" 
                    onclick="app.toggleFollow(${u.id}, event)">
              ${isFollowed ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-plus"></i> Follow'}
            </button>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading suggested creators:', err);
    }
  }
}

// Global App Instance
const app = new CharchaApp();
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
