import { useState } from "react";
import { Link } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import signupbg from "../assets/images/signupbg.jpeg";
import AuthLayout from "../components/AuthLayout";
import "../assets/styles/auth.css";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!name.trim()) return alert("Please enter your name.");
    if (!email.trim()) return alert("Please enter your email.");
    if (newPassword.length < 6) return alert("Password must be at least 6 characters.");
   if (newPassword !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, newPassword);
    alert("Account created successfully!");
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      alert("An account with this email already exists. Please sign in.");
    } else if (error.code === "auth/invalid-email") {
      alert("Please enter a valid email address.");
    } else if (error.code === "auth/weak-password") {
      alert("Password should be at least 6 characters.");
    } else {
      alert(error.message);
    }
  }
};

  const handleGoogleSignup = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      alert("Signed up with Google!");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <AuthLayout imageUrl={signupbg}>
      <div className="auth-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M7.5 10V8.5a4.5 4.5 0 0 1 9 0V10"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M7.2 10h9.6c1 0 1.8.8 1.8 1.8v7.2c0 1-.8 1.8-1.8 1.8H7.2c-1 0-1.8-.8-1.8-1.8v-7.2c0-1 .8-1.8 1.8-1.8Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      </div>

      <h1 className="auth-title">Sign Up</h1>
      <p className="auth-subtitle">Create your account to get started</p>

      <form className="auth-form" onSubmit={handleSignup}>
        {/* Name */}
        <label className="auth-label">Name</label>
        <div className="auth-inputWrap">
          <span className="auth-leadingIcon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 21a8 8 0 0 0-16 0"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <input
            className="auth-input"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Email */}
        <label className="auth-label">Email Address</label>
        <div className="auth-inputWrap">
          <span className="auth-leadingIcon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M4.5 7.5h15v9a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-9Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M5.2 8.2 12 13.2l6.8-5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <input
            className="auth-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* New Password */}
        <label className="auth-label">New password</label>
        <div className="auth-inputWrap">
          <span className="auth-leadingIcon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M14.5 10.5a4 4 0 1 0-1.2 2.9L21 21v-3h-2v-2h-2v-2h-2.2l-1.7-1.7"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <input
            className="auth-input"
            type={showNew ? "text" : "password"}
            placeholder="Enter your password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <button
            type="button"
            className="auth-trailingBtn"
            onClick={() => setShowNew((s) => !s)}
            aria-label={showNew ? "Hide password" : "Show password"}
          >
            {/* eye icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                stroke="currentColor"
                strokeWidth="1.7"
              />
            </svg>
          </button>
        </div>

        {/* Confirm Password */}
        <label className="auth-label">Confirm Password</label>
        <div className="auth-inputWrap">
          <span className="auth-leadingIcon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M14.5 10.5a4 4 0 1 0-1.2 2.9L21 21v-3h-2v-2h-2v-2h-2.2l-1.7-1.7"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <input
            className="auth-input"
            type={showConfirm ? "text" : "password"}
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button
            type="button"
            className="auth-trailingBtn"
            onClick={() => setShowConfirm((s) => !s)}
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                stroke="currentColor"
                strokeWidth="1.7"
              />
            </svg>
          </button>
        </div>

        <button className="auth-primaryBtn" type="submit">
          Sign up
        </button>

        <div className="auth-divider">
          <span />
          <p>OR</p>
          <span />
        </div>

        <button className="auth-googleBtn" type="button" onClick={handleGoogleSignup}>
          <span style={{ display: "inline-flex" }}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#FFC107"
                d="M43.611 20.083H42V20H24v8h11.303C33.649 32.657 29.229 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.965 3.035l5.657-5.657C34.047 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
              />
              <path
                fill="#FF3D00"
                d="M6.306 14.691 12.88 19.51C14.659 15.108 18.97 12 24 12c3.059 0 5.842 1.154 7.965 3.035l5.657-5.657C34.047 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.166 0 9.86-1.977 13.409-5.197l-6.191-5.238C29.19 35.091 26.715 36 24 36c-5.208 0-9.615-3.317-11.287-7.946l-6.525 5.026C9.505 39.556 16.227 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.611 20.083H42V20H24v8h11.303a12.07 12.07 0 0 1-4.085 5.565l.003-.002 6.191 5.238C36.97 39.2 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
              />
            </svg>
          </span>
          <span>Sign up with Google</span>
        </button>

        <p className="auth-bottomText">
          Already have an account? <Link to="/">Sign In</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
