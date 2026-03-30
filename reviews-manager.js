import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const ADMIN_TOKEN = "your-secret-token-here"; // Change this to something secure
let isAdmin = false;

// Check if user is admin
function checkAdminStatus() {
  const token = sessionStorage.getItem('adminToken');
  isAdmin = token === ADMIN_TOKEN;
  updateAdminUI();
}

// Admin login
function loginAdmin() {
  const token = prompt("Enter admin token:");
  if (token === ADMIN_TOKEN) {
    sessionStorage.setItem('adminToken', token);
    isAdmin = true;
    alert("Admin mode activated!");
    updateAdminUI();
    loadReviews();
  } else {
    alert("Invalid token");
    isAdmin = false;
  }
}

// Logout admin
function logoutAdmin() {
  sessionStorage.removeItem('adminToken');
  isAdmin = false;
  updateAdminUI();
  loadReviews();
}

// Censor name for non-admin users
function censorName(name) {
  if (isAdmin) return name;
  if (!name || name.length < 2) return name;
  const first = name.charAt(0);
  const last = name.charAt(name.length - 1);
  const asterisks = '*'.repeat(Math.max(1, name.length - 2));
  return first + asterisks + last;
}

// Format date
function formatDate(timestamp) {
  if (!timestamp) return 'Just now';
  const date = new Date(timestamp.seconds * 1000);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Submit review
async function submitReview() {
  const name = document.getElementById('rev-name').value.trim();
  const service = document.getElementById('rev-service').value;
  const text = document.getElementById('rev-text').value.trim();
  const revMsg = document.getElementById('rev-msg');

  if (!name || !service || rating === 0 || !text) {
    revMsg.textContent = '⚠ Fill in all fields';
    revMsg.style.color = '#c8c4bc';
    return;
  }

  try {
    revMsg.textContent = 'Submitting...';
    
    await addDoc(collection(db, 'reviews'), {
      name: name,
      service: service,
      rating: rating,
      text: text,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    });

    revMsg.textContent = '✓ Review submitted! Thank you.';
    revMsg.style.color = '#c8c4bc';
    
    // Reset form
    document.getElementById('rev-name').value = '';
    document.getElementById('rev-service').value = '';
    document.getElementById('rev-text').value = '';
    rating = 0;
    document.querySelectorAll('.star-btn').forEach(btn => btn.classList.remove('active'));
    
    // Reload reviews
    setTimeout(loadReviews, 1000);
  } catch (error) {
    console.error('Error submitting review:', error);
    revMsg.textContent = '✗ Error submitting review';
    revMsg.style.color = '#c8c4bc';
  }
}

// Load and display reviews
async function loadReviews() {
  try {
    const q = query(collection(db, 'reviews'), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    const list = document.getElementById('reviewsList');
    const noRev = document.getElementById('noReviews');

    if (querySnapshot.empty) {
      noRev.style.display = 'block';
      list.innerHTML = '';
      return;
    }

    noRev.style.display = 'none';
    list.innerHTML = '';

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const card = document.createElement('div');
      card.className = 'review-card';
      
      const displayName = censorName(data.name);
      const stars = '★'.repeat(data.rating) + '☆'.repeat(5 - data.rating);
      
      card.innerHTML = `
        <div class="review-header">
          <div>
            <div class="review-name">${displayName}</div>
            <div class="review-service-tag">${data.service}</div>
          </div>
          ${isAdmin ? `<button class="delete-review-btn" onclick="deleteReview('${doc.id}')">✕ Delete</button>` : ''}
        </div>
        <div class="review-stars">${stars}</div>
        <div class="review-text">${data.text}</div>
        <div class="review-date">${formatDate(data.timestamp)}</div>
      `;
      
      list.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading reviews:', error);
  }
}

// Delete review (admin only)
async function deleteReview(reviewId) {
  if (!isAdmin) {
    alert('Admin access required');
    return;
  }

  if (!confirm('Delete this review?')) return;

  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
    loadReviews();
  } catch (error) {
    console.error('Error deleting review:', error);
    alert('Error deleting review');
  }
}

// Update admin UI visibility
function updateAdminUI() {
  const adminControls = document.getElementById('adminControls');
  if (isAdmin) {
    adminControls.style.display = 'block';
    adminControls.innerHTML = `<button class="admin-logout-btn" onclick="logoutAdmin()">Logout Admin</button>`;
  } else {
    adminControls.style.display = 'block';
    adminControls.innerHTML = `<button class="admin-login-btn" onclick="loginAdmin()">Admin Panel</button>`;
  }
}

// Export functions for global use
window.submitReview = submitReview;
window.deleteReview = deleteReview;
window.loginAdmin = loginAdmin;
window.logoutAdmin = logoutAdmin;
window.setRating = setRating;

let rating = 0;

function setRating(val) {
  rating = val;
  document.querySelectorAll('.star-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i < val);
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  checkAdminStatus();
  loadReviews();
});
