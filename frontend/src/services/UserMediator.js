import axios from "axios";
import { balance as getBalance } from "../api/orderApi";
import axiosClient from "../api/axiosClient";

// const API = "http://localhost:5000/api/auth";

class UserMediator {
  getToken() {
    return localStorage.getItem("token");
  }

  getHeaders() {
    return {
      headers: {
        Authorization: `Bearer ${this.getToken()}`
      }
    };
  }

  async fetchAccounts() {
    const res = await axiosClient.get(
      "auth/account",
      this.getHeaders()
    );

    return Array.isArray(res.data)
      ? res.data
      : res.data
      ? [res.data]
      : [];
  }

  // async openAccount(account_type) {
  //   return await axios.post(
  //     `${API}/open-account`,
  //     {
  //       leverage: 100,
  //       account_type
  //     },
  //     this.getHeaders()
  //   );
  // }

  async fetchBalance(accountId, accountType = "REAL") {
    const res = await getBalance({
      ...this.getHeaders(),
      params: { type: accountType }
    });

    // getBalance trả về mảng, tìm đúng account
    const list = res.data?.data || (Array.isArray(res.data) ? res.data : [res.data]);
    const acc  = list.find(item => item.account_id === accountId) || list[0];

    // equity = balance + floating PnL (thay đổi theo lời/lỗ, không bị trừ margin)
    return parseFloat(acc?.equity ?? acc?.balance ?? 0);
  }
}

export default new UserMediator();