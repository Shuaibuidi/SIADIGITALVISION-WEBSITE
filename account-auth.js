import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, updateProfile, setPersistence,
  browserLocalPersistence, browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAFP-RfZWPKPcHU9NqtTzX1b8HvVVzkb3Y",
  authDomain: "mobile-tech-room.firebaseapp.com",
  projectId: "mobile-tech-room",
  storageBucket: "mobile-tech-room.firebasestorage.app",
  messagingSenderId: "620229324084",
  appId: "1:620229324084:web:7e2ae7a2550228a4dfc961",
  measurementId: "G-GPJM1C83TT"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = id => document.getElementById(id);
const authReady = setPersistence(auth, browserLocalPersistence)
  .catch(() => setPersistence(auth, browserSessionPersistence));

function showMessage(message, type = "error") {
  const box = $("notice");
  if (!box) return;
  box.textContent = message;
  box.className = "message " + type;
}
function showRegisterMessage(message, type = "error") {
  const box = $("registerNotice");
  if (!box) return;
  box.textContent = message;
  box.className = "message " + type;
}
function friendlyError(error) {
  const messages = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-not-found": "No account was found for this email address.",
    "auth/wrong-password": "The password is incorrect.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/email-already-in-use": "An account already exists with this email. Try signing in.",
    "auth/weak-password": "Choose a stronger password with at least 6 characters.",
    "auth/network-request-failed": "Network error. Check your internet connection and try again.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/operation-not-allowed": "Email/password sign-in is not enabled in Firebase Authentication.",
    "auth/unauthorized-domain": "This website domain is not authorized for Firebase sign-in."
  };
  return messages[error?.code] || ("Could not complete the request: " + (error?.message || "Please try again."));
}
async function redirectApprovedAdmin(user) {
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    const profile = snap.exists() ? snap.data() : {};
    if (profile.role === "admin" && profile.status === "approved") {
      location.replace("admin-portal.html");
      return true;
    }
  } catch (error) {
    console.warn("Admin role check could not be completed:", error);
  }
  return false;
}
function openCustomerDashboard(user, name) {
  $("authArea")?.classList.add("hidden");
  $("dashboard")?.classList.remove("hidden");
  if ($("dashName")) $("dashName").textContent = name || user.displayName || "Customer";
  if ($("dashEmail")) $("dashEmail").textContent = user.email || "—";
  if ($("dashUid")) $("dashUid").textContent = user.uid || "Unavailable";
}

const loginForm = $("loginForm");
if (loginForm) loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  showMessage("");
  const button = loginForm.querySelector('button[type="submit"]');
  if (button) { button.disabled = true; button.textContent = "Signing in…"; }
  try {
    await authReady;
    const email = $("loginEmail")?.value.trim() || "";
    const password = $("loginPassword")?.value || "";
    const credential = await signInWithEmailAndPassword(auth, email, password);
    if (await redirectApprovedAdmin(credential.user)) return;
    openCustomerDashboard(credential.user);
  } catch (error) {
    showMessage(friendlyError(error));
  } finally {
    if (button) { button.disabled = false; button.textContent = "➜  Login"; }
  }
});

const registerButton = $("showRegisterBtn");
if (registerButton) registerButton.addEventListener("click", () => {
  $("loginPanel")?.classList.add("hidden");
  $("registerPanel")?.classList.remove("hidden");
  showRegisterMessage("", "message");
  $("registerName")?.focus();
});
const loginButton = $("showLoginBtn");
if (loginButton) loginButton.addEventListener("click", () => {
  $("registerPanel")?.classList.add("hidden");
  $("loginPanel")?.classList.remove("hidden");
  showMessage("", "message");
  $("loginEmail")?.focus();
});

const registerForm = $("registerForm");
if (registerForm) registerForm.addEventListener("submit", async event => {
  event.preventDefault();
  const button = registerForm.querySelector('button[type="submit"]');
  const name = $("registerName")?.value.trim() || "";
  const email = $("registerEmail")?.value.trim() || "";
  const password = $("registerPassword")?.value || "";
  const confirmation = $("registerConfirmPassword")?.value || "";
  showRegisterMessage("", "message");
  if (name.length < 2) return showRegisterMessage("Please enter your full name.");
  if (password.length < 6) return showRegisterMessage("Password must contain at least 6 characters.");
  if (password !== confirmation) return showRegisterMessage("The passwords do not match.");
  if (button) { button.disabled = true; button.textContent = "Creating account…"; }
  try {
    await authReady;
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    try {
      await setDoc(doc(db, "platformCustomers", credential.user.uid), {
        uid: credential.user.uid, fullName: name, email, createdAt: serverTimestamp()
      }, { merge: true });
    } catch (profileError) {
      console.warn("Customer profile setup deferred:", profileError);
    }
    showRegisterMessage("Account created successfully.", "ok");
    openCustomerDashboard(credential.user, name);
  } catch (error) {
    showRegisterMessage(friendlyError(error));
  } finally {
    if (button) { button.disabled = false; button.textContent = "Create account"; }
  }
});

const forgotButton = $("forgotBtn");
if (forgotButton) forgotButton.addEventListener("click", async () => {
  showMessage("", "message");
  const email = $("loginEmail")?.value.trim() || "";
  if (!email) {
    showMessage("Please enter your email address in the box above first.");
    $("loginEmail")?.focus();
    return;
  }
  forgotButton.disabled = true;
  try {
    await authReady;
    await sendPasswordResetEmail(auth, email);
    showMessage("Password reset email sent. Please check your inbox and spam folder.", "ok");
  } catch (error) {
    showMessage(friendlyError(error));
  } finally {
    forgotButton.disabled = false;
  }
});
