import Link from "next/link";

export default function TopBar() {
  return (
    <header
      className="no-print"
      style={{
        backgroundColor: "#1F4E78",
        color: "#ffffff",
        padding: "0 24px",
        height: "52px",
        display: "flex",
        alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <Link
        href="/"
        style={{
          color: "#ffffff",
          textDecoration: "none",
          fontWeight: "700",
          fontSize: "17px",
          letterSpacing: "0.02em",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        ⛵ セーリング得点管理
      </Link>
    </header>
  );
}
