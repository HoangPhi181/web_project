import {React} from 'react'
import { useNavigate } from "react-router-dom";
import "../../styles/PaymentPage.css"
import Sidebar from "../../component/Sidebar";
import Header from "../../component/Header";

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
  return (
    <form>
      <h2>Thông tin nạp tiền:</h2>
      <label>Mã giao dịch (*):</label>
      <input 
        type="text"
        id="transactionCode"  
        placeholder=""
        readOnly
      />
      <label>Nhập user ID (*):</label>
      <input 
        type="text"
        id="accountID"  
        placeholder="#User ID"
        required
      />
      <label>Số tiền (*):</label>
      <input 
        type="number"
        id="money"  
        placeholder="100$"
        required
      />
      <button className = "deposit" onClick={() => navigate("/QRPage")}>Nạp tiền</button>
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
