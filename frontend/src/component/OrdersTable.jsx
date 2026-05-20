/*------------hiển thị lệnh đang mở--------------------*/
export default function OrdersTable({ orders, pageLoading, closingId, currentPrice, onClose }) {
    return (
        <section className="orders">
            <h3>Các lệnh đang mở</h3>

            {pageLoading ? (
                <p>Đang tải dữ liệu...</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Sản phẩm</th>
                            <th>Loại</th>
                            <th>Lot</th>
                            <th>Giá mở</th>
                            <th>TP</th>
                            <th>SL</th>
                            <th>Giờ mở</th>
                            <th>Lãi/Lỗ</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((item) => (
                            <tr key={item.order_id || item.id}>
                                <td>{item.symbol}</td>

                                <td className={item.side === "BUY" ? "text-buy" : "text-sell"}>
                                    {item.side}
                                </td>

                                <td>{Number(item.volume).toFixed(2)}</td>

                                <td>{Number(item.open_price).toFixed(2)}</td>

                                <td>
                                    {item.take_profit !== null && item.take_profit !== undefined
                                        ? Number(item.take_profit).toFixed(2)
                                        : "-"}
                                </td>

                                <td>
                                    {item.stop_loss !== null && item.stop_loss !== undefined
                                        ? Number(item.stop_loss).toFixed(2)
                                        : "-"}
                                </td>

                                <td>{new Date(item.opened_at).toLocaleTimeString()}</td>

                                <td className={Number(item.floating_pnl || 0) >= 0 ? "profit" : "loss"}>
                                    {Number(item.floating_pnl || 0) >= 0
                                        ? `+${Number(item.floating_pnl).toFixed(2)}`
                                        : Number(item.floating_pnl).toFixed(2)}
                                </td>

                                <td>
                                    <button
                                        onClick={() => onClose(item.order_id, currentPrice)}
                                        disabled={closingId === item.order_id}
                                    >
                                        {closingId === item.order_id ? "..." : "✕"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </section>
    );
}
