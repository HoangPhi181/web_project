import { useState, useEffect, useMemo, useCallback } from "react";
import { create, opening, close, balance as getBalance } from "../api/orderApi";

/*----------------------------------------------------------------------
useMarketMediator – điều phối toàn bộ state và logic của MarketPage
Các component con chỉ nhận props từ đây, không gọi API trực tiếp
---------------------------------------------------------------------*/
export default function useMarketMediator(initialAccountType = "REAL") {

    const products = [
        { id: 1, symbol: "BTC/USD" },
        { id: 2, symbol: "ETH/USD" },
        { id: 3, symbol: "XRP/USD" },
    ];

    const [orders, setOrders] = useState([]);
    const [balance, setBalance] = useState(0);
    const [pageLoading, setPageLoading] = useState(true);
    const [orderLoading, setOrderLoading] = useState(false);
    const [closingId, setClosingId] = useState(null);
    const [currentPrice, setCurrentPrice] = useState(0);

    const [accountType, setAccountType] = useState(initialAccountType);

    const [tradeForm, setTradeForm] = useState({
        product_id: 1,
        side: "BUY",
        volume: 0.1,
        stop_loss: null,
        take_profit: null,
    });

    const selectedProduct = useMemo(
        () => products.find((p) => p.id === tradeForm.product_id),
        [tradeForm.product_id]
    );

    const authHeader = () => ({
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        params: {
            type: accountType
        }
    });

    // console.log("Current account type:", accountType);

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
            const resB = await getBalance(authHeader());
            const accounts = resB.data || [];

            const currentAccount = accounts.find(
                (account) =>
                    account.account_type?.toUpperCase() === accountType.toUpperCase()
            );

            if (currentAccount) {
                setBalance(currentAccount.balance);
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
        const interval = setInterval(() => fetchData(false), 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setTradeForm((prev) => ({ ...prev, [name]: value }));
    }, []);

    const handleSelectProduct = useCallback((productId) => {
        setTradeForm((prev) => ({ ...prev, product_id: productId }));
    }, []);

    const handlePlaceOrder = useCallback(async (side) => {
        try {
            setOrderLoading(true);

            const payload = {
                product_id: Number(tradeForm.product_id),
                side,
                volume: Number(tradeForm.volume),
                stop_loss:
                    tradeForm.stop_loss === ""
                        ? null
                        : Number(tradeForm.stop_loss),
                take_profit:
                    tradeForm.take_profit === ""
                        ? null
                        : Number(tradeForm.take_profit),
            };

            await create(payload, authHeader());
            alert(`Đặt lệnh ${side} thành công!`);
            await fetchData(false);
        } catch (error) {
            console.log(error.response?.data);

            const msg =
                error.response?.data?.message ||
                JSON.stringify(error.response?.data?.errors) ||
                "Có lỗi xảy ra";

            alert("Lỗi đặt lệnh: " + msg);
        } finally {
            setOrderLoading(false);
        }
    }, [tradeForm, fetchData]);

    const handleClose = useCallback(async (orderId, price) => {
        if (closingId === orderId) return;

        try {
            setClosingId(orderId);

            await close(
                orderId,
                { close_price: Number(price) },
                authHeader()
            );

            await fetchOrders(false);
        } catch (err) {
            console.error(err);
        } finally {
            setClosingId(null);
        }
    }, [closingId, fetchOrders]);

    return {
        products,
        orders,
        balance,
        currentPrice,
        selectedProduct,
        tradeForm,
        pageLoading,
        orderLoading,
        closingId,
        accountType,
        setAccountType,
        setCurrentPrice,
        handleInputChange,
        handleSelectProduct,
        handlePlaceOrder,
        handleClose,
    };
}