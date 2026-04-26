import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// Endpoints we don't want to redirect on 401 — probing calls
const AUTH_401_SAFE = ["/auth/me", "/auth/login", "/auth/register", "/auth/refresh"];

// Single-flight refresh: concurrent 401s share one refresh call
let refreshPromise = null;
function refreshOnce() {
  if (!refreshPromise) {
    refreshPromise = api.post("/auth/refresh").finally(() => {
      // clear after a tick so parallel requests all hit the same promise
      setTimeout(() => { refreshPromise = null; }, 0);
    });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const status = error?.response?.status;
    const original = error?.config;
    const url = original?.url || "";

    // Only act on protected 401s
    if (status !== 401 || AUTH_401_SAFE.some((p) => url.includes(p)) || !original || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;
    try {
      await refreshOnce();
      // New access_token cookie is set by the server; retry the original request
      return api(original);
    } catch (refreshErr) {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.dispatchEvent(new CustomEvent("auth-expired"));
      }
      return Promise.reject(refreshErr);
    }
  }
);

// Swallow unhandled axios rejections so React dev overlay doesn't blare on expected 401/network blips.
// The interceptor above already handles auth redirect; pages that care still see the rejection via .catch.
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    if (r && r.isAxiosError) {
      // prevent the red runtime overlay in dev
      e.preventDefault();
    }
  });
}

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function fileUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  if (pathOrUrl.startsWith("/api/")) return `${BACKEND_URL}${pathOrUrl}`;
  return `${API}/files/${pathOrUrl}`;
}

export function formatINR(amount) {
  if (amount == null) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
