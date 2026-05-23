import { useState, useEffect, useMemo, useCallback } from "react";
import { create, opening, close, balance as getBalance } from "../api/orderApi";

export default function useMarketMediator(initialAccountType = "REAL") {

    const products = [
        { id: 1, symbol: "BTC/USD" },
        { id: 2, symbol: "ETH/USD" },
        { id: 3, symbol: "XRP/USD" },
    ];

    const [orders,       setOrders]       = useState([]);
    const [balance,      setBalance]      = useState(0);   
    const [equity,       setEquity]       = useState(0);   // balance + floating PnL
    const [usedMargin,   setUsedMargin]   = useState(0);
    const [pageLoading,  setPageLoading]  = useState(true);
    const [orderLoading, setOrderLoading] = useState(false);
    const [closingId,    setClosingId]    = useState(null);
    const [currentPrice, setCurrentPrice] = useState(0);
    const [accountType,  setAccountType]  = useState(initialAccountType);

    const [tradeForm, setTradeForm] = useState({
        product_id: 1, side: "", volume: 0.1, stop_loss: null, take_profit: null,
    });

    const selectedProduct = useMemo(
        () => products.find(p => p.id === tradeForm.product_id),
        [tradeForm.product_id]
    );

    const authHeader = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params:  { type: accountType }
    });

    const fetchOrders = useCallback(async (firstLoad = false) => {
        try {
            if (firstLoad) setPageLoading(true);
            const res = await opening(authHeader());
            setOrders(res.data || []);
        } catch (err) {
            console.error("Lỗi lấy orders:", err);
        } finally {
            if (firstLoad) setPageLoading(false);
        }
    }, [accountType]);

    const fetchBalance = useCallback(async () => {
        try {
            const resB     = await getBalance(authHeader());
            const accounts = resB.data || [];
            const acc      = accounts.find(a => a.account_type?.toUpperCase() === accountType.toUpperCase());
            // console.log("ACC:", acc);
            if (acc) {
                setBalance(parseFloat(acc.balance      ?? 0));
                setUsedMargin(parseFloat(acc.used_margin ?? 0));
                // equity = balance + floating PnL → thay đổi khi lệnh lời/lỗ
                setEquity(parseFloat(acc.equity ?? acc.balance ?? 0));
            }
        } catch (err) {
            console.error("Lỗi lấy balance:", err);
        }
    }, [accountType]);

    const fetchData = useCallback(async (firstLoad = false) => {
        if (firstLoad) setPageLoading(true);
        await Promise.all([fetchOrders(false), fetchBalance()]);
        if (firstLoad) setPageLoading(false);
    }, [fetchOrders, fetchBalance]);

    useEffect(() => {
        fetchData(true);
        const t = setInterval(() => fetchData(false), 10000);
        return () => clearInterval(t);
    }, [fetchData]);

    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setTradeForm(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleSelectProduct = useCallback((productId) => {
        setTradeForm(prev => ({ ...prev, product_id: productId }));
    }, []);

    const handlePlaceOrder = useCallback(async (side) => {
        if (!side) return;

        // Kiểm tra free margin
        if (currentPrice) {
            const required  = (currentPrice * Number(tradeForm.volume)) / 100;
            const free      = balance - usedMargin;
            if (required > free) {
                alert(`Không đủ số dư.\nCần ký quỹ: $${required.toFixed(2)}\nKhả dụng: $${free.toFixed(2)}`);
                return;
            }
        }

        try {
            setOrderLoading(true);
            const payload = {
                product_id:  Number(tradeForm.product_id),
                side,
                volume:      Number(tradeForm.volume),
                stop_loss:   !tradeForm.stop_loss   || tradeForm.stop_loss   === "" ? null : Number(tradeForm.stop_loss),
                take_profit: !tradeForm.take_profit || tradeForm.take_profit === "" ? null : Number(tradeForm.take_profit),
            };
            await create(payload, authHeader());
            alert(`✅ Đặt lệnh ${side} thành công!`);
            setTradeForm(prev => ({ ...prev, side: "", stop_loss: null, take_profit: null }));
            await fetchData(false);
        } catch (error) {
            const data = error.response?.data;
            if (data?.errors && typeof data.errors === 'object') {
                const msgs = Object.values(data.errors).join('\n');
                alert("❌ Lỗi đặt lệnh:\n" + msgs);
            } else {
                alert("❌ Lỗi đặt lệnh: " + (data?.message || "Có lỗi xảy ra"));
            }
        } finally {
            setOrderLoading(false);
        }
    }, [tradeForm, fetchData, currentPrice, balance, usedMargin]);

    const handleClose = useCallback(async (orderId, price) => {
        if (closingId === orderId) return;
        try {
            setClosingId(orderId);
            await close(orderId, { close_price: Number(price) }, authHeader());
            await fetchData(false);
        } catch (err) {
            alert(err.response?.data?.message || "Lỗi đóng lệnh");
        } finally {
            setClosingId(null);
        }
    }, [closingId, fetchData]);

    return {
        products, orders, balance, equity, usedMargin, currentPrice,
        selectedProduct, tradeForm, pageLoading, orderLoading, closingId,
        accountType, setAccountType, setCurrentPrice,
        handleInputChange, handleSelectProduct, handlePlaceOrder, handleClose,
    };
}
