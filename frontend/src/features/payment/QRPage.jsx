import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { markAsPaid } from '../../api/transactionApi';

// ─── Thông tin ngân hàng hiển thị cho user ────────────────────────────────────
// Phải khớp với tài khoản nhận tiền thật của bạn
const BANK = {
  bin:         '970436',       // BIN Vietcombank — KHÔNG thay đổi nếu dùng VCB
  shortName:   'VCB',
  fullName:    'Vietcombank',
  accountNo:   '1032213127',
  accountName: 'NOVA GLOBAL MARKETS',
};

// Tạo URL ảnh QR từ VietQR (img.vietqr.io trả ảnh PNG, không bị CORS với <img>)
// Dùng BIN thay vì tên ngân hàng để chắc chắn đúng
function buildQRUrl(amountVND, description) {
  const p = new URLSearchParams({
    amount:      amountVND,
    addInfo:     description,
    accountName: BANK.accountName,
  });
  return `https://img.vietqr.io/image/${BANK.bin}-${BANK.accountNo}-qr_only.png?${p}`;
}

export default function QRPage() {
  const navigate    = useNavigate();
  const location    = useLocation();

  // Backend POST /deposit trả về: { transaction_id, reference_code, amount, qr_url, ... }
  const transaction = location.state?.transaction;

  const [timeLeft,   setTimeLeft]   = useState(600);   // 10 phút
  const [qrStatus,   setQrStatus]   = useState('loading'); // loading | ok | error
  const [qrKey,      setQrKey]      = useState(0);      // tăng để reload <img>
  const [copied,     setCopied]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  // ── Countdown ──────────────────────────────────────────────────────────────
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

  // ── Nếu reload trang (mất state) ──────────────────────────────────────────
  if (!transaction) {
    return (
      <div style={s.centerFull}>
        <div style={s.errorBox}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <p style={s.errorText}>Không có dữ liệu giao dịch.</p>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
            Vui lòng quay lại và tạo yêu cầu nạp tiền mới.
          </p>
          <button style={s.btnBlue} onClick={() => navigate(-1)}>← Quay lại</button>
        </div>
      </div>
    );
  }

  // ── Lấy đúng field từ response backend ────────────────────────────────────
  // Backend trả về: { transaction_id, reference_code, amount }
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

  // Gọi POST /api/transactions/deposit/:id/paid
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
        alert(
            err.response?.data?.message ||
            "Có lỗi xảy ra, vui lòng thử lại."
        );
        } finally {
        setSubmitting(false);
    }
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>← Quay lại</button>
        <span style={s.headerTitle}>Thanh toán chuyển khoản</span>
        <div style={{ width: 90 }} />
      </header>

      <main style={s.main}>
        <div style={s.card}>

          {/* ── Cột trái: thông tin giao dịch ───────────────────────────── */}
          <div style={s.leftCol}>
            <p style={s.colLabel}>Thông tin chuyển khoản</p>

            {/* Các dòng thông tin */}
            {[
              ['Ngân hàng',     `${BANK.fullName} (${BANK.shortName})`],
              ['Chủ tài khoản', BANK.accountName],
              ['Mã giao dịch',  refCode],
            ].map(([k, v]) => (
              <div key={k} style={s.row}>
                <span style={s.rowKey}>{k}</span>
                <span style={s.rowVal}>{v}</span>
              </div>
            ))}

            {/* Số TK + nút copy */}
            <div style={s.row}>
              <span style={s.rowKey}>Số tài khoản</span>
              <span style={{ ...s.rowVal, display: 'flex', alignItems: 'center', gap: 8 }}>
                {BANK.accountNo}
                <button
                  style={copied ? { ...s.copyBtn, ...s.copyDone } : s.copyBtn}
                  onClick={copyAccNo}
                >
                  {copied ? '✓ Đã sao chép' : 'Sao chép'}
                </button>
              </span>
            </div>

            {/* Nội dung chuyển khoản — quan trọng nhất */}
            <div style={s.row}>
              <span style={s.rowKey}>Nội dung CK</span>
              <span style={{ ...s.rowVal, ...s.mono }}>{description}</span>
            </div>

            {/* Số tiền */}
            <div style={s.amountBox}>
              <span style={s.amountLabel}>Số tiền cần chuyển</span>
              <span style={s.amountNum}>
                {amountVND.toLocaleString('vi-VN')}
                <span style={s.amountUnit}> ₫</span>
              </span>
            </div>

            {/* Countdown */}
            <div style={{ ...s.cdBox, ...(isExpired ? s.cdExpired : {}) }}>
              {isExpired ? (
                <>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#b91c1c' }}>
                    Giao dịch đã hết hạn
                  </span>
                  <button style={s.btnRed} onClick={() => navigate(-1)}>
                    Tạo lại giao dịch
                  </button>
                </>
              ) : (
                <>
                  <span style={s.cdLabel}>Hết hạn sau</span>
                  <span style={s.cdNum}>{fmt(timeLeft)}</span>
                </>
              )}
            </div>

            {/* Hướng dẫn */}
            <div style={s.guide}>
              <p style={s.guideTitle}>Hướng dẫn thanh toán</p>
              {[
                'Mở app ngân hàng bất kỳ (VCB, MB, TCB...)',
                'Chọn "Quét mã QR" hoặc "Chuyển khoản"',
                'Nhập đúng số tiền và nội dung chuyển khoản',
                'Xác nhận — tiền về ngay lập tức',
              ].map((t, i) => (
                <div key={i} style={s.guideRow}>
                  <span style={s.guideNum}>{i + 1}</span>
                  <span style={s.guideText}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={s.divider} />

          {/* ── Cột phải: QR ────────────────────────────────────────────── */}
          <div style={s.rightCol}>
            <p style={s.colLabel}>Quét mã QR</p>

            {/* Khung QR */}
            <div style={s.qrBox}>
              {qrStatus === 'loading' && (
                <div style={s.qrCenter}>
                  <div style={s.spinner} />
                  <span style={s.qrHint}>Đang tải mã QR...</span>
                </div>
              )}
              {qrStatus === 'error' && (
                <div style={s.qrCenter}>
                  <span style={{ fontSize: 28 }}>❌</span>
                  <span style={s.qrHint}>Không tải được QR</span>
                  <button
                    style={s.retryBtn}
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
                style={{ ...s.qrImg, display: qrStatus === 'ok' ? 'block' : 'none' }}
                onLoad={() => setQrStatus('ok')}
                onError={() => setQrStatus('error')}
              />
            </div>

            <p style={s.qrNote}>Hỗ trợ tất cả app ngân hàng Việt Nam</p>

            {/* Bank badges */}
            <div style={s.badges}>
              {['VCB', 'MB', 'TCB', 'ACB', 'VPB', 'BIDV', '+30'].map(b => (
                <span key={b} style={s.badge}>{b}</span>
              ))}
            </div>

            {/* Nút xác nhận đã chuyển */}
            <button
              style={isExpired || submitting ? s.btnGreenOff : s.btnGreen}
              disabled={isExpired || submitting}
              onClick={handlePaid}
            >
              {submitting ? 'Đang gửi...' : '✓  Tôi đã chuyển khoản xong'}
            </button>

            <p style={s.paidNote}>
              Bấm sau khi đã chuyển khoản thành công.
              <br />Admin sẽ xác nhận và cộng tiền vào tài khoản.
            </p>
          </div>

        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh', background: '#f1f5f9',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  header: {
    height: 54, background: '#fff', borderBottom: '1px solid #e2e8f0',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 24px', position: 'sticky', top: 0, zIndex: 20,
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  },
  backBtn: {
    background: 'none', border: 'none', fontSize: 13, color: '#64748b',
    cursor: 'pointer', width: 90, textAlign: 'left', padding: 0,
  },
  headerTitle: { fontSize: 15, fontWeight: 600, color: '#0f172a' },

  main: { display: 'flex', justifyContent: 'center', padding: '28px 16px 48px' },
  card: {
    background: '#fff', borderRadius: 16,
    boxShadow: '0 2px 20px rgba(0,0,0,0.07)',
    display: 'flex', width: '100%', maxWidth: 880, overflow: 'hidden',
  },

  leftCol:  { flex: 1, padding: '28px', minWidth: 0 },
  divider:  { width: 1, background: '#f1f5f9', flexShrink: 0 },
  rightCol: {
    width: 300, padding: '28px 24px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },

  colLabel: {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 18px',
  },

  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 12, padding: '9px 0', borderBottom: '1px solid #f8fafc',
  },
  rowKey: { fontSize: 13, color: '#64748b', flexShrink: 0 },
  rowVal: { fontSize: 13, fontWeight: 600, color: '#0f172a', textAlign: 'right' },
  mono:   {
    fontFamily: 'monospace', color: '#1d4ed8',
    background: '#eff6ff', padding: '2px 8px', borderRadius: 4,
  },

  copyBtn: {
    fontSize: 11, padding: '3px 8px', borderRadius: 4,
    border: '1px solid #cbd5e1', background: '#fff', color: '#475569',
    cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 500,
  },
  copyDone: { background: '#f0fdf4', borderColor: '#86efac', color: '#15803d' },

  amountBox: {
    marginTop: 18, background: '#f8fafc', border: '1px solid #e2e8f0',
    borderRadius: 12, padding: '14px 18px',
    display: 'flex', flexDirection: 'column', gap: 5,
  },
  amountLabel: {
    fontSize: 11, color: '#94a3b8', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  amountNum:  { fontSize: 26, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px' },
  amountUnit: { fontSize: 16, fontWeight: 400, color: '#64748b' },

  cdBox: {
    marginTop: 14, background: '#fff7ed', border: '1px solid #fed7aa',
    borderRadius: 10, padding: '11px 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  cdExpired: {
    background: '#fef2f2', border: '1px solid #fecaca',
    flexDirection: 'column', gap: 10, alignItems: 'center',
  },
  cdLabel: { fontSize: 13, color: '#92400e', fontWeight: 500 },
  cdNum:   { fontSize: 20, fontWeight: 700, color: '#ea580c', fontFamily: 'monospace' },

  guide: {
    marginTop: 18, background: '#f8fafc', border: '1px solid #e2e8f0',
    borderRadius: 10, padding: '14px 16px',
  },
  guideTitle: {
    fontSize: 11, fontWeight: 700, color: '#374151',
    textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px',
  },
  guideRow:  { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  guideNum:  {
    width: 20, height: 20, borderRadius: '50%', background: '#1d4ed8',
    color: '#fff', fontSize: 11, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  guideText: { fontSize: 13, color: '#4b5563', lineHeight: 1.5 },

  // QR
  qrBox: {
    width: 220, height: 220, borderRadius: 12, border: '2px solid #e2e8f0',
    background: '#f8fafc', display: 'flex', alignItems: 'center',
    justifyContent: 'center', overflow: 'hidden', marginBottom: 12,
  },
  qrCenter: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  spinner: {
    width: 28, height: 28,
    border: '3px solid #e2e8f0', borderTopColor: '#1d4ed8',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  qrHint:   { fontSize: 12, color: '#94a3b8' },
  retryBtn: {
    fontSize: 12, padding: '5px 12px', background: '#fff',
    border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', color: '#374151',
  },
  qrImg:    { width: '100%', height: '100%', objectFit: 'contain' },
  qrNote:   { fontSize: 12, color: '#64748b', textAlign: 'center', margin: '0 0 10px' },

  badges: { display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center', marginBottom: 20 },
  badge:  {
    fontSize: 10, fontWeight: 700, color: '#475569',
    background: '#f1f5f9', border: '1px solid #e2e8f0',
    borderRadius: 4, padding: '2px 6px',
  },

  btnGreen: {
    width: '100%', padding: '13px', background: '#16a34a', color: '#fff',
    border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
  btnGreenOff: {
    width: '100%', padding: '13px', background: '#d1fae5', color: '#6ee7b7',
    border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'not-allowed',
  },
  btnRed: {
    fontSize: 13, padding: '6px 16px', background: '#ef4444',
    color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
  },
  btnBlue: {
    padding: '8px 20px', background: '#1d4ed8', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
  },

  paidNote: {
    fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 10, lineHeight: 1.6,
  },

  centerFull: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: '#f1f5f9',
  },
  errorBox: {
    textAlign: 'center', padding: 40, background: '#fff',
    borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', maxWidth: 360,
  },
  errorText: { color: '#0f172a', marginBottom: 8, fontSize: 16, fontWeight: 600 },
};