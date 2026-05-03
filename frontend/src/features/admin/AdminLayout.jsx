import { Outlet } from "react-router-dom";
import AdminRoute from "./AdminRoute";

export default function AdminLayout() {
    return (
        <AdminRoute>
                <Outlet />
        </AdminRoute>
    );
}