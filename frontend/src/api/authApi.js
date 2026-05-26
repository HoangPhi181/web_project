/*-----------------------------dùng cho login/ register-----------------*/
import axiosClient from "./axiosClient";

export const register = (data) => {
    return axiosClient.post("/auth/register", data);
};

export const login = (data) => {
    return axiosClient.post("/auth/login", data);
};

export const profile = () => {
    return axiosClient.get("/auth/profile");
};

export const update_profile = (data) => {
    return axiosClient.put("/auth/profile", data);
};
