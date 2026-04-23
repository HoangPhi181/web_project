import React from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../component/Sidebar";
import Header from "../../component/Header";

function WithdrawalContent() {
  const navigate = useNavigate();

  return (
    <form>
      <h2>Rút Tiền:</h2>

      <label>Phương thức thanh toán:</label>
      <input type="text" id="paymentMethod" placeholder="" readOnly />
      
      <label>Đơn vị tiền tệ</label>
      <input type="text" placeholder="VND" readOnly />


      <label>Từ tài khoản:</label>
      <input type="text" required />

      <label>Phương thức chuyển khoản ngân hàng:</label>
      <input type="text" placeholder="Internet Banking" readOnly />

      <label>Số tiền:</label>
      <input type="number" required />
      <p className="note">15.00 - 10,000.00 USD</p>

      <span><p>số tiền cần rút</p> <p>0 VND</p></span>

      <button className="withDrawal">Rút tiền</button>
    </form>
  );
}

export default function WithdrawalPage() {
  return (
    <>
      <style>
        {`
        .withdrawal-container {
            color: #fff;
            min-height: 100vh;
        }

        .withdrawal-layout {
            display: grid;
            grid-template-columns: 20px 1fr;
        }

        .withdrawal-layout form {
            max-width: 700px;
            margin: 40px 500px;
            width: 90%;
            background: rgba(255,255,255,0.1);
            padding: 25px;
            border-radius: 4px;
            box-shadow: 0 0 15px rgba(0,0,0,0.5);
        }

        .withdrawal-layout h2 {
            margin-bottom: 20px;
        }

        .withdrawal-layout label {
            display: block;
            margin-top: 15px;
            margin-bottom: 5px;
            font-size: 14px;
            color: #ccc;
        }

        .withdrawal-layout input {
            width: 96%;
            padding: 12px;
            border-radius: 4px;
            border: 1px solid #333;
            background: #111;
            color: white;
            outline: none;
            transition: 0.3s;
        }

        .withdrawal-layout input:focus {
            border: 1px solid #ff6a00;
            box-shadow: 0 0 5px #ff6a00;
        }

        .withdrawal-layout p {
            font-size: 13px;
            color: #aaa;
            margin-top: 5px;
        }
        .withdrawal-layout .note {
            color: #13b1e6;
        }

        .withdrawal-layout span {
            display: flex;
            width: 96%;
            justify-content: space-between;
            margin-top: 15px;
            background: rgba(255,255,255,0.05);
            padding: 10px;
            border-radius: 4px;
        }
        .withdrawal-layout span p {
            font-size: 15px;
            font-weight: bold;
        }

        .withdrawal-layout .withDrawal {
            width: 99%;
            margin-top: 20px;
            padding: 12px;
            background: linear-gradient(90deg, #ff6a00, #ff2e00);
            border-radius: 4px;
            color: white;
            font-weight: bold;
            cursor: pointer;
            transition: 0.3s;
        }

        .withdrawal-layout button:hover {
            transform: scale(1.03);
            opacity: 0.9;
        }
        `}
      </style>

      <div className="withdrawal-container">
        <Header />

        <div className="withdrawal-layout">
          <Sidebar />
          <WithdrawalContent />
        </div>
      </div>
    </>
  );
}