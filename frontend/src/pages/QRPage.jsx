import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react'; // Thư viện vẽ mã QR
import { useNavigate } from 'react-router-dom'; // Thư viện điều hướng trang

export default function QRPage() {
    const navigate = useNavigate();
    
    // Khởi tạo state lưu trữ số tiền nạp
    const [amount, setAmount] = useState(2630000); 
    
    // Khởi tạo state đếm ngược (600 giây = 10 phút)
    const [timeLeft, setTimeLeft] = useState(600); 

    // Hook chạy bộ đếm ngược thời gian
    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    // Hàm định dạng số giây thành phút:giây (VD: 09:59)
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Chuỗi dữ liệu để tạo mã QR
    const momoPaymentUrl = `https://payment.momo.vn/pay/v2/gateway/api/create?amount=${amount}&orderId=qr-PAY-99212`;

    return (
        <div className="qr-page-wrapper">
            <style>{`
                .qr-page-wrapper {
                    background-color: #fff6fb; /* Nền hồng cực nhạt cho hợp không khí hoa đào */
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    overflow: hidden; /* Ngăn cánh hoa tạo thanh cuộn */
                }

                /* --- CSS HIỆU ỨNG HOA ĐÀO RƠI --- */
                .cherry-blossom-container {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none; /* Để không chặn click chuột vào các nút bên dưới */
                    z-index: 1;
                }

                .petal {
                    position: absolute;
                    background-color: #eaa6b4;
                    border-radius: 150% 0 150% 150%; /* Tạo hình cánh hoa đào */
                    opacity: 0.8;
                    animation: fall-sway linear infinite;
                }

                @keyframes fall-sway {
                    0% {
                        top: -10%;
                        transform: translateX(0) rotate(0deg);
                        opacity: 0;
                    }
                    10% { opacity: 0.8; }
                    90% { opacity: 0.8; }
                    100% {
                        top: 110%;
                        transform: translateX(100px) rotate(720deg);
                        opacity: 0;
                    }
                }

                /* Tạo các cánh hoa với vị trí và thời gian rơi ngẫu nhiên */
                /* Ví dụ bộ thông số mới cho hoa to và rõ hơn */
                .petal:nth-child(1) { left: 5%;  width: 25px; height: 25px; animation-duration: 8s; }
                .petal:nth-child(2) { left: 15%; width: 18px; height: 18px; animation-duration: 12s; }
                .petal:nth-child(3) { left: 25%; width: 35px; height: 35px; animation-duration: 10s; }
                .petal:nth-child(4) { left: 35%; width: 22px; height: 22px; animation-duration: 7s; }
                .petal:nth-child(5) { left: 50%; width: 28px; height: 28px; animation-duration: 9s; }
                .petal:nth-child(6) { left: 65%; width: 20px; height: 20px; animation-duration: 11s; }
                .petal:nth-child(7) { left: 80%; width: 32px; height: 32px; animation-duration: 13s; }
                .petal:nth-child(8) { left: 90%; width: 26px; height: 26px; animation-duration: 8s; }

                /* --- GIỮ NGUYÊN GIAO DIỆN CŨ --- */
                .qr-header {
                    height: 60px;
                    background: white;
                    display: flex;
                    align-items: center;
                    padding: 0 20px;
                    border-bottom: 3px solid #ccc;
                    box-shadow: 0 0 20px rgba(0,0,0,0.1);
                    position: relative;
                    z-index: 10;
                }
                .qr-logo {
                    display: flex;
                    align-items: center; 
                    font-size: 18px;
                    font-weight: 600;
                    gap: 10px; 
                }
                .qr-logo img { width: 36px; height: auto; border-radius: 4px; }
                
                .main-content {
                    flex: 1;
                    display: flex;
                    justify-content: center;
                    padding: 60px;
                    font-size: 28px;
                    position: relative;
                    z-index: 10;
                }
                .payment-container {
                    display: flex;
                    width: 900px;
                    background: white;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                }
                .order-section {
                    flex: 1;
                    padding: 40px;
                    color: #333;
                    border-right: 1px solid #eee;
                }
                .order-section h2 {
                    font-size: 18px;
                    margin-bottom: 25px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 10px;
                    font-weight: 700;
                }
                .info-group { margin-bottom: 18px; }
                .label { font-size: 13px; color: #777; display: block; }
                .value { font-size: 15px; font-weight: 600; color: #222; }
                .price-tag { font-size: 28px; font-weight: 800; color: #333; margin-top: 5px; }
                
                .timeout-box {
                    margin-top: 30px;
                    background: #fff0f6;
                    padding: 15px;
                    border-radius: 8px;
                    text-align: center;
                }
                .timeout-text { color: #d63384; font-size: 13px; font-weight: 600; }
                .countdown { font-size: 24px; font-weight: bold; color: #d63384; }

                .qr-section {
                    flex: 1.2;
                    background: #ae1279;
                    padding: 40px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }
                .qr-white-frame {
                    background: white;
                    padding: 15px;
                    border-radius: 12px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                }
                .qr-instruction { margin-top: 20px; font-size: 14px; text-align: center; line-height: 1.6; }
                .btn-return {
                    margin-top: 25px;
                    background: transparent;
                    border: 1px solid rgba(255,255,255,0.6);
                    color: white;
                    padding: 10px 30px;
                    border-radius: 25px;
                    cursor: pointer;
                    font-weight: 600;
                }
                .btn-return:hover { background: rgba(255,255,255,0.15); }
            `}</style>

            {/* Container chứa hoa đào rơi tự động */}
            <div className="cherry-blossom-container">
                <div className="petal"></div>
                <div className="petal"></div>
                <div className="petal"></div>
                <div className="petal"></div>
                <div className="petal"></div>
                <div className="petal"></div>
                <div className="petal"></div>
                <div className="petal"></div>
            </div>

            <header className="qr-header">
                <div className="qr-logo">
                    <img src="https://developers.momo.vn/v2/images/logo.png" alt="MoMo Logo"/> 
                    Cổng thanh toán MoMo
                </div>
            </header>

            <div className="main-content">
                <div className="payment-container">
                    {/* Cột trái: Thông tin */}
                    <div className="order-section">
                        <h2>Thông tin đơn hàng</h2>
                        <div className="info-group">
                            <span className="label">Nhà cung cấp</span>
                            <span className="value">HỆ THỐNG GIAO DỊCH MOMO</span>
                        </div>
                        <div className="info-group">
                            <span className="label">Mã đơn hàng</span>
                            <span className="value">QR-PAY-99212</span>
                        </div>
                        <div className="info-group">
                            <span className="label">Mô tả</span>
                            <span className="value">Nạp tiền vào tài khoản giao dịch</span>
                        </div>
                        <div className="info-group">
                            <span className="label">Số tiền thanh toán</span>
                            <div className="price-tag">{amount.toLocaleString()}đ</div>
                        </div>

                        <div className="timeout-box">
                            <span className="timeout-text">Đơn hàng hết hạn sau:</span>
                            <div className="countdown">{formatTime(timeLeft)}</div>
                        </div>
                    </div>

                    {/* Cột phải: Mã QR */}
                    <div className="qr-section">
                        <div style={{marginBottom: '15px', fontWeight: '600', fontSize: '16px'}}>Quét mã QR để thanh toán</div>
                        <div className="qr-white-frame">
                            <QRCodeCanvas 
                                value={momoPaymentUrl} 
                                size={220} 
                                level="H"
                                imageSettings={{
                                    src: "https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png",
                                    height: 35, width: 35, excavate: true,
                                }}
                            />
                        </div>
                        <div className="qr-instruction">
                            Sử dụng ứng dụng <strong>MoMo</strong> hoặc <br/>
                            Camera hỗ trợ QR để quét mã
                        </div>
                        <button className="btn-return" onClick={() => navigate(-1)}>
                            Quay về
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}