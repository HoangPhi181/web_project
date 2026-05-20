import axios from "axios";
import { profile } from "../api/authApi";

class ProfileMediator {
    constructor() {
        this.subscribers = [];
        this.profile = null;
    }

    subscribe(callback) {
        this.subscribers.push(callback);
    }

    unsubscribe(callback) {
        this.subscribers = this.subscribers.filter(cb => cb !== callback);
    }

    notify() {
        this.subscribers.forEach(cb => cb(this.profile));
    }

    async fetchProfile() {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const res = await profile();

            this.profile = res.data;
            this.notify();
        } catch (err) {
            console.error("Mediator fetch error:", err);
        }
    }

    getProfile() {
        return this.profile;
    }

    // 🔥 THÊM
    getRole() {
        return this.profile?.role;
    }

    // 🔥 THÊM
    redirectHome(navigate) {
        const role = this.getRole();

        if (role === "admin" || role === "superadmin") {
            navigate("/admin");
        } else {
            navigate("/UserPage");
        }
    }
}

export default new ProfileMediator();