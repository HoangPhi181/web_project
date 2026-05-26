import axiosClient from "./axiosClient";

// ------------------ DEPOSIT ------------------
export const deposit = (data) => {
  return axiosClient.post(
    "/transactions/deposit",
    data
  );
};

export const markAsPaid = (transactionId) => {
  return axiosClient.post(
    `/transactions/deposit/${transactionId}/paid`
  );
};

// ------------------ WITHDRAW ------------------
export const withdrawRequest = (data) => {
  return axiosClient.post(
    "/transactions/withdraw/request",
    data
  );
};

export const withdrawVerify = (data) => {
  return axiosClient.post(
    "/transactions/withdraw/verify",
    data
  );
};

// ------------------ HISTORY ------------------
export const getHistory = (type = "REAL") => {
  return axiosClient.get(
    `/transactions/history?type=${type}`
  );
};
