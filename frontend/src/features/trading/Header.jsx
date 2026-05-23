import { useNavigate } from "react-router-dom";

export default function Header({
    selectedProduct,
    balance,
}) {
    const navigate = useNavigate(); 

    return (
        <header>
            <div className="logo"
                onClick={() => navigate("/UserPage")}
            >
                Nova
            </div>
            
            {/* Hiển thị symbol của sản phẩm đang chọn */}
            <div className="symbol">
                {selectedProduct?.symbol || ""}
            </div>

            {/* Balance */}
            <div className="balance">
                {balance != null
                    ? Number(balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : "0.00"} USD
            </div>

            <button
                className="deposit"
                onClick={() => navigate("/PaymentPage")}
            >
                Nạp tiền
            </button>
        </header>
    );
}