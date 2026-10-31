/**
 * LinkedOut Core Application Controller
 * Manages resignation feed rendering, real-time filtering, search,
 * reactions, comments, anonymous story composition, and admin portal.
 */

document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentFilter = {
    tag: '',
    company: '',
    query: '',
    sortBy: 'newest'
  };

  const postsContainer = document.getElementById('posts-container');
  const radarList = document.getElementById('radar-companies-list');
  const searchInput = document.getElementById('global-search-input');
  const activeTagIndicator = document.getElementById('active-tag-indicator');

  /**
   * Escape HTML to ensure zero XSS rendering in the DOM
   */
  function escape(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  /**
   * Format relative timestamp
   */
  function timeAgo(dateString) {
    const diff = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  /**
   * Fetch and render resignation posts
   */
  async function loadPosts() {
    postsContainer.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
        <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔥</div>
        Scrubbing corporate traces and loading real exit stories...
      </div>
    `;

    try {
      const params = new URLSearchParams();
      if (currentFilter.tag) params.append('tag', currentFilter.tag);
      if (currentFilter.company) params.append('company', currentFilter.company);
      if (currentFilter.query) params.append('query', currentFilter.query);
      if (currentFilter.sortBy) params.append('sortBy', currentFilter.sortBy);

      const res = await fetch(`/api/posts?${params.toString()}`);
      const data = await res.json();

      if (!data.success || !data.posts || data.posts.length === 0) {
        postsContainer.innerHTML = `
          <div class="card" style="padding: 2.5rem; text-align: center;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">🚩</div>
            <h3 style="font-size: 1.1rem; margin-bottom: 0.3rem;">No Resignation Stories Found</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
              Be the first whistleblower to expose this company or tag!
            </p>
            <button class="btn btn-primary btn-sm" id="empty-compose-btn">
              Spill the Tea
            </button>
          </div>
        `;
        const emptyBtn = document.getElementById('empty-compose-btn');
        if (emptyBtn) emptyBtn.addEventListener('click', openComposerModal);
        return;
      }

      // Update posts count stat in left sidebar
      const statCount = document.getElementById('stat-posts-count');
      if (statCount) statCount.textContent = data.posts.length;

      // Render Post Cards
      postsContainer.innerHTML = data.posts.map(renderPostCard).join('');

      // Attach event listeners for post interactions
      attachPostEventListeners();

    } catch (err) {
      postsContainer.innerHTML = `
        <div class="card" style="padding: 2rem; text-align: center; color: var(--toxic-red);">
          Error loading posts: ${escape(err.message)}
        </div>
      `;
    }
  }

  /**
   * Render individual post card markup safely
   */
  function renderPostCard(post) {
    const safeCompany = escape(post.companyName);
    const safeHeadline = escape(post.headline);
    const safeStory = escape(post.story);
    const safeAdvice = escape(post.partingAdvice);
    const safeAlias = escape(post.authorAlias);
    const safeRole = escape(post.role);
    const safeTenure = escape(post.tenure);
    const safeType = escape(post.resignationType);
    const redFlag = Number(post.redFlagScore).toFixed(1);

    const tagsHtml = (post.toxicityTags || []).map(t =>
      `<span class="tag-pill" data-tag-filter="${escape(t)}">#${escape(t)}</span>`
    ).join('');

    const commentsCount = post.commentsCount || 0;

    return `
      <article class="card post-card" id="post-${post.id}" data-id="${post.id}">
        <!-- Header -->
        <div class="post-header">
          <div class="post-author-wrapper">
            <div class="post-avatar" style="background: ${escape(post.authorAvatar || 'var(--brand-blue)')};">
              ${safeAlias.substring(0, 2).toUpperCase()}
            </div>
            <div class="post-author-meta">
              <div class="post-author-title">
                <span>${safeAlias}</span>
                ${post.verifiedExEmployee ? `
                  <span class="verified-tag" title="Verified Ex-Employee via zero-knowledge domain hash">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    Verified Ex-Employee
                  </span>
                ` : ''}
              </div>
              <div class="post-author-sub">
                ${safeRole} at <span class="post-company-tag" data-company-filter="${safeCompany}">${safeCompany}</span>
                · Tenure: ${safeTenure} · ${timeAgo(post.createdAt)}
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div class="post-redflag-gauge" title="Toxicity Score on Red Flag Radar">
              🚩 ${redFlag} / 10
            </div>
          </div>
        </div>

        <!-- Departure Type Pill -->
        <div style="margin-bottom: 0.6rem;">
          <span style="font-size: 0.75rem; background: var(--bg-surface); padding: 0.2rem 0.6rem; border-radius: var(--radius-full); font-weight: 600; color: var(--accent-gold); border: 1px solid var(--border-subtle);">
            ${safeType}
          </span>
        </div>

        <!-- Headline -->
        <h3 class="post-headline">${safeHeadline}</h3>

        <!-- Story Body -->
        <div class="post-body">${safeStory}</div>

        <!-- Parting Advice Callout -->
        ${safeAdvice ? `
          <div class="post-advice-box">
            <strong>💡 Parting Advice for Job Applicants</strong>
            ${safeAdvice}
          </div>
        ` : ''}

        <!-- Tags -->
        <div class="post-tags">${tagsHtml}</div>

        <!-- Metrics Counts -->
        <div class="post-metrics-bar">
          <div class="metrics-left">
            <div class="reaction-icons-stack">
              <span>🚩</span>
              <span>💀</span>
              <span>☕</span>
            </div>
            <span id="metrics-resonated-${post.id}">
              ${post.reactions.resonated} Resonated · ${post.reactions.dodgedBullet} Dodged a Bullet
            </span>
          </div>
          <div>
            <span id="metrics-comments-${post.id}">${commentsCount} Spilled Teas</span>
          </div>
        </div>

        <!-- Action Buttons (LinkedIn Parody) -->
        <div class="post-action-buttons">
          <button class="action-btn react-btn" data-action="resonated" data-id="${post.id}">
            <span>🚩</span> Resonate
          </button>
          <button class="action-btn react-btn" data-action="dodgedBullet" data-id="${post.id}">
            <span>💀</span> Dodged Bullet
          </button>
          <button class="action-btn toggle-comments-btn" data-id="${post.id}">
            <span>☕</span> Spill Tea
          </button>
          <button class="action-btn delete-post-btn" data-id="${post.id}" title="Delete story (owner/admin only)">
            <span>🗑️</span>
          </button>
        </div>

        <!-- Comments Drawer -->
        <div class="post-comments-drawer" id="comments-drawer-${post.id}">
          <div class="comment-input-row">
            <input type="text" class="comment-input" id="comment-input-${post.id}" placeholder="Spill tea anonymously on this story...">
            <button class="btn btn-primary btn-sm submit-comment-btn" data-id="${post.id}">
              Post
            </button>
          </div>
          <div class="comments-list" id="comments-list-${post.id}">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 0.5rem;">
              Click to load tea...
            </div>
          </div>
        </div>
      </article>
    `;
  }

  /**
   * Attach interactive listeners to dynamically rendered posts
   */
  function attachPostEventListeners() {
    // Reactions
    document.querySelectorAll('.react-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const postId = btn.getAttribute('data-id');
        const reactionType = btn.getAttribute('data-action');
        try {
          const res = await fetch(`/api/posts/${postId}/react`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reactionType })
          });
          const data = await res.json();
          if (data.success && data.reactions) {
            const metricsEl = document.getElementById(`metrics-resonated-${postId}`);
            if (metricsEl) {
              metricsEl.textContent = `${data.reactions.resonated} Resonated · ${data.reactions.dodgedBullet} Dodged a Bullet`;
            }
            btn.classList.add('active-resonate');
          }
        } catch (e) {
          console.error('Reaction failed:', e);
        }
      });
    });

    // Toggle comments
    document.querySelectorAll('.toggle-comments-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const postId = btn.getAttribute('data-id');
        const drawer = document.getElementById(`comments-drawer-${postId}`);
        if (drawer) {
          drawer.classList.toggle('open');
          if (drawer.classList.contains('open')) {
            loadComments(postId);
          }
        }
      });
    });

    // Submit Comment
    document.querySelectorAll('.submit-comment-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const postId = btn.getAttribute('data-id');
        const input = document.getElementById(`comment-input-${postId}`);
        if (!input || !input.value.trim()) return;

        const text = input.value.trim();
        const user = AuthManager.getUser();

        try {
          const res = await fetch(`/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': AuthManager.getToken() ? `Bearer ${AuthManager.getToken()}` : ''
            },
            body: JSON.stringify({
              text,
              alias: user ? user.anonymousAlias : null
            })
          });

          const data = await res.json();
          if (data.success && data.comment) {
            input.value = '';
            loadComments(postId);
          } else {
            alert(data.error || 'Failed to submit comment.');
          }
        } catch (e) {
          alert('Network error submitting comment.');
        }
      });
    });

    // Delete Post (Strict Ownership / Admin check)
    document.querySelectorAll('.delete-post-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const postId = btn.getAttribute('data-id');
        const token = AuthManager.getToken();

        if (!token) {
          alert('Authentication required: Sign in to delete your posts or use the Admin portal.');
          const authModal = document.getElementById('auth-modal');
          if (authModal) authModal.classList.add('active');
          return;
        }

        if (!confirm('Are you sure you want to delete this resignation story? This cannot be undone.')) {
          return;
        }

        try {
          const res = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();

          if (data.success) {
            const card = document.getElementById(`post-${postId}`);
            if (card) {
              card.style.opacity = '0';
              setTimeout(() => card.remove(), 250);
            }
          } else {
            alert(data.error || 'Access denied: You can only delete stories that you authored.');
          }
        } catch (e) {
          alert('Error contacting server.');
        }
      });
    });

    // Tag Pill Filters
    document.querySelectorAll('.tag-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const tag = pill.getAttribute('data-tag-filter');
        filterByTag(tag);
      });
    });

    // Company Tag Filter
    document.querySelectorAll('.post-company-tag').forEach(tag => {
      tag.addEventListener('click', (e) => {
        e.stopPropagation();
        const comp = tag.getAttribute('data-company-filter');
        currentFilter.company = comp;
        currentFilter.tag = '';
        updateFilterIndicator();
        loadPosts();
      });
    });
  }

  /**
   * Load comments for a post
   */
  async function loadComments(postId) {
    const listEl = document.getElementById(`comments-list-${postId}`);
    if (!listEl) return;

    try {
      const res = await fetch(`/api/posts/${postId}`);
      const data = await res.json();
      if (data.success && data.comments) {
        if (data.comments.length === 0) {
          listEl.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center;">No tea spilled yet. Be the first to comment!</div>`;
          return;
        }

        listEl.innerHTML = data.comments.map(c => `
          <div class="comment-bubble">
            <div class="comment-author">
              <span>${escape(c.authorAlias)}</span>
              <span class="comment-time">${timeAgo(c.createdAt)}</span>
            </div>
            <div class="comment-text">${escape(c.text)}</div>
          </div>
        `).join('');
      }
    } catch (e) {
      listEl.innerHTML = `<div style="color: var(--toxic-red); font-size: 0.8rem;">Failed to load comments.</div>`;
    }
  }

  /**
   * Load Red Flag Radar Leaderboard
   */
  async function loadRadarLeaderboard() {
    if (!radarList) return;
    try {
      const res = await fetch('/api/companies/stats');
      const data = await res.json();
      if (data.success && data.companies) {
        radarList.innerHTML = data.companies.slice(0, 5).map(c => `
          <div class="radar-item" data-company-name="${escape(c.companyName)}">
            <div>
              <div class="radar-company">${escape(c.companyName)}</div>
              <div class="radar-exits">${c.totalExits} verified exit${c.totalExits > 1 ? 's' : ''}</div>
            </div>
            <div class="radar-score">🚩 ${c.averageRedFlagScore}</div>
          </div>
        `).join('');

        // Click to filter by company
        document.querySelectorAll('.radar-item').forEach(item => {
          item.addEventListener('click', () => {
            const comp = item.getAttribute('data-company-name');
            currentFilter.company = comp;
            currentFilter.tag = '';
            updateFilterIndicator();
            loadPosts();
          });
        });
      }
    } catch (e) {
      radarList.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted);">Leaderboard syncing...</div>`;
    }
  }

  /**
   * Filter Helpers
   */
  function filterByTag(tag) {
    currentFilter.tag = tag;
    currentFilter.company = '';
    updateFilterIndicator();
    loadPosts();

    // Highlight left sidebar filter item
    document.querySelectorAll('.filter-item').forEach(item => {
      const itemTag = item.getAttribute('data-tag');
      if (itemTag === tag) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  function updateFilterIndicator() {
    if (!activeTagIndicator) return;
    if (currentFilter.tag) {
      activeTagIndicator.innerHTML = `Filtered by tag: <span>#${escape(currentFilter.tag)}</span> (<a href="#" id="clear-filter-link" style="color: var(--brand-blue);">clear</a>)`;
    } else if (currentFilter.company) {
      activeTagIndicator.innerHTML = `Exits for: <span>${escape(currentFilter.company)}</span> (<a href="#" id="clear-filter-link" style="color: var(--brand-blue);">clear</a>)`;
    } else {
      activeTagIndicator.innerHTML = '';
    }

    const clearLink = document.getElementById('clear-filter-link');
    if (clearLink) {
      clearLink.addEventListener('click', (e) => {
        e.preventDefault();
        currentFilter.tag = '';
        currentFilter.company = '';
        currentFilter.query = '';
        if (searchInput) searchInput.value = '';
        updateFilterIndicator();
        loadPosts();
      });
    }
  }

  // Left Sidebar Filter Clicks
  document.querySelectorAll('.filter-item').forEach(item => {
    item.addEventListener('click', () => {
      const tag = item.getAttribute('data-tag');
      filterByTag(tag);
    });
  });

  // Sort Tabs
  document.querySelectorAll('.sort-tab[data-sort]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.sort-tab[data-sort]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter.sortBy = tab.getAttribute('data-sort');
      loadPosts();
    });
  });

  // Debounced Search Input
  let searchTimeout = null;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentFilter.query = searchInput.value.trim();
        loadPosts();
      }, 300);
    });
  }

  /**
   * Resignation Story Composer Modal Logic
   */
  const postModal = document.getElementById('post-modal');
  const openComposerTrigger = document.getElementById('open-composer-trigger');
  const directComposerBtn = document.getElementById('composer-direct-btn');
  const navCreateBtn = document.getElementById('nav-create-btn');
  const rangeSlider = document.getElementById('input-redflag-range');
  const rangeDisplay = document.getElementById('redflag-display-num');
  const rangeBadge = document.getElementById('redflag-badge-indicator');
  const submitPostBtn = document.getElementById('submit-post-btn');

  function openComposerModal() {
    if (postModal) postModal.classList.add('active');
  }

  if (openComposerTrigger) openComposerTrigger.addEventListener('click', openComposerModal);
  if (directComposerBtn) directComposerBtn.addEventListener('click', openComposerModal);
  if (navCreateBtn) navCreateBtn.addEventListener('click', openComposerModal);

  // Red Flag Range Slider
  if (rangeSlider && rangeDisplay && rangeBadge) {
    rangeSlider.addEventListener('input', () => {
      const val = parseFloat(rangeSlider.value).toFixed(1);
      rangeDisplay.textContent = val;
      rangeBadge.textContent = `🚩 ${val}`;
    });
  }

  // Tag Chips Selection
  document.querySelectorAll('#composer-tags-container .tag-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('selected');
    });
  });

  // Submit Post
  if (submitPostBtn) {
    submitPostBtn.addEventListener('click', async () => {
      const company = document.getElementById('input-company').value.trim();
      const role = document.getElementById('input-role').value.trim();
      const tenure = document.getElementById('input-tenure').value.trim();
      const resignationType = document.getElementById('select-resignation-type').value;
      const redFlagScore = parseFloat(rangeSlider.value);
      const headline = document.getElementById('input-headline').value.trim();
      const story = document.getElementById('input-story').value.trim();
      const advice = document.getElementById('input-advice').value.trim();
      const anonymize = document.getElementById('check-anonymize-alias').checked;

      // Selected Tags
      const selectedTags = [];
      document.querySelectorAll('#composer-tags-container .tag-chip.selected').forEach(c => {
        selectedTags.push(c.getAttribute('data-value'));
      });

      if (!company) {
        alert('Please specify the company name.');
        return;
      }

      if (!story || story.length < 15) {
        alert('Please share your resignation story (minimum 15 characters).');
        return;
      }

      submitPostBtn.disabled = true;
      submitPostBtn.textContent = 'Encrypting & Publishing...';

      try {
        const user = AuthManager.getUser();
        const customAlias = anonymize && user ? user.anonymousAlias : null;

        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': AuthManager.getToken() ? `Bearer ${AuthManager.getToken()}` : ''
          },
          body: JSON.stringify({
            companyName: company,
            role: role || 'Former Employee',
            tenure: tenure || '1 year',
            resignationType,
            redFlagScore,
            toxicityTags: selectedTags,
            headline: headline || `Why I walked away from ${company}`,
            story,
            partingAdvice: advice,
            customAlias,
            verifiedExEmployee: true
          })
        });

        const data = await res.json();
        if (data.success) {
          postModal.classList.remove('active');
          // Reset form
          document.getElementById('input-company').value = '';
          document.getElementById('input-headline').value = '';
          document.getElementById('input-story').value = '';
          document.getElementById('input-advice').value = '';
          loadPosts();
          loadRadarLeaderboard();
        } else {
          alert(data.error || 'Failed to publish post.');
        }
      } catch (err) {
        alert('Error publishing story: ' + err.message);
      } finally {
        submitPostBtn.disabled = false;
        submitPostBtn.textContent = '🔒 Publish Anonymously';
      }
    });
  }

  /**
   * Protected Admin Portal Logic
   */
  const adminModal = document.getElementById('admin-modal');
  const navAdminBtn = document.getElementById('nav-admin-btn');
  const adminUnlockBtn = document.getElementById('admin-unlock-btn');
  const adminKeyInput = document.getElementById('admin-key-input');
  const adminAuthPanel = document.getElementById('admin-auth-panel');
  const adminDashPanel = document.getElementById('admin-dashboard-panel');
  const adminLogsView = document.getElementById('admin-audit-logs-view');

  if (navAdminBtn) {
    navAdminBtn.addEventListener('click', () => {
      if (adminModal) adminModal.classList.add('active');
    });
  }

  if (adminUnlockBtn && adminKeyInput) {
    adminUnlockBtn.addEventListener('click', async () => {
      const key = adminKeyInput.value.trim();
      if (!key) return;

      adminUnlockBtn.textContent = 'Verifying Timing-Safe Key...';

      try {
        const res = await fetch('/api/admin/overview', {
          headers: {
            'x-admin-key': key
          }
        });

        const data = await res.json();
        if (data.success && data.data) {
          adminAuthPanel.style.display = 'none';
          adminDashPanel.style.display = 'block';

          document.getElementById('admin-total-posts').textContent = data.data.totalPosts;
          document.getElementById('admin-audit-count').textContent = data.data.auditEventsRecorded;
          document.getElementById('admin-uptime').textContent = `${data.data.serverUptimeSeconds}s`;

          // Load logs
          const logsRes = await fetch('/api/admin/audit-logs', {
            headers: { 'x-admin-key': key }
          });
          const logsData = await logsRes.json();
          if (logsData.success && logsData.logs) {
            adminLogsView.innerHTML = logsData.logs.map(log => `
              <div style="padding: 4px 0; border-bottom: 1px solid var(--border-subtle);">
                <span style="color: var(--accent-emerald);">[${log.timestamp.substring(11, 19)}]</span>
                <strong style="color: var(--brand-blue);">${log.eventType}:</strong>
                ${JSON.stringify(log.details)}
              </div>
            `).join('');
          }
        } else {
          alert('Access Forbidden: Invalid Admin Key.');
        }
      } catch (e) {
        alert('Admin authentication failed.');
      } finally {
        adminUnlockBtn.textContent = 'Unlock Admin Vault';
      }
    });
  }

  /**
   * Generic Modal Close Buttons
   */
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close-modal');
      const m = document.getElementById(modalId);
      if (m) m.classList.remove('active');
    });
  });

  // Close modals on clicking overlay backdrop
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });

  /**
   * Theme Switcher (Dark / Light)
   */
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = document.getElementById('theme-icon');
  const currentTheme = localStorage.getItem('linkedout_theme') || 'dark';

  document.documentElement.setAttribute('data-theme', currentTheme);
  if (themeIcon) themeIcon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const active = document.documentElement.getAttribute('data-theme');
      const next = active === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('linkedout_theme', next);
      if (themeIcon) themeIcon.textContent = next === 'dark' ? '☀️' : '🌙';
    });
  }

  // Navigation Links
  const navFeedBtn = document.getElementById('nav-feed-btn');
  const navRadarBtn = document.getElementById('nav-radar-btn');
  if (navFeedBtn) {
    navFeedBtn.addEventListener('click', () => {
      currentFilter.tag = '';
      currentFilter.company = '';
      currentFilter.query = '';
      if (searchInput) searchInput.value = '';
      updateFilterIndicator();
      loadPosts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (navRadarBtn) {
    navRadarBtn.addEventListener('click', () => {
      currentFilter.sortBy = 'redflags';
      loadPosts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Initial Load
  loadPosts();
  loadRadarLeaderboard();
});
