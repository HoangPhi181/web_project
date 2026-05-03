import axiosClient from "./axiosClient";

//------------------ deposit ------------------
export const deposit = (data) => {
    return axiosClient.post("/transactions/deposit",data);
}

//------------------ withdraw -----------------
export const withdrawCode = (data) => {
    return axiosClient.post("/withdraw/code",data);
}
export const withdrawVerify = (data) => {
    return axiosClient.post("/withdraw/verify",data);
}