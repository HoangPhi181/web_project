/*-----------------------------dùng cho login/ register-----------------*/
import axiosClient from "./axiosClient";

const authConfig = () => {
    const token = localStorage.getItem("token");

    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
};

export const register = (data) => {
    return axiosClient.post("/auth/register", data);
}

export const login = (data) => {
    return axiosClient.post("/auth/login", data);
}

export const profile = () => {
    return axiosClient.get(
        "/auth/profile",
        authConfig()
    );
};