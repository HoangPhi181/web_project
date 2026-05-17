import useMarketMediator from "../../services/MarketMediator";
import Sidebar from "./Sidebar";
import Header from "./Header";
import TradeForm from "../../component/TradeForm";
import OrdersTable from "../../component/OrdersTable";
import PriceChart from "../../component/PriceChart";
import "../../styles/MarketPage.css";

export default function MarketPage() {
    const mediator = useMarketMediator();

    if (mediator.pageLoading) {
        return <h2>Loading...</h2>;
    }

    return (
        <div className="marketPage-container">
            <Header
                selectedProduct={mediator.selectedProduct}
                balance={mediator.balance}
            />
            <main className="market-container">
                <Sidebar
                    products={mediator.products}
                    selectedProductId={mediator.tradeForm.product_id}
                    onSelect={mediator.handleSelectProduct}
                />

                <PriceChart
                    onPriceChange={mediator.setCurrentPrice}
                    orders={mediator.orders}
                />

                <TradeForm
                    symbol={mediator.selectedProduct?.symbol}
                    currentPrice={mediator.currentPrice}
                    tradeForm={mediator.tradeForm}
                    orderLoading={mediator.orderLoading}
                    onInputChange={mediator.handleInputChange}
                    onPlaceOrder={mediator.handlePlaceOrder}
                />
            </main>
            <OrdersTable
                orders={mediator.orders}
                closingId={mediator.closingId}
                currentPrice={mediator.currentPrice}
                onClose={mediator.handleClose}
            />
        </div>
    );
}