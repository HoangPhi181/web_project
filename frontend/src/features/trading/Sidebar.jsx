/** Sidebar */
export default function Sidebar({
    products = [],
    selectedProductId,
    onSelect
}) {
    return (
        <nav className="sidebar">
            <ul>
                {products.map((product) => (
                    <li
                        key={product.id}
                        className={selectedProductId === product.id ? "active" : ""}
                        onClick={() => onSelect(product.id)}
                    >
                        {product.symbol}
                    </li>
                ))}
            </ul>
        </nav>
    );
}