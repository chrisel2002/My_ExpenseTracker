import "../assets/styles/auth.css";

export default function AuthLayout({ imageUrl, children }) {
  return (
    <div className="auth-page">
      <div
        className="auth-left"
        style={{ backgroundImage: `url(${imageUrl})` }}
        aria-hidden="true"
      />
      <div className="auth-right">
        <div className="auth-card">{children}</div>
      </div>
    </div>
  );
}
