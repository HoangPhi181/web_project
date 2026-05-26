import { useState } from 'react'
import "../../styles/HomePage.css";
import { useNavigate } from "react-router-dom";
import { FaShieldAlt, FaCheckCircle, FaHeadset, FaCreditCard } from "react-icons/fa";
import { SupportSection } from './Support';
import Footer from '../../component/Footer';

function Header() {
  return (
    <header>
      <h1>Nova</h1>
      <h2>Professional Hedge Trading Dashboard</h2>
    </header>
  );
}

function Feature({ icon, text }) {
  return (
    <div className="feature">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function MainContent({navigate}) {
  const [showSupport, setShowSupport] = useState(false);
  return (
    <main>
       <h3>Nâng cấp cách bạn giao dịch</h3>

       <div className="BackGround_Animation">NOVA</div>

       <p className="p1">
            Giao dịch với nhà môi giới bán lẻ lớn nhất thế giới và hưởng lợi từ các
            điều kiện tốt hơn thị trường.
       </p>

        <div className="btnGroup">
            <button className="btnDN" onClick={() => navigate("/Login_Register")}>Đăng nhập</button>
            <button className="btnDEMO" onClick={() => navigate("/Login_Register")}>Tài khoản Demo miễn phí</button>
        </div>

        <div className="textGroup_features">
          <Feature icon={<FaShieldAlt />} text="Sàn uy tín" />
          <Feature icon={<FaCheckCircle />} text="Nhiều giấy phép pháp lý" />
          <div className="support" onClick={() => setShowSupport(true)}>
            <Feature icon={<FaHeadset />} text="Hỗ trợ 24/7 bằng tiếng Việt" />
          </div>
          <Feature icon={<FaCreditCard />} text="Đạt chuẩn PCI DSS" />
        </div>
        {showSupport && (<SupportSection close={() => setShowSupport(false)} />)}
    </main>
  );
}

function TableRow({ icon, name, link, desc, leverage, spread, overnight, type }) {
  return (
    <tr>
        <td className="symbol-cell">
          <img src={icon} alt="" />

          <div className="symbol-text">
            <a
              href={link}
              className="symbol"
              target="_blank"
              rel="noopener noreferrer"
            >
              {name}
            </a>
            <span className="desc">{desc}</span>
          </div>
        </td>

        <td>{leverage}</td>
        <td>{spread}</td>
        <td>{overnight}</td>
        <td>{type}</td>
    </tr>
  );
}

function Introduction() {
  return (
    <div className="Introduction_container">
      <h1>Giao dịch tài sản từ thị trường toàn cầu</h1>
      <h2>
        Tận dụng mọi cơ hội với những tài sản phổ biến nhất thế giới.
      </h2>

      <table>
        <thead>
          <tr>
            <th>Công cụ Giao dịch</th>
            <th>Đòn bẩy</th>
            <th>Biên độ trung bình</th>
            <th>Miễn phí qua đêm</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          <TableRow
            icon="/btc16x16.svg"
            name="BTC/USD"
            link="https://bitcoin.org/en/about/foundation"
            desc="Bitcoin"
            leverage="1:100"
            spread="45.0"
            overnight="Khả dụng"
            type="Tiền điện tử"
          />

          <TableRow
            icon="/eth.png"
            name="ETH/USD"
            link="https://ethereum.org/en/"
            desc="Ethereum"
            leverage="1:100"
            spread="8.5"
            overnight="Khả dụng"
            type="Tiền điện tử"
          />

          <TableRow
            icon="/xrp.png"
            name="XRP/USD"
            link="https://ripple.com/xrp/"
            desc="XRP"
            leverage="1:100"
            spread="1.2"
            overnight="Khả dụng"
            type="Tiền điện tử"
          />

        </tbody>
      </table>

      <div className ="image-box">
        <img src = "/Introduction.png"/>
      </div>
    </div>
  );
}

export default function Background() {
    const navigate = useNavigate(); 
    return (
        <div className="background-container">
            <div className="BackGround_container">
                <Header />
                <MainContent navigate={navigate} />
            </div>

            <Introduction />
            <Footer />
        </div>
    );
}