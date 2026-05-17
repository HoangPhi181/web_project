import React, {useState, useEffect }from 'react'
import { useNavigate } from "react-router-dom";
import "../../styles/PaymentPage.css"
import Sidebar from "../../component/Sidebar";
import Header from "../../component/Header";
import { deposit , markAsPaid} from '../../api/transactionApi';

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

  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  

  const handleDeposit = async (e) => {
    e.preventDefault();

    if (!amount || Number(amount) <= 0) {
      alert("Số tiền không hợp lệ");
      return;
    }

    if (!accountId) {
      alert("Vui lòng nhập account ID");
      return;
    }

    try {
      setLoading(true);

      const res = await deposit({
        amount: Number(amount),
        account_id: accountId
      });

      navigate("/QRPage", {
        state: {
          transaction: res.data
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

      <label>Phương thức chuyển khoản ngân hàng (*):</label>
      <input 
        type="text" 
        placeholder="Thanh toán nhanh chóng qua VietQR"
        readOnly
      />

      <label>Đến tài khoản (*):</label>
      <input 
        type="text"
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        required
      />

      <label>Số tiền (*):</label>
      <input 
        type="number"
        placeholder= "0 USD"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <p  style={{
          padding: "16px 18px",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "4px",
          color: "white",
          fontSize: "18px",
      }}>
        Số tiền cần nạp: {Math.round(Number(amount) * 26300).toLocaleString("vi-VN")} VNĐ
      </p>

      <button className='deposit' type="submit" disabled={loading}>
        {loading ? "Đang xử lý..." : "Nạp tiền"}
      </button>
    </form>
  );
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
