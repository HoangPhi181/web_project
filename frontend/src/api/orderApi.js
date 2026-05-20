import axiosClient from "./axiosClient";

//-------------- GET OPENING ORDERS ---------------
export const opening = (config) => {
    return axiosClient.get("/orders/opening", config);
};

//---------------- GET BALANCE --------------------
export const balance = (config) => {
    return axiosClient.get("/orders/balance", config);
};

//----------------- CREATE ORDER ------------------
export const create = (payload, config) => {
    return axiosClient.post("/orders/create", payload, config);
};

//------------------ CLOSE ORDER -----------------
export const close = (orderId, payload, config) => {
    return axiosClient.post(`/orders/${orderId}/close`, payload, config);
};

//------------------ HISTORY ORDER ----------------
export const history = (config) => {
    return axiosClient.get("/orders/history/list", config);
};