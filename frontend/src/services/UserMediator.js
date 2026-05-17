import axios from "axios";
import { balance as getBalance } from "../api/orderApi";

const API = "http://localhost:5000/api/auth";

class UserMediator {
  getToken() {
    return localStorage.getItem("token");
  }

  getHeaders() {
    return {
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
      },
    };
  }

  async fetchAccounts() {
    const res = await axios.get(
      `${API}/account`,
      this.getHeaders()
    );

    if (Array.isArray(res.data)) return res.data;
    if (res.data) return [res.data];

    return [];
  }

  async openAccount(typeAccount) {
    return await axios.post(
      `${API}/open-account`,
      {
        leverage: 100,
        typeAccount,
      },
      this.getHeaders()
    );
  }

  async fetchBalance(accountId) {
    const res = await getBalance(
      this.getHeaders()
    );

    const accounts = res.data.data || [];

    return (
      accounts.find(
        (item) => item.account_id === accountId
      )?.equity || 0
    );
  }
}

export default new UserMediator();