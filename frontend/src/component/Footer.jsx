
export default function Footer() {
  return (
    <>
      <style>{`
        .footer {
          background: black;
          border-top: 1px solid rgba(255,255,255,0.08);
        }

        .footer-container {
          max-width: 1280px;
          margin: auto;
          padding: 56px 24px;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 48px;
        }

        .footer-logo {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          background: linear-gradient(
            135deg,
            #22d3ee,
            #3b82f6
          );
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: black;
          box-shadow: 0 10px 30px rgba(34,211,238,0.2);
        }

        .footer-title {
          color: white;
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .footer-subtitle {
          color: #22d3ee;
          font-size: 14px;
        }

        .footer-desc {
          color: #94a3b8;
          font-size: 14px;
          line-height: 1.8;
          margin-top: 18px;
        }

        .footer-heading {
          color: white;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 20px;
        }

        .footer-links {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .footer-links li {
          margin-bottom: 14px;
        }

        .footer-links a {
          color: #94a3b8;
          text-decoration: none;
          font-size: 14px;
          transition: 0.3s;
        }

        .footer-links a:hover {
          color: #22d3ee;
          padding-left: 6px;
        }

        .socials {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .social-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: 0.3s;
        }

        .social-btn:hover {
          transform: translateY(-4px);
          border-color: #22d3ee;
          background: rgba(34,211,238,0.1);
          color: white;
          box-shadow: 0 10px 30px rgba(34,211,238,0.15);
        }

        .footer-bottom {
          border-top: 1px solid rgba(255,255,255,0.08);
          margin-top: 56px;
          padding-top: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .footer-warning {
          color: #64748b;
          font-size: 12px;
          line-height: 1.7;
          max-width: 700px;
        }

        .footer-copy {
          color: #475569;
          font-size: 12px;
        }

        .footer-bottom img{
          margin-left:12px;
        }

        @media (max-width: 768px) {
          .footer-bottom {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <footer className="footer">
        <div className="footer-container">

          <div className="footer-grid">

            {/* Brand */}
            <div>
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <div className="footer-logo">
                  Nova
                </div>

                <div>
                  <div className="footer-title">
                    TradeGuide
                  </div>

                  <div className="footer-subtitle">
                    Pro Trading
                  </div>
                </div>
              </div>

              <p className="footer-desc">
                Hướng dẫn giao dịch cho người mới.
                Học trading, quản lý vốn và phân tích thị trường một cách bài bản.
              </p>
            </div>

            {/* Hoc tap */}
            <div>
              <h3 className="footer-heading">
                Học tập
              </h3>

              <ul className="footer-links">
                <li><a href="#">Hướng dẫn đặt lệnh</a></li>
                <li><a href="#">Phân tích kỹ thuật</a></li>
                <li><a href="#">Quản lý rủi ro</a></li>
                <li><a href="#">Tâm lý giao dịch</a></li>
              </ul>
            </div>

            {/* Cong cu */}
            <div>
              <h3 className="footer-heading">
                Công cụ
              </h3>

              <ul className="footer-links">
                <li><a href="#">Risk Calculator</a></li>
                <li><a href="#">Lot Size Calculator</a></li>
                <li><a href="#">Trading Journal</a></li>
                <li><a href="#">Demo Trading</a></li>
              </ul>
            </div>

            {/* Cong dong */}
            <div>
              <h3 className="footer-heading">
                Tin tức thị trường
              </h3>

              <div className="socials">
                <div className="social-btn" onClick={() => window.open("https://www.forexfactory.com/", "_blank")}>
                    <img
                        src="https://resources.faireconomy.media/icon-ff.ico"
                        width="30"
                        height="30"
                        alt="Forex Factory"
                    />
                </div>
                <div className="social-btn" onClick={() => window.open("https://vn.investing.com/", "_blank")}>
                    <img src="data:image/png;base64,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" 
                        width="30"
                        height="30"
                        alt="Investing"
                    />
                </div>
                <div className="social-btn" onClick={() => window.open("https://www.financialjuice.com/", "_blank")}>
                    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAApUlEQVR4AWNQ1bXAilx9Qtt7JsFRWXWjio45UBynhpzCiv9I4MbN20BBqmqwdfErKK2Bo5TMQoSTgCygK3smTMOD0P3w7dv3/xgA00nkagDaBfQifhSfkoMerBCdti0zsCLLkjbs8eB/6Hbg8YeYyHP1IaAsxRqAlpplVmFFRnF5+JIGMKYmTp2NjOqaOvFp2LXnAN54oFyDf1g8MPEgo4i4dIiTAIb7T1XWX/FwAAAAAElFTkSuQmCC" 
                        width="30"
                        height="30"
                        alt="Investing"
                    />
                </div>
              </div>

              <p className="footer-desc">
                Giúp trader nắm bắt nhanh tin tức thị trường và chuyển động kinh tế thế giới đang xảy ra.
              </p>
            </div>
          </div>

          {/* Bottom */}
          <div className="footer-bottom">

            <p className="footer-warning">
              Trading có rủi ro cao. Chỉ giao dịch với số tiền bạn có thể chấp nhận mất.
              Đây không phải lời khuyên đầu tư tài chính
            </p>

            <p className="footer-copy">
              © 2026 NovaTrade
            </p>

            <img src="https://cloud.xm-cdn.com/web/xmbz/ng-public/assets/icons/app-store.svg" width="140" height="40" alt="App Store icon" aria-hidden="true" className="ng-star-inserted"/>
            <img src="https://cloud.xm-cdn.com/web/xmbz/ng-public/assets/icons/google-play.svg" width="140" height="40" alt="Google Play Store icon" aria-hidden="true" className="ng-star-inserted"/>
          </div>
        </div>
      </footer>
    </>
  );
}

