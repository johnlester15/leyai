import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      background: "#111",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div style={{
          fontSize: "8rem",
          fontWeight: 900,
          color: "#3ecf8e",
          lineHeight: 1,
          letterSpacing: "-4px",
        }}>
          404
        </div>
        <div style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          margin: "1rem 0 0.5rem",
          color: "#ededed",
        }}>
          Page Not Found
        </div>
        <p style={{ fontSize: "0.875rem", color: "#555" }}>
          The page you're looking for doesn't exist.
        </p>
        <Link href="/" style={{
          display: "inline-block",
          marginTop: "2rem",
          padding: "0.65rem 1.5rem",
          background: "#3ecf8e",
          color: "#000",
          fontWeight: 700,
          fontSize: "0.875rem",
          borderRadius: "10px",
          textDecoration: "none",
        }}>
          Go Home
        </Link>
      </div>
    </div>
  );
}