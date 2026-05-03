// src/api/orderApi.js

import axiosClient from "./axiosClient";

//--------------- TOKEN HEADER --------------------
const authConfig = () => {
    const token = localStorage.getItem("token");

    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
};

//-------------- GET OPENING ORDERS ---------------
export const opening = () => {
    return axiosClient.get(
        "/orders/opening",
        authConfig()
    );
};

//---------------- GET BALANCE --------------------
export const balance = () => {
    return axiosClient.get(
        "/orders/balance",
        authConfig()
    );
};


//----------------- CREATE ORDER ------------------
export const create = (payload) => {
    return axiosClient.post(
        "/orders/create",
        payload,
        authConfig()
    );
};

//------------------ CLOSE ORDER -----------------
export const close = (orderId, payload) => {
    return axiosClient.post(
        `/orders/${orderId}/close`,
        payload,
        authConfig()
    );
};

//------------------ HISTORY ORDER ----------------
export const history = (payload) => {
    return axiosClient.post(
        "orders/history/list",
        payload,
        authConfig()
    );
};