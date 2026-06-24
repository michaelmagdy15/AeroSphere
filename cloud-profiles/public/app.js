import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signOut,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

// Firebase Config matches the project's config
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAUvzDIKoTvtbMEWaP1pDSyNfqpS3_11wI',
  authDomain: 'faa-test-guide-v2.firebaseapp.com',
  projectId: 'faa-test-guide-v2',
  storageBucket: 'faa-test-guide-v2.firebasestorage.app',
  messagingSenderId: '492280162134',
  appId: '1:492280162134:web:d0cdc39920840fcb2d98f7',
};

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);

// API base URL (since static site is hosted on the same domain, we can use empty prefix or window.location.origin)
const API_BASE = window.location.origin;

// ── DOM Elements ──
const authScreen = document.getElementById("auth-screen");
const dashboardScreen = document.getElementById("dashboard-screen");

const tabSignIn = document.getElementById("tab-signin");
const tabSignUp = document.getElementById("tab-signup");
const formSignIn = document.getElementById("form-signin");
const formSignUp = document.getElementById("form-signup");

const userDisplayName = document.getElementById("user-display-name");
const userTier = document.getElementById("user-tier");
const btnLogout = document.getElementById("btn-logout");

const profileEmail = document.getElementById("profile-email");
const profileJoined = document.getElementById("profile-joined");
const profileCount = document.getElementById("profile-count");
const profileReputation = document.getElementById("profile-reputation");

const trialProgress = document.getElementById("trial-progress");
const trialDaysBadge = document.getElementById("trial-days-badge");
const trialPanel = document.querySelector(".trial-panel");

const statusCareer = document.getElementById("status-career");
const statusCockpit = document.getElementById("status-cockpit");
const cardCareer = document.getElementById("card-career");
const cardCockpit = document.getElementById("card-cockpit");
const btnBuyCareer = document.getElementById("btn-buy-career");
const btnBuyCockpit = document.getElementById("btn-buy-cockpit");

const checkoutModal = document.getElementById("checkout-modal");
const btnModalClose = document.getElementById("btn-modal-close");
const formCheckout = document.getElementById("form-checkout");
const checkoutTitle = document.getElementById("checkout-title");
const checkoutItemName = document.getElementById("checkout-item-name");

const toast = document.getElementById("toast");

let activeFeature = null;

// ── Auth Tab Switching ──
tabSignIn.addEventListener("click", () => {
  tabSignIn.classList.add("active");
  tabSignUp.classList.remove("active");
  formSignIn.classList.add("active");
  formSignUp.classList.remove("active");
});

tabSignUp.addEventListener("click", () => {
  tabSignUp.classList.add("active");
  tabSignIn.classList.remove("active");
  formSignUp.classList.add("active");
  formSignIn.classList.remove("active");
});

// ── Toast Utility ──
function showToast(message, type = "success") {
  toast.innerText = message;
  toast.className = `toast active ${type}`;
  setTimeout(() => {
    toast.classList.remove("active");
  }, 4000);
}

// ── Form Submissions ──

// 1. Sign In
formSignIn.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signin-email").value;
  const password = document.getElementById("signin-password").value;
  const btn = formSignIn.querySelector("button[type='submit']");

  btn.classList.add("loading");
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showToast("Signed in successfully!");
  } catch (err) {
    showToast(err.message.replace("Firebase: ", ""), "error");
  } finally {
    btn.classList.remove("loading");
  }
});

// 2. Sign Up
formSignUp.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("signup-username").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const btn = formSignUp.querySelector("button[type='submit']");

  btn.classList.add("loading");
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: username });
    
    // Register the user profile with the Cloud Run backend
    const token = await cred.user.getIdToken();
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error("Failed to register pilot profile on backend");
    }

    showToast("Account created successfully!");
  } catch (err) {
    showToast(err.message.replace("Firebase: ", ""), "error");
  } finally {
    btn.classList.remove("loading");
  }
});

// 3. Sign Out
btnLogout.addEventListener("click", () => {
  signOut(auth).then(() => {
    showToast("Signed out successfully!");
  });
});

// ── Fetch Profile & Update UI ──
async function fetchProfile(user) {
  try {
    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error("Unable to fetch user profile");
    }

    const data = await res.json();
    updateDashboardUI(user, data);
  } catch (err) {
    console.error(err);
    showToast("Failed to sync profile. Try signing in again.", "error");
  }
}

function updateDashboardUI(user, profile) {
  // Set User Badge
  userDisplayName.innerText = profile.displayName || user.email;
  
  // Set credentials table
  profileEmail.innerText = user.email;
  profileCount.innerText = profile.profileCount ?? 0;
  profileReputation.innerText = `${profile.reputation ?? 0} XP`;

  // Parse Joined Date
  let joinedDate = new Date();
  if (profile.joinedAt) {
    joinedDate = new Date(profile.joinedAt._seconds ? profile.joinedAt._seconds * 1000 : profile.joinedAt);
  }
  profileJoined.innerText = joinedDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calculate Trial Remaining
  const diffMs = Date.now() - joinedDate.getTime();
  const diffDays = Math.max(0, 30 - Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  
  if (diffDays > 0) {
    trialDaysBadge.innerText = `${diffDays} days left`;
    trialProgress.style.width = `${(diffDays / 30) * 100}%`;
    trialPanel.classList.remove("expired");
    userTier.innerText = "Trial";
    userTier.className = "badge";
  } else {
    trialDaysBadge.innerText = "Expired";
    trialProgress.style.width = "0%";
    trialPanel.classList.add("expired");
    document.getElementById("trial-description").innerText = "Your 30-day trial has ended. Upgrade features below to continue.";
    userTier.innerText = "Basic";
    userTier.className = "badge";
  }

  // Feature upgrades
  // 1. Career Mode
  if (profile.purchasedCareer) {
    statusCareer.className = "status-badge status-unlocked";
    statusCareer.innerText = "Unlocked";
    cardCareer.classList.add("unlocked");
  } else if (diffDays > 0) {
    statusCareer.className = "status-badge status-trial";
    statusCareer.innerText = "Free Trial";
    cardCareer.classList.remove("unlocked");
  } else {
    statusCareer.className = "status-badge status-locked";
    statusCareer.innerText = "Locked";
    cardCareer.classList.remove("unlocked");
  }

  // 2. Shared Cockpit
  if (profile.purchasedSharedCockpit) {
    statusCockpit.className = "status-badge status-unlocked";
    statusCockpit.innerText = "Unlocked";
    cardCockpit.classList.add("unlocked");
  } else if (diffDays > 0) {
    statusCockpit.className = "status-badge status-trial";
    statusCockpit.innerText = "Free Trial";
    cardCockpit.classList.remove("unlocked");
  } else {
    statusCockpit.className = "status-badge status-locked";
    statusCockpit.innerText = "Locked";
    cardCockpit.classList.remove("unlocked");
  }

  // Overall subscription badge
  if (profile.purchasedCareer && profile.purchasedSharedCockpit) {
    userTier.innerText = "PRO";
    userTier.className = "badge pro";
  }
}

// ── Payment Modal Actions ──
btnBuyCareer.addEventListener("click", () => {
  activeFeature = "career";
  checkoutTitle.innerText = "Unlock Career Mode";
  checkoutItemName.innerText = "Career Mode Lifetime License";
  checkoutModal.classList.add("active");
});

btnBuyCockpit.addEventListener("click", () => {
  activeFeature = "cockpit";
  checkoutTitle.innerText = "Unlock Shared Cockpit";
  checkoutItemName.innerText = "Shared Cockpit Lifetime License";
  checkoutModal.classList.add("active");
});

btnModalClose.addEventListener("click", () => {
  checkoutModal.classList.remove("active");
  activeFeature = null;
});

// Close modal on background click
checkoutModal.addEventListener("click", (e) => {
  if (e.target === checkoutModal) {
    checkoutModal.classList.remove("active");
    activeFeature = null;
  }
});

// Confirm Checkout
formCheckout.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = formCheckout.querySelector("button[type='submit']");
  btn.classList.add("loading");

  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Authentication required");

    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api/auth/purchase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ feature: activeFeature })
    });

    if (!res.ok) {
      throw new Error("Payment transaction failed on server");
    }

    showToast(`Payment successful! ${activeFeature === 'career' ? 'Career Mode' : 'Shared Cockpit'} unlocked!`);
    checkoutModal.classList.remove("active");
    
    // Refresh user state
    await fetchProfile(user);
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.classList.remove("loading");
  }
});

// ── Listen to Firebase Auth Changes ──
onAuthStateChanged(auth, (user) => {
  if (user) {
    authScreen.classList.remove("active");
    dashboardScreen.classList.add("active");
    fetchProfile(user);
  } else {
    dashboardScreen.classList.remove("active");
    authScreen.classList.add("active");
  }
});
