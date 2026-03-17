import React from 'react'
import "../styles/Background.css";

export default function Background() {
  return (
    <div class="container">
         <div class="BackGround_container">
            <header>
                <h1>Nova</h1>
                <h2>Professional Hedge Trading Dashboard</h2>
            </header>
            <main>
                <h3>Nâng cấp cách bạn giao dịch</h3> 
                <div class="BackGround_Animation">NOVA</div>
                <p class ="p1">Giao dịch với nhà môi giới bán lẻ lớn nhất thế giới và hưởng lợi từ các điều kiện tốt hơn thị trường.</p>
                <div class="btnGroup">
                    <a href = "LogIn_SignUp.html"><button class ="btnDK"> Đăng ký</button></a>
                    <button class = "btnDEMO"> tài khoản Demo miễn phí</button>
                </div>
                <div class="textGroup_features">
                    <div class="feature">
                        <i class="fa-solid fa-shield"></i>
                        <span>Sàn uy tín</span>
                    </div>

                    <div class="feature">
                        <i class="fa-solid fa-file-circle-check"></i>
                        <span>Nhiều giấy phép pháp lý</span>
                    </div>

                    <div class="feature">
                        <i class="fa-solid fa-headset"></i>
                        <span>Hỗ trợ 24/7 bằng tiếng Việt</span>
                    </div>

                    <div class="feature">
                        <i class="fa-solid fa-credit-card"></i>
                        <span>Đạt chuẩn PCI DSS</span>
                    </div>
                </div>
            </main>
            

        </div>

        <div class="Introduction_container">
            <h1>Giao dịch tài sản từ thị trường toàn cầu</h1>
            <h2>Tận dụng mọi cơ hội với những tài sản phổ biến nhất thế giới.</h2>
            <table>
                <tr>
                    <th>Công cụ Giao dịch</th>
                    <th>Đòn bẩy</th>
                    <th>Biên độ trung bình, điểm cơ bản</th>
                    <th>Miễn phí qua đêm</th>
                    <th></th>
                </tr>
                <tr>
                    <td>
                        <a href = "https://www.exness.com/vi/commodities/xauusd">XAU/USD</a> 
                        <br/>Vàng
                    </td>
                    <td>Tùy chỉnh</td>
                    <td>25.2</td>
                    <td>Khả dụng</td>
                    <td>Kim loại</td>
                </tr>
                <tr>
                    <td><a href = "">BTC/USD</a> <br /> Bitcoin</td>
                    <td>1:400</td>
                    <td>45.0</td>
                    <td>Khả dụng</td>
                    <td>Tiền điện tử</td>
                </tr>
            </table>
        </div>
    </div>
  )
}

