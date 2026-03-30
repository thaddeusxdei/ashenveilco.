import { db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, deleteDoc, doc,
  query, orderBy, serverTimestamp, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const ADMIN_TOKEN = "deid4ra"; // ← change this
let isAdmin = false;
let rating = 0;

// ─── Admin Auth ────────────────────────────────────────────────────────────────

function checkAdminStatus() {
  const token = sessionStorage.getItem('adminToken');
  isAdmin = token === ADMIN_TOKEN;
  updateAdminUI();
}

function loginAdmin() {
  const token = prompt("Enter admin token:");
  if (token === ADMIN_TOKEN) {
    sessionStorage.setItem('adminToken', token);
    isAdmin = true;
    updateAdminUI();
    loadReviews();
  } else {
    alert("Invalid token.");
  }
}

function logoutAdmin() {
  sessionStorage.removeItem('adminToken');
  isAdmin = false;
  updateAdminUI();
  loadReviews();
}

function updateAdminUI() {
  const el = document.getElementById('adminControls');
  if (!el) return;
  el.innerHTML = isAdmin
    ? `<button class="admin-logout-btn" onclick="logoutAdmin()">Logout Admin</button>`
    : `<button class="admin-login-btn" onclick="loginAdmin()">Admin Panel</button>`;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function censorName(name) {
  if (isAdmin) return name;
  if (!name || name.length <= 2) return name;
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}

function formatDate(timestamp) {
  if (!timestamp) return 'Just now';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Submit Review ─────────────────────────────────────────────────────────────

async function submitReview() {
  const name = document.getElementById('rev-name').value.trim();
  const service = document.getElementById('rev-service').value;
  const text = document.getElementById('rev-text').value.trim();
  const msg = document.getElementById('rev-msg');

  if (!name || !service || rating === 0 || !text) {
    msg.textContent = '⚠ Fill in all fields and select a rating.';
    return;
  }

  try {
    msg.textContent = 'Submitting...';
    await addDoc(collection(db, 'reviews'), {
      name,
      service,
      rating,
      text,
      timestamp: serverTimestamp(),
      reactions: [],   // array of visitor IDs who reacted
      replies: []      // array of { id, text, timestamp }
    });

    msg.textContent = '✓ Review submitted! Thank you, Traveler.';
    document.getElementById('rev-name').value = '';
    document.getElementById('rev-service').value = '';
    document.getElementById('rev-text').value = '';
    rating = 0;
    document.querySelectorAll('.star-btn').forEach(b => b.classList.remove('active'));
    setTimeout(loadReviews, 800);
  } catch (err) {
    console.error(err);
    msg.textContent = '✗ Error submitting review. Try again.';
  }
}

// ─── Delete Review (admin only) ────────────────────────────────────────────────

async function deleteReview(reviewId) {
  if (!isAdmin) return;
  if (!confirm('Delete this review?')) return;
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
    loadReviews();
  } catch (err) {
    console.error(err);
    alert('Error deleting review. Check Firestore rules — make sure delete is allowed.');
  }
}

// ─── Reactions (heart, one per visitor) ───────────────────────────────────────
// We use a session-local visitor ID to track per-person reactions without login.

function getVisitorId() {
  let id = sessionStorage.getItem('visitorId');
  if (!id) {
    id = 'v_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
    sessionStorage.setItem('visitorId', id);
  }
  return id;
}

async function toggleReaction(reviewId) {
  const visitorId = isAdmin ? 'thaddeus' : getVisitorId();
  try {
    const reviewRef = doc(db, 'reviews', reviewId);
    const snap = await getDoc(reviewRef);
    if (!snap.exists()) return;

    let reactions = snap.data().reactions || [];
    const alreadyReacted = reactions.includes(visitorId);

    if (alreadyReacted) {
      reactions = reactions.filter(r => r !== visitorId);
    } else {
      reactions = [...reactions, visitorId];
    }

    await updateDoc(reviewRef, { reactions });
    loadReviews();
  } catch (err) {
    console.error(err);
  }
}

// ─── Replies (admin only) ──────────────────────────────────────────────────────

async function submitReply(reviewId) {
  if (!isAdmin) return;
  const textarea = document.getElementById(`reply-input-${reviewId}`);
  const text = textarea ? textarea.value.trim() : '';
  if (!text) { alert('Reply cannot be empty.'); return; }

  try {
    const reviewRef = doc(db, 'reviews', reviewId);
    const snap = await getDoc(reviewRef);
    if (!snap.exists()) return;

    const replies = snap.data().replies || [];
    const newReply = {
      id: Date.now().toString(),
      text,
      timestamp: new Date().toISOString()
    };

    await updateDoc(reviewRef, { replies: [...replies, newReply] });
    if (textarea) textarea.value = '';
    loadReviews();
  } catch (err) {
    console.error(err);
    alert('Error adding reply.');
  }
}

async function deleteReply(reviewId, replyId) {
  if (!isAdmin) return;
  if (!confirm('Delete this reply?')) return;

  try {
    const reviewRef = doc(db, 'reviews', reviewId);
    const snap = await getDoc(reviewRef);
    if (!snap.exists()) return;

    const replies = (snap.data().replies || []).filter(r => r.id !== replyId);
    await updateDoc(reviewRef, { replies });
    loadReviews();
  } catch (err) {
    console.error(err);
    alert('Error deleting reply.');
  }
}

function toggleReplies(reviewId) {
  const container = document.getElementById(`replies-${reviewId}`);
  if (container) container.classList.toggle('open');
}

// ─── Load & Render Reviews ─────────────────────────────────────────────────────

async function loadReviews() {
  try {
    const q = query(collection(db, 'reviews'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    const list = document.getElementById('reviewsList');
    const noRev = document.getElementById('noReviews');

    if (snapshot.empty) {
      noRev.style.display = 'block';
      list.innerHTML = '';
      return;
    }

    noRev.style.display = 'none';
    list.innerHTML = '';

    const visitorId = isAdmin ? 'thaddeus' : getVisitorId();

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const id = docSnap.id;
      const card = document.createElement('div');
      card.className = 'review-card';

      const displayName = censorName(data.name);
      const stars = '★'.repeat(data.rating) + '☆'.repeat(5 - data.rating);
      const reactions = data.reactions || [];
      const replies = data.replies || [];
      const myReacted = reactions.includes(visitorId);

      // Reaction display names
      const reactionNames = reactions.map(r =>
        r === 'thaddeus' ? 'thaddeus ✓' : 'Traveler'
      ).join(', ');

      // Reactions HTML
      const reactionsHTML = `
        <div class="review-reactions">
          <button class="reaction-btn ${myReacted ? 'reacted' : ''}" onclick="toggleReaction('${id}')">
            ❤️ ${reactions.length > 0 ? reactions.length : ''}
          </button>
          ${reactions.length > 0 ? `<span class="reaction-users">${reactionNames}</span>` : ''}
        </div>
      `;

      // Replies HTML
      let repliesInner = replies.map(reply => `
        <div class="reply-card">
          <div class="reply-header">
            <span class="reply-name">thaddeus <span class="verified-badge">✓</span></span>
            <span class="reply-date">${formatDate({ seconds: Math.floor(new Date(reply.timestamp).getTime() / 1000) })}</span>
            ${isAdmin ? `<button class="delete-reply-btn" onclick="deleteReply('${id}', '${reply.id}')">✕</button>` : ''}
          </div>
          <div class="reply-text">${reply.text}</div>
        </div>
      `).join('');

      const replyForm = isAdmin ? `
        <div class="reply-form">
          <textarea id="reply-input-${id}" placeholder="Write a reply..." rows="2"></textarea>
          <button class="reply-submit-btn" onclick="submitReply('${id}')">Reply</button>
        </div>
      ` : '';

      const repliesHTML = (replies.length > 0 || isAdmin) ? `
        <button class="replies-toggle-btn" onclick="toggleReplies('${id}')">
          💬 ${replies.length} ${replies.length === 1 ? 'Reply' : 'Replies'}
        </button>
        <div class="replies-container" id="replies-${id}">
          ${repliesInner}
          ${replyForm}
        </div>
      ` : '';

      card.innerHTML = `
        <div class="review-header">
          <div>
            <div class="review-name">${displayName}</div>
            <div class="review-service-tag">${data.service}</div>
          </div>
          ${isAdmin ? `<button class="delete-review-btn" onclick="deleteReview('${id}')">✕ Delete</button>` : ''}
        </div>
        <div class="review-stars">${stars}</div>
        <div class="review-text">${data.text}</div>
        <div class="review-date">${formatDate(data.timestamp)}</div>
        ${reactionsHTML}
        ${repliesHTML}
      `;

      list.appendChild(card);
    });
  } catch (err) {
    console.error('Error loading reviews:', err);
  }
}

// ─── Star Rating ───────────────────────────────────────────────────────────────

function setRating(val) {
  rating = val;
  document.querySelectorAll('.star-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i < val);
  });
}

// ─── Expose to global scope ────────────────────────────────────────────────────

window.submitReview = submitReview;
window.deleteReview = deleteReview;
window.toggleReaction = toggleReaction;
window.submitReply = submitReply;
window.deleteReply = deleteReply;
window.toggleReplies = toggleReplies;
window.loginAdmin = loginAdmin;
window.logoutAdmin = logoutAdmin;
window.setRating = setRating;

// ─── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  checkAdminStatus();
  loadReviews();
});
