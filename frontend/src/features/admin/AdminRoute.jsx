import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }) {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));
    
    if (!token || user?.role !== "admin") {
        return <Navigate to="/Login_Register" replace />;
    }

    return children;
}