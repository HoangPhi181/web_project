/*-----------------------------dùng cho login/ register-----------------*/
import axiosClient from "./axiosClient";

export const register = (data) => {
    return axiosClient.post("/auth/register", data);
}

export const login = (data) => {
    return axiosClient.post("/auth/login", data);
}