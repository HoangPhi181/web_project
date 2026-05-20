import "../../styles/HomePage.css";

export function SupportSection({ close }) {
    return (
        <div className="support-overlay">
        <div className="support-box">
            <div className="support-header">
            <button className="close-btn"onClick={close}>×</button>
            <div className="support-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
                <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                </svg>
            </div>
            <h2>Hỗ trợ khách hàng</h2>
            </div>

            <div className="support-body">
            <div className="online-badge">
                <span className="badge-dot" />
                Đang hoạt động 24/7
            </div>

            <p>Đội ngũ Nova luôn sẵn sàng hỗ trợ bạn trong quá trình giao dịch và quản lý tài khoản.</p>

            <div className="support-divider"><span>Liên hệ</span></div>

            <div className="support-contact">
                <div className="contact-card">
                <div className="contact-icon">✉</div>
                <h3>Email</h3>
                <span>support@nova.com</span>
                </div>
                <div className="contact-card">
                <div className="contact-icon">☎</div>
                <h3>Hotline</h3>
                <span>024 86.868.686 </span>
                </div>
            </div>

            <button className="support-btn">Liên hệ ngay</button>
            </div>
        </div>
        </div>
    );
}