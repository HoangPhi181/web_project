1. Cấu trúc cây thư mục frontend

src/
│
├── api/                     gọi backend (axios)
│   ├── axiosClient.js
│   ├── authApi.js
│   ├── accountApi.js
│   ├── orderApi.js
│   ├── productApi.js
│
├── services/               xử lý logic (optional nhưng nên có)
│   ├── authService.js
│   ├── orderService.js
│
├── components/             UI dùng lại nhiều nơi
│   ├── Header.jsx
│   ├── Sidebar.jsx
│   ├── PriceChart.jsx
│   ├── QRCode.jsx
│
├── features/               Domain-based
│   ├── auth/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │
│   ├── trading/
│   │   ├── MarketPage.jsx
│   │   ├── OrderTable.jsx
│   │   ├── TradePanel.jsx
│   │
│   ├── account/
│   │   ├── UserPage.jsx
│   │   ├── HistoryPage.jsx
│   │   ├── PerformancePage.jsx
│   │   ├── Profile.jsx
│
│   ├── payment/
│   │   ├── PaymentPage.jsx
│   │   ├── WithdrawalPage.jsx
|   |   ├── QRPage.jsx
│
│   ├── admin/
│       ├── Dashboard.jsx
│       ├── CreateCode.jsx
│       ├── ManagerUsers.jsx
│
├── hooks/                  custom hooks
│   ├── useAuth.js
│   ├── useOrders.js
│   ├── useBalance.js
│
├── styles/
├── main.jsx
├── index.css