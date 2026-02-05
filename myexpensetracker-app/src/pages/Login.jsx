import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import bg from "../assets/images/Loginpage_background.jpeg";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Login successful!");
      navigate("/dashboard");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      alert("Google login successful!");
      navigate("/dashboard");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <AuthLayout imageUrl={bg}>
      <div className="auth-icon">
        <LockIcon />
      </div>

      <h1 className="auth-title">Welcome Back</h1>
      <p className="auth-subtitle">Sign in to your account</p>
      <form className="auth-form" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
        <label className="auth-label">Email Address</label>
        <div className="auth-inputWrap">
          <span className="auth-leadingIcon">
            <MailIcon />
          </span>
          <input
            className="auth-input"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <label className="auth-label">Password</label>
        <div className="auth-inputWrap">
          <span className="auth-leadingIcon">
            <KeyIcon />
          </span>
          <input
            className="auth-input"
            type={showPw ? "text" : "password"}
            placeholder="Enter your password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="auth-trailingBtn"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            <EyeIcon open={showPw} />
          </button>
        </div>

        <div className="auth-rowBetween">
          <label className="auth-checkbox">
            <input type="checkbox" />
            <span>Remember me</span>
          </label>

          <button
            type="button"
            className="auth-linkBtn"
            onClick={handleGoogleLogin}
          >
            Forgot password?
          </button>
        </div>

        <button className="auth-primaryBtn" type="submit">
          Sign In
        </button>

        <div className="auth-divider">
          <span />
          <p>OR</p>
          <span />
        </div>

        <button
          className="auth-googleBtn"
          type="button"
          onClick={handleGoogleLogin}
        >
          <GoogleIcon />
          <span>Sign in with Google</span>
        </button>

        <p className="auth-bottomText">
          Don&apos;t have an account? <Link to="/signup">Sign up</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

function LockIcon() {
  return (
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
  );
}
function MailIcon() {
  return (
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
  );
}
function KeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M14.5 10.5a4 4 0 1 0-1.2 2.9L21 21v-3h-2v-2h-2v-2h-2.2l-1.7-1.7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M10.6 10.6A2.8 2.8 0 0 0 12 15a3 3 0 0 0 2.4-1.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M5.2 8.6C3.5 10.3 2.5 12 2.5 12s3.5 7 9.5 7c1.7 0 3.2-.4 4.5-1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M9.5 5.5A9.5 9.5 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-2.1 3.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
function GoogleIcon() {
  return (
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
  );
}