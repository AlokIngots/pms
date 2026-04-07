import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { path: "/",               label: "Live dashboard",      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { path: "/orders",         label: "Sales orders",        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { path: "/batches",        label: "Batches / Job cards", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
  { path: "/alerts",         label: "Alert centre",        icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  { path: "/qc",             label: "Quality checks",      icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" },
  { path: "/dispatch",       label: "Dispatch",            icon: "M17 8l4 4m0 0l-4 4m4-4H3" },
  { path: "/documents",      label: "Documents",           icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" },
  { path: "/reports",        label: "OTD reports",         icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { path: "/production-log", label: "Production",          icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { path: "/operator-log",   label: "Operator log",        icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { path: "/material-log",   label: "Material map",        icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
  { path: "/admin",          label: "Admin",               icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

        .sidebar {
          width: 200px;
          min-height: 100vh;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #e5e7eb;
          flex-shrink: 0;
          font-family: 'Inter', sans-serif;
        }

        .sidebar-logo {
          padding: 14px 16px;
          border-bottom: 1px solid #f3f4f6;
          cursor: pointer;
          background: #ffffff;
        }

        .logo-img {
          width: 100%;
          max-width: 185px;
          height: auto;
          display: block;
        }

        .nav-scroll {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 8px 0;
          scrollbar-width: none;
        }

        .nav-scroll::-webkit-scrollbar { display: none; }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 7px 12px;
          margin: 1px 6px;
          border-radius: 7px;
          cursor: pointer;
          transition: background 0.12s ease;
        }

        .nav-item:hover {
          background: #f9fafb;
        }

        .nav-item.active {
          background: #eff6ff;
        }

        .nav-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          color: #9ca3af;
          transition: color 0.12s ease;
          stroke-width: 1.7;
        }

        .nav-item:hover .nav-icon {
          color: #6b7280;
        }

        .nav-item.active .nav-icon {
          color: #2563eb;
        }

        .nav-label {
          font-size: 13px;
          font-weight: 400;
          color: #6b7280;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: color 0.12s ease;
          line-height: 1.4;
        }

        .nav-item:hover .nav-label {
          color: #374151;
        }

        .nav-item.active .nav-label {
          color: #1d4ed8;
          font-weight: 500;
        }

        .sidebar-footer {
          padding: 12px 14px;
          border-top: 1px solid #f3f4f6;
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #dbeafe;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          color: #1d4ed8;
          flex-shrink: 0;
        }

        .footer-info {
          overflow: hidden;
          flex: 1;
        }

        .footer-name {
          font-size: 12px;
          font-weight: 600;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .footer-role {
          font-size: 10px;
          color: #9ca3af;
          margin-top: 1px;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 5px;
          border: none;
          background: transparent;
          cursor: pointer;
          color: #9ca3af;
          transition: all 0.12s ease;
          padding: 0;
        }

        .logout-btn:hover {
          background: #fee2e2;
          color: #ef4444;
        }
      `}</style>

      <div className="sidebar">

        {/* Logo */}
        <div className="sidebar-logo" onClick={() => navigate("/")}>
          <img src="/ALOK_Logo.png" alt="Alok Ingots" className="logo-img" />
        </div>

        {/* Nav items */}
        <div className="nav-scroll">
          {navItems.map((item) => (
            <div
              key={item.path + item.label}
              className={`nav-item ${isActive(item.path) ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <svg
                className="nav-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={item.icon} />
              </svg>
              <span className="nav-label">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="avatar">AG</div>
          <div className="footer-info">
            <div className="footer-name">Alok Garodia</div>
            <div className="footer-role">Admin</div>
          </div>
          <button className="logout-btn" title="Logout">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>

      </div>
    </>
  );
}