import React, {useState, useEffect }from 'react'
import { useNavigate } from "react-router-dom";
import "../../styles/PaymentPage.css"
import Sidebar from "../../component/Sidebar";
import Header from "../../component/Header";
import { deposit } from '../../api/transactionApi';
import { useTransaction } from '../../hooks/useTransactionCode';

function Menu() {
  return (
    <main className='main-container'> 
      <h1>Nạp Tiền</h1> 
      <p>Giao dịch thanh toán qua bên thứ ba là không được phép
        Chỉ sử dụng tài khoản thanh toán thuộc quyền sở hữu của bạn. Việc sử dụng tài 
        khoản của bên thứ ba có thể khiến bạn bị hạn chế sử dụng phương thức thanh toán 
        vĩnh viễn hoặc bị chấm dứt tài khoản.</p>

      <Content />
    </main>
    
  )
}

function Content() {
  const navigate = useNavigate();

  const {code, generateCode} = useTransaction();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    generateCode();
  },[]);

  const handleDeposit = async (e) => {
    e.preventDefault(); // ❗ chặn reload form

    if (!amount || Number(amount) <= 0) {
      alert("Số tiền không hợp lệ");
      return;
    }

    try {
      setLoading(true);

      const res = await deposit({
        amount: Number(amount),
      });

      const data = res.data;

      // 👉 chuyển sang QR page + truyền data
      navigate("/QRPage", {
        state: {
          transaction: data
        }
      });

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Lỗi nạp tiền");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleDeposit}>
      <h2>Thông tin nạp tiền:</h2>
      <label>Mã giao dịch (*):</label>
      <input 
        type="text"
        id="transactionCode"  
        placeholder=""
        value={code}
        readOnly
      />
      <label>Nhập account ID (*):</label>
      <input 
        type="text"
        id="accountID"  
        placeholder="#Account ID"
        required
      />
      <label>Số tiền (*):</label>
      <input 
        type="number"
        id="money"  
        placeholder="100$"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      {/* <button className = "deposit" onClick={() => navigate("/QRPage")}>Nạp tiền</button> */}
      <button className="deposit" type="submit" disabled={loading}>
        {loading ? "Đang xử lý..." : "Nạp tiền"}
      </button>
    </form>
  )
}

export default function PaymentPage() {
  return (
    <div className='paymentPage-container'>
      <Header/>
      <div className='payment-container'>
        <Sidebar/>
        <Menu/>
      </div>
    </div>
  )
}
