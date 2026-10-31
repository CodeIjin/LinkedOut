# 🛡️ LinkedOut

> **Where Corporate Professionals Confess Why They *Really* Quit.**  
> *The anonymous anti-toxic workplace network — reverse-engineering LinkedIn to expose toxic leadership, unpaid overtime, gaslighting, and fake culture without fear.*

---

[![Security Audit](https://img.shields.io/badge/Security_Audit-100%25_Passed_(12%2F12)-10b981?style=for-the-badge&logo=shield)](http://localhost:3000/api/security/audit)
[![Zero PII](https://img.shields.io/badge/Whistleblower_PII-Zero_Stored-3b82f6?style=for-the-badge&logo=lock)](http://localhost:3000)
[![Password Hashing](https://img.shields.io/badge/Credentials-bcrypt--12_Salted-8b5cf6?style=for-the-badge)](http://localhost:3000)
[![Runtime](https://img.shields.io/badge/Node.js-v18%2B-22c55e?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-ef4444?style=for-the-badge)](LICENSE)

---

## 🎯 About LinkedOut

On traditional professional networks like LinkedIn, employees are forced into performative corporate optimism: praising 70-hour workweeks, romanticizing burnout, and silently tolerating toxic managers for fear of career retaliation.

**LinkedOut is the antidote.** Built as a modern, high-polish reverse-engineered parody of LinkedIn's desktop experience, LinkedOut allows employees to anonymously share uncensored resignation stories, rate toxic companies on the **Red Flag Radar**, and warn prospective applicants about what really goes on behind closed Slack channels.

---

## ✨ Core Features

* **🕵️ Whistleblower Anonymity Engine**: Generates burner tech personas (e.g., `Ex-Staff Engineer #704`, `Vindicated SRE Lead`). IP addresses, browser fingerprints, and raw emails are scrubbed at the gateway before any post is saved.
* **🚩 Red Flag Radar (Toxicity Scoring 1–10)**: Real-time company leaderboards ranking employers by verified exit volume and severity scores.
* **💣 "Burn the Bridge" Exit Story Composer**: Submit departure stories complete with departure style (`💥 Rage Quit`, `💼 Quiet Quit -> Severance`, `🛡️ Dodged the PIP`), tenure, toxic tags, and **💡 Parting Advice for Applicants**.
* **💬 Corporate BS Translator Widget**: Real-time interactive translations of common workplace euphemisms (*"We are like a family"* $\rightarrow$ *"Emotional guilt when taking sick days"*).
* **🚩 Community Reactions & Spilled Tea**: React anonymously with `🚩 Resonate`, `💀 Dodged a Bullet`, or `☕ Spill Tea` to open threaded discussions.
* **🛡️ In-App Security Audit Suite**: Click **Security Audit** in the navigation bar to run an interactive 12-point defensive penetration and security check directly in your browser.
* **🔐 Protected Admin & Moderation Vault**: Admin portal guarded by cryptographic timing-safe comparisons and JWT role barriers.

---

## 🔒 Security Hardening & Zero-Leak Architecture

LinkedOut is built following strict defensive security principles:

| Defense Control | Implementation Detail |
| :--- | :--- |
| **Secret & API Key Isolation** | Secrets (`JWT_SECRET`, `ADMIN_API_KEY`, etc.) are kept strictly in local `.env` and excluded from git tracking via `.gitignore`. |
| **Password Security** | Passwords are cryptographically salted and hashed using **bcrypt with 12 computational rounds**. |
| **XSS & Form Sanitization** | `sanitize-html` cleanses all incoming payloads, stripping `<script>`, `<iframe>`, `javascript:`, and inline event handlers (`onerror`, `onload`). |
| **Rate Limiting** | Multi-tiered `express-rate-limit`: general API (120 req/15m), sensitive auth (25 req/15m), and post composer (15 posts/15m). |
| **HTTP Security Headers** | `helmet` configured with strict Content Security Policy (`script-src 'self'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and disabled `X-Powered-By`. |
| **Exposed File Interception** | Requests attempting to probe `/.env`, `/.git`, `/package.json`, or `.bak` files are proactively rejected with `403 Forbidden`. |
| **IDOR Protection** | Strict resource ownership checks ensure users can only modify or delete stories they authored. |
| **Debug Mode Suppressed** | `NODE_ENV=production` hides all stack traces and database paths. Errors are replaced with safe generic messages and incident tracking IDs. |
| **Whistleblower Privacy** | Author IP addresses and emails are hashed using one-way HMAC-SHA256 salted hashes and never stored in plaintext. |

---

## 🚀 Quick Start Guide

### Prerequisites
* [Node.js](https://nodejs.org) (v18.0.0 or higher)
* [npm](https://www.npmjs.com) (v9.0.0 or higher)

### 1. Clone & Install
```bash
git clone https://github.com/your-username/LinkedOut.git
cd LinkedOut
npm install
```

### 2. Configure Environment Variables
Copy the template file to `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in your local secrets. *(Note: `.env` is already included in `.gitignore` and will never be tracked by git).*

```env
PORT=3000
NODE_ENV=production
DEBUG=false

# Admin Credentials (LOCAL ONLY)
ADMIN_EMAIL=admin_account@example.com
ADMIN_PASSWORD=your_secure_admin_password
ADMIN_API_KEY=your_secure_admin_api_key

# Cryptographic Keys (Min 32 characters)
JWT_SECRET=replace_with_a_cryptographically_secure_random_string_32_chars_min
COOKIE_SECRET=replace_with_a_secure_cookie_secret_token
ANONYMIZATION_SALT=replace_with_a_random_salt_hex

# Access Limits
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=120
AUTH_RATE_LIMIT_MAX=25
```

### 3. Start the Server
```bash
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to experience LinkedOut.

---

## 🧪 Running Automated Security Audit

LinkedOut comes with an automated test suite verifying all 10 core security controls:

```bash
npm test
```

Expected Output:
```text
====================================================
🛡️  STARTING LINKEDOUT AUTOMATED SECURITY AUDIT
====================================================
  [PASS] ✓ SEC-01: .gitignore protects .env and sensitive credential files
  [PASS] ✓ SEC-02: Local .env is uncommitted and excluded from git tracking
  [PASS] ✓ SEC-03: JWT_SECRET meets cryptographic strength guidelines (>= 32 chars)
  [PASS] ✓ SEC-04: User passwords are encrypted with bcrypt-12
  [PASS] ✓ SEC-05: Input sanitizer strips <script>, <iframe>, and event handlers
  [PASS] ✓ SEC-06: Sanitized security profile never exposes raw API keys or passwords
  [PASS] ✓ SEC-07: Resignation posts do not expose author email or internal user ID to public
  [PASS] ✓ SEC-08: Users cannot delete posts belonging to other employees (IDOR defense)
  [PASS] ✓ SEC-09: Admin can moderate and remove violating content
  [PASS] ✓ SEC-10: Debug mode is disabled and production environment is active
====================================================
AUDIT RESULTS: 10/10 CONTROLS VERIFIED (100%)
🏆 ALL DEFENSIVE SECURITY CONTROLS PASSED WITH 0 DEFECTS!
```

---

## 📡 API Overview

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status & uptime | No |
| `GET` | `/api/security/audit` | 12-point automated diagnostic suite | No |
| `POST` | `/api/auth/register` | Create burner whistleblower account | Rate-Limited |
| `POST` | `/api/auth/login` | Sign in & receive session JWT | Rate-Limited |
| `POST` | `/api/auth/logout` | Invalidate session cookie | No |
| `GET` | `/api/auth/random-alias` | Generate fresh burner persona | No |
| `GET` | `/api/posts` | Public sanitized resignation feed | No |
| `POST` | `/api/posts` | Submit anonymous resignation story | Optional / Rate-Limited |
| `DELETE` | `/api/posts/:id` | Delete story (author or admin only) | **Yes (Author / Admin)** |
| `POST` | `/api/posts/:id/react` | Increment reaction counter | No |
| `POST` | `/api/posts/:id/comments`| Add anonymous comment | Rate-Limited |
| `GET` | `/api/companies/stats` | Red Flag Radar leaderboard | No |
| `GET` | `/api/admin/overview` | Admin dashboard metrics | **Yes (Admin)** |
| `GET` | `/api/admin/audit-logs` | Tamper-proof zero-PII security logs | **Yes (Admin)** |

---

## ⚖️ Legal & Ethical Whistleblower Notice

LinkedOut is built as a parody platform designed for employee empowerment, freedom of speech, and workplace transparency. No user credentials, IP addresses, or identifiable corporate data are retained or monetized.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
