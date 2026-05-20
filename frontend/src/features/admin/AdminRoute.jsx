import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }) {
    const token = localStorage.getItem("token");

    if (!token) {
        return <Navigate to="/Login_Register" replace />;
    }

    const user = JSON.parse(localStorage.getItem("user") || "null");

    return user?.role === "admin" || user?.role === "superadmin"
        ? children
        : <Navigate to="/Login_Register" replace />;
}