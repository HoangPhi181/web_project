import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { markAsPaid } from '../../api/transactionApi';
import '../../styles/PaymentPage.css';

const BANK = {
  bin:         '970436',
  shortName:   'VCB',
  fullName:    'Vietcombank',
  accountNo:   '1032213127',
  accountName: 'NOVA GLOBAL MARKETS',
};

function buildQRUrl(amountVND, description) {
  const base = `https://img.vietqr.io/image/${BANK.bin}-${BANK.accountNo}-qr_only.png`;
  const params = [
    `amount=${amountVND}`,
    `addInfo=${encodeURIComponent(description)}`,
    `accountName=${encodeURIComponent(BANK.accountName)}`,
  ].join('&');
  return `${base}?${params}`;
}

export default function QRPage() {
  const navigate    = useNavigate();
  const location    = useLocation();

  const transaction = location.state?.transaction;

  const [timeLeft,   setTimeLeft]   = useState(600);
  const [qrStatus,   setQrStatus]   = useState('loading');
  const [qrKey,      setQrKey]      = useState(0);
  const [copied,     setCopied]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!transaction) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  if (!transaction) {
    return (
      <div className="qr-center-full">
        <div className="qr-error-box">
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <p className="qr-error-text">Không có dữ liệu giao dịch.</p>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
            Vui lòng quay lại và tạo yêu cầu nạp tiền mới.
          </p>
          <button className="qr-btn-blue" onClick={() => navigate(-1)}>← Quay lại</button>
        </div>
      </div>
    );
  }

  const txId        = transaction.transaction_id;
  const refCode     = transaction.reference_code || `DEP${txId}`;
  const amountVND   = Math.round(Number(transaction.amount) * 26300);
  const description = `NAP TIEN ${refCode}`;
  const isExpired   = timeLeft === 0;

  const qrImageUrl  = buildQRUrl(amountVND, description);

  const fmt = sec => {
    const m = Math.floor(sec / 60), ss = sec % 60;
    return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  };

  const copyAccNo = () => {
    navigator.clipboard.writeText(BANK.accountNo).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePaid = async () => {
    if (!txId) {
      alert('Không tìm thấy mã giao dịch. Vui lòng thử lại.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await markAsPaid(txId);
      if (res.status === 200) {
        alert("Đã ghi nhận! Admin sẽ xác nhận trong vài phút.");
        navigate("/UserPage");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="qr-page">
      <header className="qr-header">
        <button className="qr-back-btn" onClick={() => navigate(-1)}>← Quay lại</button>
        <span className="qr-header-title">Thanh toán chuyển khoản</span>
        <div className="qr-header-spacer" />
      </header>

      <main className="qr-main">
        <div className="qr-card">

          {/* ── Cột trái ── */}
          <div className="qr-left-col">
            <p className="qr-col-label">Thông tin chuyển khoản</p>

            {[
              ['Ngân hàng',     `${BANK.fullName} (${BANK.shortName})`],
              ['Chủ tài khoản', BANK.accountName],
              ['Mã giao dịch',  refCode],
            ].map(([k, v]) => (
              <div key={k} className="qr-row">
                <span className="qr-row-key">{k}</span>
                <span className="qr-row-val">{v}</span>
              </div>
            ))}

            <div className="qr-row">
              <span className="qr-row-key">Số tài khoản</span>
              <span className="qr-row-val qr-row-val-flex">
                {BANK.accountNo}
                <button
                  className={`qr-copy-btn${copied ? ' qr-copy-done' : ''}`}
                  onClick={copyAccNo}
                >
                  {copied ? '✓ Đã sao chép' : 'Sao chép'}
                </button>
              </span>
            </div>

            <div className="qr-row">
              <span className="qr-row-key">Nội dung CK</span>
              <span className="qr-row-val qr-mono">{description}</span>
            </div>

            <div className="qr-amount-box">
              <span className="qr-amount-label">Số tiền cần chuyển</span>
              <span className="qr-amount-num">
                {amountVND.toLocaleString('vi-VN')}
                <span className="qr-amount-unit"> ₫</span>
              </span>
            </div>

            <div className={`qr-cd-box${isExpired ? ' qr-cd-expired' : ''}`}>
              {isExpired ? (
                <>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#b91c1c' }}>
                    Giao dịch đã hết hạn
                  </span>
                  <button className="qr-btn-red" onClick={() => navigate(-1)}>
                    Tạo lại giao dịch
                  </button>
                </>
              ) : (
                <>
                  <span className="qr-cd-label">Hết hạn sau</span>
                  <span className="qr-cd-num">{fmt(timeLeft)}</span>
                </>
              )}
            </div>

            <div className="qr-guide">
              <p className="qr-guide-title">Hướng dẫn thanh toán</p>
              {[
                'Mở app ngân hàng bất kỳ (VCB, MB, TCB...)',
                'Chọn "Quét mã QR" hoặc "Chuyển khoản"',
                'Nhập đúng số tiền và nội dung chuyển khoản',
                'Xác nhận — tiền về ngay lập tức',
              ].map((t, i) => (
                <div key={i} className="qr-guide-row">
                  <span className="qr-guide-num">{i + 1}</span>
                  <span className="qr-guide-text">{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="qr-divider" />

          {/* ── Cột phải: QR ── */}
          <div className="qr-right-col">
            <p className="qr-col-label">Quét mã QR</p>

            <div className="qr-box">
              {qrStatus === 'loading' && (
                <div className="qr-center">
                  <div className="qr-spinner" />
                  <span className="qr-hint">Đang tải mã QR...</span>
                </div>
              )}
              {qrStatus === 'error' && (
                <div className="qr-center">
                  <span style={{ fontSize: 28 }}>❌</span>
                  <span className="qr-hint">Không tải được QR</span>
                  <button
                    className="qr-retry-btn"
                    onClick={() => { setQrStatus('loading'); setQrKey(k => k + 1); }}
                  >
                    Thử lại
                  </button>
                </div>
              )}
              <img
                key={qrKey}
                src={qrImageUrl}
                alt="VietQR"
                className="qr-img"
                style={{ display: qrStatus === 'ok' ? 'block' : 'none' }}
                onLoad={() => setQrStatus('ok')}
                onError={() => setQrStatus('error')}
              />
            </div>

            <p className="qr-note">Hỗ trợ tất cả app ngân hàng Việt Nam</p>

            <div className="qr-badges">
              {['VCB', 'MB', 'TCB', 'ACB', 'VPB', 'BIDV', '+30'].map(b => (
                <span key={b} className="qr-badge">{b}</span>
              ))}
            </div>

            <button
              className={isExpired || submitting ? 'qr-btn-green-off' : 'qr-btn-green'}
              disabled={isExpired || submitting}
              onClick={handlePaid}
            >
              {submitting ? 'Đang gửi...' : '✓  Tôi đã chuyển khoản xong'}
            </button>

            <p className="qr-paid-note">
              Bấm sau khi đã chuyển khoản thành công.
              <br />Admin sẽ xác nhận và cộng tiền vào tài khoản.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}