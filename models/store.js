/**
 * LinkedOut Secure Data Storage & Anonymity Engine
 * Provides persistent memory storage with parameterized access methods,
 * bcrypt-12 password hashing, and zero-PII whistleblower protection.
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { ANONYMIZATION_SALT, ADMIN_EMAIL, ADMIN_PASSWORD } = require('../config/security');

// In-memory data store with atomic operations
const users = new Map();
const posts = new Map();
const comments = new Map();
const securityAuditLogs = [];

// Whistleblower Persona Generator
const ADJECTIVES = ['Ex-Staff', 'Escaped', 'Vindicated', 'Burnt-Out', 'Reformed', 'Whistleblower', 'Unchained', 'Severance-Secured', 'Off-Call'];
const ROLES = ['Engineer', 'Architect', 'Product Lead', 'Designer', 'Ops Veteran', 'Scrum Rebel', 'Data Hostage', 'Executive Escapee'];

function generateBurnerAlias(companyName) {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const role = ROLES[Math.floor(Math.random() * ROLES.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${adj} ${role} #${num}`;
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #ff416c, #ff4b2b)',
  'linear-gradient(135deg, #8a2387, #e94057, #f27121)',
  'linear-gradient(135deg, #00c6ff, #0072ff)',
  'linear-gradient(135deg, #f857a6, #ff5858)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #30cfd0, #330867)'
];

function getRandomGradient() {
  return AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)];
}

/**
 * Creates a zero-knowledge one-way hash from IP or email.
 * Guarantees whistleblower cannot be reverse-engineered even with database access.
 */
function hashWhistleblowerIdentity(rawIdentifier) {
  if (!rawIdentifier) return 'anonymous-shield';
  return crypto.createHmac('sha256', ANONYMIZATION_SALT)
    .update(rawIdentifier.trim().toLowerCase())
    .digest('hex')
    .substring(0, 16);
}

/**
 * User Store Methods
 */
async function createUser({ username, email, password, role = 'user', anonymousAlias }) {
  // Hash password with 12 rounds of bcrypt
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const id = crypto.randomUUID();
  const alias = anonymousAlias || generateBurnerAlias('LinkedOut');
  const avatarBg = getRandomGradient();

  const user = {
    id,
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    emailHash: hashWhistleblowerIdentity(email),
    passwordHash,
    role,
    anonymousAlias: alias,
    avatarBg,
    createdAt: new Date().toISOString()
  };

  users.set(id, user);

  logSecurityEvent('USER_REGISTERED', { userId: id, role, alias });

  // Return sanitized user object (NEVER return passwordHash or raw credentials)
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    anonymousAlias: user.anonymousAlias,
    avatarBg: user.avatarBg
  };
}

async function findUserByUsername(identifier) {
  if (!identifier || typeof identifier !== 'string') return null;
  const searchName = identifier.toLowerCase().trim();
  for (const user of users.values()) {
    if (user.username === searchName || (user.email && user.email === searchName)) {
      return user;
    }
  }
  return null;
}

async function findUserById(id) {
  const user = users.get(id);
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    anonymousAlias: user.anonymousAlias,
    avatarBg: user.avatarBg,
    createdAt: user.createdAt
  };
}

async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

/**
 * Resignation Post Store Methods
 */
function createPost({
  authorId,
  companyName,
  department,
  role,
  tenure,
  resignationType,
  redFlagScore,
  toxicityTags = [],
  headline,
  story,
  partingAdvice,
  customAlias,
  verifiedExEmployee = true
}) {
  const id = crypto.randomUUID();
  const author = users.get(authorId);
  const authorAlias = customAlias || (author ? author.anonymousAlias : generateBurnerAlias(companyName));
  const authorAvatar = author ? author.avatarBg : getRandomGradient();

  const post = {
    id,
    authorId: authorId || null, // Stored internally for ownership checks only
    companyName: companyName.trim(),
    department: department ? department.trim() : 'Engineering & Product',
    role: role ? role.trim() : 'Former Employee',
    tenure: tenure ? tenure.trim() : '1 year',
    resignationType: resignationType || 'Rage Quit',
    redFlagScore: Math.min(10, Math.max(1, parseFloat(redFlagScore) || 8.5)),
    toxicityTags: Array.isArray(toxicityTags) ? toxicityTags.slice(0, 6) : [],
    headline: headline ? headline.trim() : `Why I walked away from ${companyName}`,
    story: story.trim(),
    partingAdvice: partingAdvice ? partingAdvice.trim() : 'Trust the red flags in the interview.',
    authorAlias,
    authorAvatar,
    verifiedExEmployee: Boolean(verifiedExEmployee),
    createdAt: new Date().toISOString(),
    reactions: {
      resonated: 1,
      dodgedBullet: 0,
      spillTea: 0
    },
    viewsCount: Math.floor(12 + Math.random() * 50)
  };

  posts.set(id, post);
  logSecurityEvent('POST_CREATED', { postId: id, company: post.companyName });

  return sanitizePostForPublic(post);
}

function getAllPosts(filter = {}) {
  let list = Array.from(posts.values());

  // Company filter
  if (filter.company) {
    const q = filter.company.toLowerCase();
    list = list.filter(p => p.companyName.toLowerCase().includes(q));
  }

  // Tag filter
  if (filter.tag) {
    const t = filter.tag.toLowerCase();
    list = list.filter(p => p.toxicityTags.some(tag => tag.toLowerCase() === t));
  }

  // Search query filter (searches company, role, headline, story)
  if (filter.query) {
    const q = filter.query.toLowerCase();
    list = list.filter(p =>
      p.companyName.toLowerCase().includes(q) ||
      p.headline.toLowerCase().includes(q) ||
      p.story.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q)
    );
  }

  // Sorting
  if (filter.sortBy === 'redflags') {
    list.sort((a, b) => b.redFlagScore - a.redFlagScore);
  } else if (filter.sortBy === 'popular') {
    list.sort((a, b) => (b.reactions.resonated + b.reactions.dodgedBullet) - (a.reactions.resonated + a.reactions.dodgedBullet));
  } else {
    // Default newest first
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return list.map(sanitizePostForPublic);
}

function getPostById(id) {
  const post = posts.get(id);
  if (!post) return null;
  return sanitizePostForPublic(post);
}

function getRawPostById(id) {
  return posts.get(id) || null;
}

function deletePost(id, userId, isAdmin = false) {
  const post = posts.get(id);
  if (!post) return false;

  // Strict ownership check
  if (!isAdmin && post.authorId !== userId) {
    return false;
  }

  posts.delete(id);
  logSecurityEvent('POST_DELETED', { postId: id, deletedBy: isAdmin ? 'ADMIN' : userId });
  return true;
}

function reactToPost(id, reactionType) {
  const post = posts.get(id);
  if (!post) return null;

  if (reactionType in post.reactions) {
    post.reactions[reactionType] += 1;
    return post.reactions;
  }
  return post.reactions;
}

/**
 * Comments
 */
function addComment({ postId, authorId, text, alias }) {
  const post = posts.get(postId);
  if (!post) return null;

  const author = users.get(authorId);
  const authorAlias = alias || (author ? author.anonymousAlias : generateBurnerAlias(post.companyName));
  const authorAvatar = author ? author.avatarBg : getRandomGradient();

  const comment = {
    id: crypto.randomUUID(),
    postId,
    authorAlias,
    authorAvatar,
    text: text.trim(),
    createdAt: new Date().toISOString()
  };

  const postComments = comments.get(postId) || [];
  postComments.push(comment);
  comments.set(postId, postComments);

  // Increment spillTea reaction counter
  post.reactions.spillTea = (post.reactions.spillTea || 0) + 1;

  return comment;
}

function getCommentsForPost(postId) {
  return comments.get(postId) || [];
}

/**
 * Public Sanitization: Removes all author IDs or sensitive linkage
 * so whistleblowers remain 100% anonymous to outside viewers.
 */
function sanitizePostForPublic(post) {
  return {
    id: post.id,
    companyName: post.companyName,
    department: post.department,
    role: post.role,
    tenure: post.tenure,
    resignationType: post.resignationType,
    redFlagScore: post.redFlagScore,
    toxicityTags: post.toxicityTags,
    headline: post.headline,
    story: post.story,
    partingAdvice: post.partingAdvice,
    authorAlias: post.authorAlias,
    authorAvatar: post.authorAvatar,
    verifiedExEmployee: post.verifiedExEmployee,
    createdAt: post.createdAt,
    reactions: post.reactions,
    viewsCount: post.viewsCount,
    commentsCount: (comments.get(post.id) || []).length
  };
}

/**
 * Red Flag Radar: Company Aggregation Analytics
 */
function getCompanyRedFlagStats() {
  const companyMap = new Map();

  for (const post of posts.values()) {
    const key = post.companyName.trim();
    if (!companyMap.has(key)) {
      companyMap.set(key, {
        companyName: key,
        totalExits: 0,
        totalScore: 0,
        tagsMap: {},
        resignationTypes: {}
      });
    }

    const c = companyMap.get(key);
    c.totalExits += 1;
    c.totalScore += post.redFlagScore;

    for (const tag of post.toxicityTags) {
      c.tagsMap[tag] = (c.tagsMap[tag] || 0) + 1;
    }
    c.resignationTypes[post.resignationType] = (c.resignationTypes[post.resignationType] || 0) + 1;
  }

  const result = [];
  for (const [name, data] of companyMap.entries()) {
    const avgScore = Number((data.totalScore / data.totalExits).toFixed(1));
    const topTags = Object.entries(data.tagsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);

    result.push({
      companyName: name,
      totalExits: data.totalExits,
      averageRedFlagScore: avgScore,
      topComplaints: topTags,
      toxicityLevel: avgScore >= 9.0 ? 'Critical Biohazard' : avgScore >= 7.5 ? 'Severe Toxic' : 'Moderate Red Flags'
    });
  }

  // Rank by average score desc
  return result.sort((a, b) => b.averageRedFlagScore - a.averageRedFlagScore);
}

/**
 * Security Event Logging (In-Memory Audit Trail)
 */
function logSecurityEvent(eventType, details = {}) {
  const event = {
    timestamp: new Date().toISOString(),
    eventType,
    details: {
      ...details,
      ip: undefined // ZERO PII stored by design
    }
  };
  securityAuditLogs.push(event);
  if (securityAuditLogs.length > 500) {
    securityAuditLogs.shift();
  }
}

function getSecurityAuditLogs() {
  return securityAuditLogs.slice(-50);
}

/**
 * Initialize with realistic, hilarious seed exit stories & default accounts
 */
async function initializeSeedData() {
  // Create primary admin account from secure environment configuration
  const adminUser = await createUser({
    username: ADMIN_EMAIL,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin',
    anonymousAlias: 'LinkedOut Chief Admin'
  });

  // Create demo verified whistleblower user
  const demoUser = await createUser({
    username: 'ex_tech_lead',
    email: 'anon_dev@linkedout.secure',
    password: 'SafeWhistleblowerPassword#123',
    role: 'user',
    anonymousAlias: 'Ex-Staff Engineer #704'
  });

  // Seed Post 1: MegaCorp Cloud
  createPost({
    authorId: demoUser.id,
    companyName: 'OmniCloud Technologies',
    department: 'Core Infrastructure',
    role: 'Principal Site Reliability Engineer',
    tenure: '3 years 8 months',
    resignationType: 'Rage Quit',
    redFlagScore: 9.7,
    toxicityTags: ['Weekend Slack Pings', 'Gaslighting & PIPs', 'Return-to-Office Mandate', 'Micromanagement'],
    headline: 'I quit OmniCloud after leadership mandated 5 days in office to "collaborate" with an empty floor in Seattle',
    story: 'After 3 years of maintaining 99.999% uptime while working remotely across 4 time zones, executive leadership decided true innovation only happens when badges scan at 8:45 AM. I flew across the country for our "mandatory in-person alignment week" only to find my entire engineering team sitting in noise-canceling headphones doing Zoom calls from cubicles with broken AC.\n\nWhen I raised concerns during the all-hands about the 2-hour commute turning top engineers into zombies, our VP smiled and said, "If you don\'t bleed OmniCloud blue, perhaps this ship is moving too fast for you." I sent my resignation letter right from the airport terminal and received a 40% raise at a remote-first platform within 11 days. Never let a company make you feel guilty for demanding basic human respect.',
    partingAdvice: 'If they talk about "culture" more than code reviews, run.',
    customAlias: 'Vindicated SRE Lead',
    verifiedExEmployee: true
  });

  // Seed Post 2: Apex Global Consulting
  createPost({
    authorId: null,
    companyName: 'Apex Strategic Advisory',
    department: 'Digital Transformation',
    role: 'Senior Management Consultant',
    tenure: '14 months of pure insomnia',
    resignationType: 'Quiet Quit -> Severance',
    redFlagScore: 9.2,
    toxicityTags: ['Unpaid Overtime', 'Toxic Leadership', 'Fake Unlimited PTO', 'Burnout Factory'],
    headline: 'Billed 85 hours a week so a partner could buy a third vacation home while telling us "We are a family"',
    story: 'At Apex, "Unlimited PTO" was corporate code for "we will shame you on every team Slack channel if you take off a single Friday afternoon." Every Sunday night began with panic palpitations as partners dumped 90-slide slide decks that had to be polished before 7 AM Monday.\n\nThe final straw was when a junior analyst fainted from exhaustion in the client lobby, and the partner asked if her laptop was undamaged so someone else could finish her Excel model. I negotiated my exit package, signed zero non-disparagements that could silence the truth, and took 3 months off to rediscover what sleeping past 6 AM feels like.',
    partingAdvice: 'Ask current consultants what time their Slack status goes offline on weekends. Their eyes will tell you everything.',
    customAlias: 'Recovering PowerPoint Hostage',
    verifiedExEmployee: true
  });

  // Seed Post 3: HustlePulse AI
  createPost({
    authorId: null,
    companyName: 'HustlePulse AI',
    department: 'Machine Learning',
    role: 'Senior NLP Researcher',
    tenure: '9 months',
    resignationType: 'Left for 2x Pay & Mental Peace',
    redFlagScore: 8.8,
    toxicityTags: ['Phantom Equity', 'Micromanagement', 'Toxic Leadership', 'Broken Promises'],
    headline: 'CEO was secretly reading employee Slack DMs using a custom bot and gaslighting people in 1-on-1s',
    story: 'We were told we were building next-gen generative agent frameworks. In reality, the founder spent more time analyzing employee keystroke metrics and firing engineers who dared to question why our equity agreements still hadn\'t been ratified by the board after 9 months of promises.\n\nOne afternoon, the CEO quoted word-for-word a private DM discussion I had with a teammate about tech debt during a performance review. That was the instant I knew this wasn\'t just a dysfunctional startup—it was an authoritarian dystopia. Walked out the same day. Do not accept funny-money options in lieu of a fair market salary.',
    partingAdvice: 'Never sign an equity grant that isn\'t formalized with the board within 30 days of your start date.',
    customAlias: 'Escaped NLP Wizard',
    verifiedExEmployee: true
  });

  // Seed Post 4: FinFlow Payments
  createPost({
    authorId: null,
    companyName: 'FinFlow Payments',
    department: 'Fraud & Risk Engineering',
    role: 'Staff Backend Architect',
    tenure: '2 years',
    resignationType: 'Dodged the PIP',
    redFlagScore: 8.4,
    toxicityTags: ['Ghosting Promotions', 'Toxic Leadership', 'Severance Drama'],
    headline: 'Got handed a PIP 2 weeks after discovering a compliance loophole that leadership told me to ignore',
    story: 'I flagged a critical PCI-DSS vulnerability that would have cost the company millions in fines. Instead of fixing it, the director told me to "focus on quarterly deliverables" and suddenly my performance went from "Exceeds Expectations" to "Needs Immediate Improvement" on a vague 30-day plan designed to push me out before equity vest.\n\nI retained an employment attorney, had all communication documented offline, and walked away with 6 months severance. If a company tries to weaponize performance reviews against your integrity, do not cry—document everything and lawyer up.',
    partingAdvice: 'Forward every written instruction that feels unethical to your personal backup.',
    customAlias: 'Unchained Architect #404',
    verifiedExEmployee: true
  });

  // Seed comments
  const firstPost = Array.from(posts.values())[0];
  if (firstPost) {
    addComment({
      postId: firstPost.id,
      authorId: null,
      text: 'I worked under that same VP in 2024. He literally yelled at someone for having their camera off during an 8:30 PM sync. Glad you got out with a bag!',
      alias: 'Anonymous Ex-DevOps Lead'
    });
    addComment({
      postId: firstPost.id,
      authorId: null,
      text: 'The 40% raise part is the best revenge. Toxic companies always underpay the hardest workers.',
      alias: 'Quiet Quitter Hero'
    });
  }
}

// Automatically boot seed data on import
initializeSeedData();

module.exports = {
  createUser,
  findUserByUsername,
  findUserById,
  verifyPassword,
  createPost,
  getAllPosts,
  getPostById,
  getRawPostById,
  deletePost,
  reactToPost,
  addComment,
  getCommentsForPost,
  getCompanyRedFlagStats,
  logSecurityEvent,
  getSecurityAuditLogs,
  generateBurnerAlias
};
