import { useNavigate } from "react-router-dom";

export default function Header({
    selectedProduct, // Truyền object sản phẩm đã chọn
    balance,         // Truyền số dư
}) {
    const navigate = useNavigate(); // Khai báo hook để chuyển trang

    return (
        <header>
            <div className="logo">Nova</div>
            
            {/* Hiển thị symbol của sản phẩm đang chọn */}
            <div className="symbol">
                {selectedProduct?.symbol || ""}
            </div>

            {/* Hiển thị số dư được format */}
            <div className="balance">
                {Number(balance || 0).toFixed(2).toLocaleString()} USD
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