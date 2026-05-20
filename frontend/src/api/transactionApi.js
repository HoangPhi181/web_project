import axiosClient from "./axiosClient";

const authConfig = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// ------------------ DEPOSIT ------------------
export const deposit = (data) => {
  return axiosClient.post(
    "/transactions/deposit",
    data,
    authConfig()
  );
};

export const markAsPaid = (transactionId) => {
  return axiosClient.post(
    `/transactions/deposit/${transactionId}/paid`,
    {},
    authConfig()
  );
};

// ------------------ WITHDRAW ------------------
export const withdrawRequest = (data) => {
  return axiosClient.post(
    "/transactions/withdraw/request",
    data,
    authConfig()
  );
};

export const withdrawVerify = (data) => {
  return axiosClient.post(
    "/transactions/withdraw/verify",
    data,
    authConfig()
  );
};

// ------------------ HISTORY ------------------
export const getHistory = (type = "REAL") => {
  return axiosClient.get(
    `/transactions/history?type=${type}`,
    authConfig()
  );
};