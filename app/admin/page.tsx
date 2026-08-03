"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { catOptions, cats, desc, img, SIZES, type Product } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { s } from "@/lib/style";
import { Hv } from "@/components/Hover";

type AdminView = "products" | "add" | "orders" | "discounts" | "admins";
type VariantCell = { color: string; size: string; stock: string };

interface Form {
  name: string;
  cat: string;
  price: string;
  colors: string;
  tags: string;
  desc: string;
  imgId: string;
}
const blankForm = (): Form => ({ name: "", cat: "T-Shirts", price: "", colors: "Ecru, Black", tags: "", desc: "", imgId: "" });

function reconcileVariants(colorsCsv: string, existing: VariantCell[]): VariantCell[] {
  const colors = colorsCsv.split(",").map((c) => c.trim()).filter(Boolean);
  const prevMap = new Map(existing.map((v) => [`${v.color}::${v.size}`, v.stock]));
  const next: VariantCell[] = [];
  for (const color of colors) {
    for (const size of SIZES) {
      next.push({ color, size, stock: prevMap.get(`${color}::${size}`) ?? "0" });
    }
  }
  return next;
}

const NAV: [AdminView, string][] = [
  ["products", "Products"],
  ["add", "Add product"],
  ["orders", "Orders"],
  ["discounts", "Discounts"],
];

interface DiscountCode {
  id: number;
  code: string;
  type: string;
  value: number;
  active: boolean;
  minSubtotal: number;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
}

interface AdminUserRow {
  id: number;
  username: string;
  role: string;
}

const ORDER_STATUSES = ["Processing", "Shipped", "Fulfilled", "Refunded"];

const STATUS_CLR: Record<string, [string, string]> = {
  Fulfilled: ["#e4f3ea", "#1f8a5b"],
  Processing: ["#fdf0dc", "#b5791f"],
  Shipped: ["#e4ecf7", "#2a5fb0"],
  Refunded: ["#f7e6e1", "#b3402a"],
};

interface AdminOrder {
  id: number;
  orderNumber: string;
  name: string;
  email: string;
  itemCount: number;
  total: number;
  status: string;
  paymentStatus: string;
  carrier: string;
  trackingNumber: string;
  createdAt: string;
}
interface OrderStats {
  revenue30d: number;
  orders30d: number;
  aov30d: number;
  units30d: number;
}

const money = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const GRID = "56px 2.2fr 1fr 1fr 1.2fr .9fr 120px";
const ORDER_GRID = "1fr 1.4fr .6fr .8fr 1fr 1.4fr .9fr";

export default function AdminPage() {
  const router = useRouter();
  const { catalog, setCatalog, showToast } = useStore();

  const [authed, setAuthed] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [view, setView] = useState<AdminView>("products");
  const [adminSearch, setAdminSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(blankForm());
  const [variantGrid, setVariantGrid] = useState<VariantCell[]>(() => reconcileVariants(blankForm().colors, []));
  const [saveBusy, setSaveBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminRole, setAdminRole] = useState("staff");

  const setColors = (raw: string) => {
    setForm((f) => ({ ...f, colors: raw }));
    setVariantGrid((prev) => reconcileVariants(raw, prev));
  };

  const uploadImage = async (file: File) => {
    setUploadBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      setForm((f) => ({ ...f, imgId: data.url }));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Upload failed", 2600);
    } finally {
      setUploadBusy(false);
    }
  };

  const importCsv = async (file: File) => {
    setImportBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/products/import", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Import failed");
      showToast(`Imported: ${data.created} created, ${data.updated} updated${data.errors?.length ? `, ${data.errors.length} errors` : ""}`, 4000);
      const fresh = await fetch("/api/products").then((r) => r.json());
      if (Array.isArray(fresh)) setCatalog(fresh);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Import failed", 2600);
    } finally {
      setImportBusy(false);
    }
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setAuthed(Boolean(d?.authed));
        setAdminUsername(d?.username ?? "");
        setAdminRole(d?.role ?? "staff");
      })
      .catch(() => setAuthed(false))
      .finally(() => setCheckingAuth(false));
  }, []);

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearchInput, setOrderSearchInput] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderTotalPages, setOrderTotalPages] = useState(1);
  const ORDER_PAGE_SIZE = 25;

  // Debounce the free-text order search so we don't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setOrderQuery(orderSearchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [orderSearchInput]);

  // Any filter change resets back to page 1.
  useEffect(() => {
    setOrderPage(1);
  }, [orderQuery, orderStatusFilter]);

  useEffect(() => {
    if (view !== "orders" || !authed) return;
    // A slower earlier request (e.g. the initial unfiltered page) could
    // otherwise resolve *after* a faster later one (e.g. a filtered
    // search) and clobber it with stale results — abort on every
    // dependency change so only the latest request can ever apply.
    const controller = new AbortController();
    setOrdersLoading(true);
    const params = new URLSearchParams();
    if (orderQuery) params.set("q", orderQuery);
    if (orderStatusFilter) params.set("status", orderStatusFilter);
    params.set("page", String(orderPage));
    params.set("pageSize", String(ORDER_PAGE_SIZE));
    fetch(`/api/orders?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        setOrders(Array.isArray(d?.orders) ? d.orders : []);
        setOrderStats(d?.stats ?? null);
        setOrderTotal(typeof d?.total === "number" ? d.total : 0);
        setOrderTotalPages(typeof d?.totalPages === "number" ? d.totalPages : 1);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") showToast("Could not load orders", 2600);
      })
      .finally(() => {
        if (!controller.signal.aborted) setOrdersLoading(false);
      });
    return () => controller.abort();
  }, [view, authed, orderQuery, orderStatusFilter, orderPage]);

  const updateOrderStatus = async (id: number, status: string) => {
    const prev = orders;
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setOrders(prev);
      showToast("Could not update order status", 2600);
    }
  };

  // Carrier and Tracking # are two separate inputs but one logical save.
  // Saving independently per-field on blur used to fire two PATCH
  // requests (one per field) with whatever the *other* field's value
  // happened to be at that instant — tabbing from Carrier to Tracking #
  // blurs Carrier before Tracking # has been typed, so that PATCH could
  // carry a stale/empty trackingNumber. If it then resolved *after* the
  // second (complete) PATCH, it would silently clobber the tracking
  // number back to empty. Fixed by debouncing a single combined save per
  // order (keyed by id) that always reads the latest state when it
  // fires, plus a per-order sequence guard so an old in-flight request
  // can never overwrite a newer one's result.
  const trackingSaveTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const trackingSaveSeq = useRef<Map<number, number>>(new Map());

  const commitOrderTracking = async (id: number, carrier: string, trackingNumber: string) => {
    const seq = (trackingSaveSeq.current.get(id) ?? 0) + 1;
    trackingSaveSeq.current.set(id, seq);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carrier, trackingNumber }),
      });
      if (!res.ok) throw new Error();
      if (trackingSaveSeq.current.get(id) === seq) showToast("Tracking info saved", 1800);
    } catch {
      if (trackingSaveSeq.current.get(id) === seq) showToast("Could not save tracking info", 2600);
    }
  };

  const setOrderField = (id: number, field: "carrier" | "trackingNumber", value: string) => {
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, [field]: value } : o)));

    const existingTimer = trackingSaveTimers.current.get(id);
    if (existingTimer) clearTimeout(existingTimer);
    trackingSaveTimers.current.set(
      id,
      setTimeout(() => {
        trackingSaveTimers.current.delete(id);
        setOrders((current) => {
          const row = current.find((o) => o.id === id);
          if (row) commitOrderTracking(id, row.carrier, row.trackingNumber);
          return current;
        });
      }, 500),
    );
  };

  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [discountsLoading, setDiscountsLoading] = useState(false);
  const [newDiscount, setNewDiscount] = useState({ code: "", type: "percent", value: "", minSubtotal: "", usageLimit: "", expiresAt: "" });
  const [savingDiscount, setSavingDiscount] = useState(false);

  useEffect(() => {
    if (view !== "discounts" || !authed) return;
    setDiscountsLoading(true);
    fetch("/api/discounts")
      .then((r) => r.json())
      .then((d) => setDiscounts(Array.isArray(d) ? d : []))
      .catch(() => showToast("Could not load discount codes", 2600))
      .finally(() => setDiscountsLoading(false));
  }, [view, authed]);

  const createDiscount = async () => {
    setSavingDiscount(true);
    try {
      const res = await fetch("/api/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newDiscount.code,
          type: newDiscount.type,
          value: Number(newDiscount.value),
          minSubtotal: Number(newDiscount.minSubtotal) || 0,
          usageLimit: newDiscount.usageLimit,
          expiresAt: newDiscount.expiresAt || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not create code");
      setDiscounts((prev) => [data, ...prev]);
      setNewDiscount({ code: "", type: "percent", value: "", minSubtotal: "", usageLimit: "", expiresAt: "" });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not create code", 2600);
    } finally {
      setSavingDiscount(false);
    }
  };

  const toggleDiscountActive = async (id: number, active: boolean) => {
    setDiscounts((prev) => prev.map((d) => (d.id === id ? { ...d, active } : d)));
    await fetch(`/api/discounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    }).catch(() => showToast("Could not update code", 2600));
  };

  const deleteDiscount = async (id: number) => {
    setDiscounts((prev) => prev.filter((d) => d.id !== id));
    await fetch(`/api/discounts/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const [admins, setAdmins] = useState<AdminUserRow[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: "", password: "", role: "staff" });
  const [savingAdmin, setSavingAdmin] = useState(false);

  useEffect(() => {
    if (view !== "admins" || !authed || adminRole !== "owner") return;
    setAdminsLoading(true);
    fetch("/api/admins")
      .then((r) => r.json())
      .then((d) => setAdmins(Array.isArray(d) ? d : []))
      .catch(() => showToast("Could not load admins", 2600))
      .finally(() => setAdminsLoading(false));
  }, [view, authed, adminRole]);

  const createAdmin = async () => {
    setSavingAdmin(true);
    try {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAdmin),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not create admin");
      setAdmins((prev) => [...prev, data]);
      setNewAdmin({ username: "", password: "", role: "staff" });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not create admin", 2600);
    } finally {
      setSavingAdmin(false);
    }
  };

  const deleteAdmin = async (id: number) => {
    const prev = admins;
    setAdmins((as) => as.filter((a) => a.id !== id));
    const res = await fetch(`/api/admins/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAdmins(prev);
      showToast(data?.error || "Could not remove admin", 2600);
    }
  };

  const doLogin = async () => {
    setLoginBusy(true);
    setLoginErr("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUser, password: loginPass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoginErr(data?.error || "Invalid credentials.");
        return;
      }
      setAuthed(true);
      setView("products");
    } catch {
      setLoginErr("Could not reach the server.");
    } finally {
      setLoginBusy(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setAuthed(false);
    router.push("/");
  };

  const startNew = () => {
    setEditId(null);
    const fresh = blankForm();
    setForm(fresh);
    setVariantGrid(reconcileVariants(fresh.colors, []));
    setView("add");
  };

  const startEdit = (id: number) => {
    const p = catalog.find((x) => x.id === id);
    if (!p) return;
    setEditId(id);
    setForm({
      name: p.name,
      cat: p.cat,
      price: String(p.price),
      colors: p.colors.join(", "),
      tags: p.tags.join(", "),
      desc: desc(p),
      imgId: p.imgId,
    });
    setVariantGrid(reconcileVariants(p.colors.join(", "), p.variants.map((v) => ({ color: v.color, size: v.size, stock: String(v.stock) }))));
    setView("add");
  };

  const saveForm = async () => {
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const colors = form.colors.split(",").map((c) => c.trim()).filter(Boolean);
    const variants = variantGrid.map((v) => ({ size: v.size, color: v.color, stock: Number(v.stock) || 0 }));
    setSaveBusy(true);
    try {
      if (editId) {
        const res = await fetch(`/api/products/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name || undefined,
            cat: form.cat,
            price: Number(form.price) || undefined,
            colors,
            tags,
            variants,
            desc: form.desc,
            imgId: form.imgId || undefined,
          }),
        });
        if (!res.ok) throw new Error("Save failed");
        const updated: Product = await res.json();
        setCatalog((prev) => prev.map((p) => (p.id === editId ? updated : p)));
      } else {
        const ids = (cats[form.cat] || cats["T-Shirts"]).ids;
        const skuPrefix = form.cat.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
        const sku = `${skuPrefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name || "New Product",
            cat: form.cat,
            price: Number(form.price) || 0,
            wasPrice: null,
            imgId: form.imgId || ids[0],
            colors,
            tags,
            rating: "4.6",
            reviews: 0,
            variants,
            sku,
            desc: form.desc,
          }),
        });
        if (!res.ok) throw new Error("Save failed");
        const created: Product = await res.json();
        setCatalog((prev) => [created, ...prev]);
      }
      setEditId(null);
      setView("products");
      showToast("Product saved", 2200);
    } catch {
      showToast("Could not save product", 2600);
    } finally {
      setSaveBusy(false);
    }
  };

  const archiveProduct = async (id: number) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      const updated: Product = await res.json();
      setCatalog((prev) => prev.map((p) => (p.id === id ? updated : p)));
      showToast("Product archived", 2200);
    } catch {
      showToast("Could not archive product", 2600);
    }
  };

  const restoreProduct = async (id: number) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      });
      if (!res.ok) throw new Error();
      const updated: Product = await res.json();
      setCatalog((prev) => prev.map((p) => (p.id === id ? updated : p)));
      showToast("Product restored", 2200);
    } catch {
      showToast("Could not restore product", 2600);
    }
  };

  // ---- LOGIN SCREEN ----
  if (checkingAuth) {
    return <div style={s("flex:1;min-height:100vh;background:#1a1714")} />;
  }
  if (!authed) {
    return (
      <div style={s("flex:1;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1a1714;padding:24px")}>
        <div style={s("width:380px;background:#faf8f4;border-radius:18px;padding:36px;display:flex;flex-direction:column;gap:18px;animation:gbScale .5s both")}>
          <div style={s("font-size:23px;font-weight:600;letter-spacing:-.02em")}>
            graybridge<span style={s("color:#c2410c")}>.</span>{" "}
            <span style={s("font:400 12px 'Geist Mono',monospace;color:#9a948a")}>admin</span>
          </div>
          <p style={s("font-size:13.5px;color:#6b6459;margin:0;line-height:1.5")}>
            Sign in to manage the catalog.
          </p>
          <div style={s("display:flex;flex-direction:column;gap:6px")}>
            <label style={s("font-size:12px;font-weight:500;color:#5f5a52")}>Username</label>
            <input
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              style={s("border:1px solid #e0d9cc;background:#fff;border-radius:9px;padding:11px 13px;font-size:14px")}
            />
          </div>
          <div style={s("display:flex;flex-direction:column;gap:6px")}>
            <label style={s("font-size:12px;font-weight:500;color:#5f5a52")}>Password</label>
            <input
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              type="password"
              style={s("border:1px solid #e0d9cc;background:#fff;border-radius:9px;padding:11px 13px;font-size:14px")}
            />
          </div>
          {loginErr ? (
            <div style={s("font-size:12.5px;color:#b3402a;background:#f7e6e1;padding:9px 12px;border-radius:8px")}>
              {loginErr}
            </div>
          ) : null}
          <Hv
            as="button"
            onClick={doLogin}
            css="background:#c2410c;color:#fff;border:none;padding:13px;border-radius:9px;font-size:14.5px;font-weight:500;cursor:pointer;transition:background .25s;opacity:1"
            hover="background:#9a330a"
          >
            {loginBusy ? "Signing in…" : "Sign in"}
          </Hv>
          <span onClick={() => router.push("/")} style={s("font-size:12.5px;color:#9a948a;text-align:center;cursor:pointer")}>
            ← Back to store
          </span>
        </div>
      </div>
    );
  }

  // ---- DASHBOARD ----
  let alist = catalog.slice();
  if (!showArchived) alist = alist.filter((p) => !p.archived);
  if (adminSearch) {
    const q = adminSearch.toLowerCase();
    alist = alist.filter((p) => (p.name + " " + p.cat + " " + p.sku).toLowerCase().includes(q));
  }

  return (
    <div style={s("flex:1;display:grid;grid-template-columns:230px 1fr;min-height:100vh")}>
      <aside style={s("background:#1a1714;color:#cbc4b8;padding:24px 18px;display:flex;flex-direction:column;gap:6px")}>
        <div style={s("font-size:19px;font-weight:600;color:#fff;letter-spacing:-.02em;padding:6px 10px 18px")}>
          graybridge<span style={s("color:#c2410c")}>.</span>
        </div>
        {(adminRole === "owner" ? [...NAV, ["admins", "Admins"] as [AdminView, string]] : NAV).map((n) => {
          const active = view === n[0];
          return (
            <div
              key={n[0]}
              onClick={() => {
                if (n[0] === "add") {
                  setEditId(null);
                  const fresh = blankForm();
                  setForm(fresh);
                  setVariantGrid(reconcileVariants(fresh.colors, []));
                }
                setView(n[0]);
              }}
              style={s(
                `display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:9px;cursor:pointer;font-size:14px;background:${
                  active ? "#c2410c" : "transparent"
                };color:${active ? "#fff" : "#cbc4b8"};transition:background .2s`,
              )}
            >
              {n[1]}
            </div>
          );
        })}
        <div style={s("margin-top:auto;display:flex;flex-direction:column;gap:6px;padding-top:18px")}>
          <Hv onClick={() => router.push("/")} css="padding:10px 12px;border-radius:9px;cursor:pointer;font-size:13.5px;color:#9a948a" hover="color:#fff">
            ↗ View store
          </Hv>
          <Hv onClick={logout} css="padding:10px 12px;border-radius:9px;cursor:pointer;font-size:13.5px;color:#9a948a" hover="color:#fff">
            Sign out
          </Hv>
        </div>
      </aside>

      <div style={s("background:#f4f1ea;padding:30px 36px;overflow:auto")}>
        {/* PRODUCTS */}
        {view === "products" ? (
          <div style={s("animation:gbFade .4s both")}>
            <div style={s("display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;flex-wrap:wrap;gap:14px")}>
              <div>
                <h1 style={s("font-size:26px;font-weight:600;letter-spacing:-.02em;margin:0")}>Products</h1>
                <p style={s("font-size:13.5px;color:#8a8275;margin:5px 0 0")}>
                  Showing {Math.min(alist.length, 50)} of {catalog.filter((p) => showArchived || !p.archived).length} products
                </p>
              </div>
              <div style={s("display:flex;gap:12px;align-items:center")}>
                <label style={s("display:flex;align-items:center;gap:7px;font-size:12.5px;color:#6b6459;cursor:pointer;white-space:nowrap")}>
                  <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                  Show archived
                </label>
                <div style={s("display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #e0d9cc;border-radius:9px;padding:9px 13px;width:230px")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a9388" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.5" y2="16.5" />
                  </svg>
                  <input
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    placeholder="Search products"
                    style={s("border:none;background:transparent;font-size:13.5px;width:100%")}
                  />
                </div>
                <Hv
                  as="a"
                  href="/api/products/export"
                  css="background:#fff;color:#1a1714;border:1px solid #e0d9cc;padding:10px 16px;border-radius:9px;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;text-decoration:none;display:inline-flex;align-items:center"
                  hover="background:#f7f3ea"
                >
                  Export CSV
                </Hv>
                <Hv
                  as="label"
                  css={`background:#fff;color:#1a1714;border:1px solid #e0d9cc;padding:10px 16px;border-radius:9px;font-size:14px;font-weight:500;white-space:nowrap;display:inline-flex;align-items:center;${
                    importBusy ? "opacity:.6;cursor:default" : "cursor:pointer"
                  }`}
                  hover={importBusy ? "" : "background:#f7f3ea"}
                >
                  {importBusy ? "Importing…" : "Import CSV"}
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    disabled={importBusy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) importCsv(file);
                      e.target.value = "";
                    }}
                    style={s("display:none")}
                  />
                </Hv>
                <Hv
                  as="button"
                  onClick={startNew}
                  css="background:#c2410c;color:#fff;border:none;padding:10px 18px;border-radius:9px;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background .25s"
                  hover="background:#9a330a"
                >
                  + Add product
                </Hv>
              </div>
            </div>
            <div style={s("background:#fff;border:1px solid #e7e0d3;border-radius:14px;overflow:hidden")}>
              <div
                style={s(
                  `display:grid;grid-template-columns:${GRID};gap:14px;padding:13px 20px;border-bottom:1px solid #eee7db;font:500 11px 'Geist Mono',monospace;letter-spacing:.06em;color:#9a948a;text-transform:uppercase`,
                )}
              >
                <span />
                <span>Product</span>
                <span>Category</span>
                <span>Price</span>
                <span>Tags</span>
                <span>Stock</span>
                <span />
              </div>
              {alist.slice(0, 50).map((p) => {
                const stockLabel = p.stock === 0 ? "Out" : String(p.stock);
                const stockColor = p.stock === 0 ? "#b3402a" : p.stock < 10 ? "#b5791f" : "#1f8a5b";
                return (
                  <div
                    key={p.id}
                    style={s(
                      `display:grid;grid-template-columns:${GRID};gap:14px;padding:11px 20px;border-bottom:1px solid #f2ece1;align-items:center;font-size:13.5px;${
                        p.archived ? "opacity:.55" : ""
                      }`,
                    )}
                  >
                    <div style={s("width:40px;height:50px;border-radius:7px;overflow:hidden;background:#f1ece2")}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img(p.imgId, 120)} alt="" style={s("width:100%;height:100%;object-fit:cover")} />
                    </div>
                    <div>
                      <div style={s("font-weight:500;display:flex;align-items:center;gap:7px")}>
                        {p.name}
                        {p.archived ? (
                          <span style={s("font:500 10px 'Geist Mono',monospace;color:#8a8275;background:#f1ece2;padding:2px 6px;border-radius:5px;text-transform:uppercase")}>
                            Archived
                          </span>
                        ) : null}
                      </div>
                      <div style={s("font:400 11px 'Geist Mono',monospace;color:#b3ada3")}>{p.sku}</div>
                    </div>
                    <span style={s("color:#5f5a52")}>{p.cat}</span>
                    <span style={s("font:500 13px 'Geist Mono',monospace")}>${p.price}</span>
                    <span style={s("font-size:12px;color:#8a8275")}>{p.tags.slice(0, 2).join(", ") || "—"}</span>
                    <span style={s(`font:500 12px 'Geist Mono',monospace;color:${stockColor}`)}>{stockLabel}</span>
                    <span style={s("display:flex;gap:10px")}>
                      <span
                        onClick={() => startEdit(p.id)}
                        style={s("font-size:12.5px;color:#c2410c;cursor:pointer;font-weight:500")}
                      >
                        Edit
                      </span>
                      {p.archived ? (
                        <span
                          onClick={() => restoreProduct(p.id)}
                          style={s("font-size:12.5px;color:#1f8a5b;cursor:pointer;font-weight:500")}
                        >
                          Restore
                        </span>
                      ) : (
                        <span
                          onClick={() => {
                            if (confirm(`Archive "${p.name}"? It'll be hidden from the storefront but kept for order history.`)) {
                              archiveProduct(p.id);
                            }
                          }}
                          style={s("font-size:12.5px;color:#8a8275;cursor:pointer;font-weight:500")}
                        >
                          Archive
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* ADD / EDIT */}
        {view === "add" ? (
          <div style={s("animation:gbFade .4s both;max-width:760px")}>
            <div style={s("font:400 12px 'Geist Mono',monospace;color:#9a948a;margin-bottom:6px")}>
              <span onClick={() => setView("products")} style={s("cursor:pointer")}>
                Products
              </span>{" "}
              / {editId ? "Edit product" : "New product"}
            </div>
            <h1 style={s("font-size:26px;font-weight:600;letter-spacing:-.02em;margin:0 0 22px")}>
              {editId ? "Edit product" : "New product"}
            </h1>
            <div style={s("background:#fff;border:1px solid #e7e0d3;border-radius:14px;padding:26px;display:flex;flex-direction:column;gap:18px")}>
              <div style={s("display:flex;flex-direction:column;gap:6px")}>
                <label style={s("font-size:12.5px;font-weight:500;color:#5f5a52")}>Product name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Heavyweight Crewneck"
                  style={s("border:1px solid #e0d9cc;border-radius:9px;padding:11px 13px;font-size:14px")}
                />
              </div>
              <div style={s("display:flex;flex-direction:column;gap:6px")}>
                <label style={s("font-size:12.5px;font-weight:500;color:#5f5a52")}>Product image</label>
                <div style={s("display:flex;align-items:center;gap:14px")}>
                  {form.imgId ? (
                    <div style={s("width:56px;height:70px;border-radius:8px;overflow:hidden;background:#f1ece2;flex-shrink:0")}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img(form.imgId, 160)} alt="" style={s("width:100%;height:100%;object-fit:cover")} />
                    </div>
                  ) : null}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    disabled={uploadBusy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadImage(file);
                      e.target.value = "";
                    }}
                    style={s("font-size:13px")}
                  />
                  {uploadBusy ? <span style={s("font-size:12.5px;color:#9a948a")}>Uploading…</span> : null}
                </div>
              </div>
              <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:16px")}>
                <div style={s("display:flex;flex-direction:column;gap:6px")}>
                  <label style={s("font-size:12.5px;font-weight:500;color:#5f5a52")}>Category</label>
                  <select
                    value={form.cat}
                    onChange={(e) => setForm((f) => ({ ...f, cat: e.target.value }))}
                    style={s("border:1px solid #e0d9cc;border-radius:9px;padding:11px 13px;font-size:14px;background:#fff;cursor:pointer")}
                  >
                    {catOptions.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={s("display:flex;flex-direction:column;gap:6px")}>
                  <label style={s("font-size:12.5px;font-weight:500;color:#5f5a52")}>Price (USD)</label>
                  <input
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="0"
                    style={s("border:1px solid #e0d9cc;border-radius:9px;padding:11px 13px;font-size:14px")}
                  />
                </div>
              </div>
              <div style={s("display:flex;flex-direction:column;gap:6px")}>
                <label style={s("font-size:12.5px;font-weight:500;color:#5f5a52")}>
                  Colors <span style={s("color:#9a948a;font-weight:400")}>(comma separated)</span>
                </label>
                <input
                  value={form.colors}
                  onChange={(e) => setColors(e.target.value)}
                  placeholder="Ecru, Black"
                  style={s("border:1px solid #e0d9cc;border-radius:9px;padding:11px 13px;font-size:14px")}
                />
              </div>
              <div style={s("display:flex;flex-direction:column;gap:8px")}>
                <label style={s("font-size:12.5px;font-weight:500;color:#5f5a52")}>
                  Stock by variant{" "}
                  <span style={s("color:#9a948a;font-weight:400")}>
                    (total: {variantGrid.reduce((n, v) => n + (Number(v.stock) || 0), 0)})
                  </span>
                </label>
                {variantGrid.length === 0 ? (
                  <div style={s("font-size:13px;color:#9a948a")}>Add at least one color to set stock per size.</div>
                ) : (
                  <div style={s("border:1px solid #e7e0d3;border-radius:10px;overflow:hidden")}>
                    <div
                      style={s(
                        `display:grid;grid-template-columns:1fr repeat(${SIZES.length},72px);background:#f7f3ea;border-bottom:1px solid #e7e0d3`
                      )}
                    >
                      <div style={s("padding:8px 12px;font-size:11.5px;font-weight:600;color:#9a948a")}>Color</div>
                      {SIZES.map((size) => (
                        <div key={size} style={s("padding:8px 6px;font-size:11.5px;font-weight:600;color:#9a948a;text-align:center")}>
                          {size}
                        </div>
                      ))}
                    </div>
                    {Array.from(new Set(variantGrid.map((v) => v.color))).map((color, rowIdx) => (
                      <div
                        key={color}
                        style={s(
                          `display:grid;grid-template-columns:1fr repeat(${SIZES.length},72px);${
                            rowIdx > 0 ? "border-top:1px solid #f0ebe0" : ""
                          }`
                        )}
                      >
                        <div style={s("padding:9px 12px;font-size:13px;color:#3a362f;display:flex;align-items:center")}>{color}</div>
                        {SIZES.map((size) => {
                          const idx = variantGrid.findIndex((v) => v.color === color && v.size === size);
                          if (idx === -1) return <div key={size} />;
                          return (
                            <div key={size} style={s("padding:6px")}>
                              <input
                                value={variantGrid[idx].stock}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setVariantGrid((prev) => prev.map((v, i) => (i === idx ? { ...v, stock: val } : v)));
                                }}
                                placeholder="0"
                                style={s(
                                  "width:100%;border:1px solid #e0d9cc;border-radius:7px;padding:7px 8px;font-size:13px;text-align:center"
                                )}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={s("display:flex;flex-direction:column;gap:6px")}>
                <label style={s("font-size:12.5px;font-weight:500;color:#5f5a52")}>
                  Tags <span style={s("color:#9a948a;font-weight:400")}>(comma separated)</span>
                </label>
                <input
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="New, Organic Cotton, Unisex"
                  style={s("border:1px solid #e0d9cc;border-radius:9px;padding:11px 13px;font-size:14px")}
                />
              </div>
              <div style={s("display:flex;flex-direction:column;gap:6px")}>
                <label style={s("font-size:12.5px;font-weight:500;color:#5f5a52")}>Description</label>
                <textarea
                  value={form.desc}
                  onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
                  rows={4}
                  placeholder="Describe the fabric, fit, and details…"
                  style={s("border:1px solid #e0d9cc;border-radius:9px;padding:11px 13px;font-size:14px;resize:vertical;line-height:1.5")}
                />
              </div>
              <div style={s("display:flex;gap:12px;border-top:1px solid #eee7db;padding-top:18px")}>
                <Hv
                  as="button"
                  onClick={saveForm}
                  css="background:#c2410c;color:#fff;border:none;padding:12px 24px;border-radius:9px;font-size:14px;font-weight:500;cursor:pointer;transition:background .25s"
                  hover="background:#9a330a"
                >
                  {saveBusy ? "Saving…" : editId ? "Save changes" : "Create product"}
                </Hv>
                <button
                  onClick={() => setView("products")}
                  style={s("background:transparent;border:1px solid #e0d9cc;padding:12px 24px;border-radius:9px;font-size:14px;font-weight:500;cursor:pointer;color:#5f5a52")}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* ORDERS */}
        {view === "orders" ? (
          <div style={s("animation:gbFade .4s both")}>
            <div style={s("display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;flex-wrap:wrap;gap:14px")}>
              <div>
                <h1 style={s("font-size:26px;font-weight:600;letter-spacing:-.02em;margin:0")}>Orders</h1>
                <p style={s("font-size:13.5px;color:#8a8275;margin:5px 0 0")}>KPI cards below are last 30 days · table respects search/filter</p>
              </div>
              <div style={s("display:flex;gap:12px")}>
                <div style={s("display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #e0d9cc;border-radius:9px;padding:9px 13px;width:230px")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a9388" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.5" y2="16.5" />
                  </svg>
                  <input
                    value={orderSearchInput}
                    onChange={(e) => setOrderSearchInput(e.target.value)}
                    placeholder="Search order #, name, email"
                    style={s("border:none;background:transparent;font-size:13.5px;width:100%")}
                  />
                </div>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  style={s("border:1px solid #e0d9cc;border-radius:9px;padding:9px 13px;font-size:13.5px;background:#fff;cursor:pointer")}
                >
                  <option value="">All statuses</option>
                  {ORDER_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={s("display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px")}>
              {[
                ["Revenue (30d)", orderStats ? money(orderStats.revenue30d) : "—"],
                ["Orders", orderStats ? String(orderStats.orders30d) : "—"],
                ["Avg. order value", orderStats ? money(orderStats.aov30d) : "—"],
                ["Units sold", orderStats ? String(orderStats.units30d) : "—"],
              ].map(([label, value], i) => (
                <div
                  key={label}
                  style={s(`background:#fff;border:1px solid #e7e0d3;border-radius:14px;padding:18px 20px;animation:gbFade .5s both;animation-delay:${(i * 0.05).toFixed(2)}s`)}
                >
                  <div style={s("font-size:12.5px;color:#8a8275")}>{label}</div>
                  <div style={s("font:600 26px 'Geist Mono',monospace;margin-top:6px;letter-spacing:-.02em")}>{value}</div>
                </div>
              ))}
            </div>
            <div style={s("background:#fff;border:1px solid #e7e0d3;border-radius:14px;overflow:hidden")}>
              <div
                style={s(
                  `display:grid;grid-template-columns:${ORDER_GRID};gap:14px;padding:13px 20px;border-bottom:1px solid #eee7db;font:500 11px 'Geist Mono',monospace;letter-spacing:.06em;color:#9a948a;text-transform:uppercase`,
                )}
              >
                <span>Order</span>
                <span>Customer</span>
                <span>Items</span>
                <span>Total</span>
                <span>Status</span>
                <span>Tracking</span>
                <span>Date</span>
              </div>
              {ordersLoading ? (
                <div style={s("padding:24px 20px;color:#8a8275;font-size:13.5px")}>Loading orders…</div>
              ) : orders.length === 0 ? (
                <div style={s("padding:24px 20px;color:#8a8275;font-size:13.5px")}>
                  {orderQuery || orderStatusFilter ? "No orders match your search/filter." : "No orders yet."}
                </div>
              ) : (
                orders.map((o) => {
                  const clr = STATUS_CLR[o.status] || ["#eee", "#555"];
                  return (
                    <div
                      key={o.id}
                      style={s(
                        `display:grid;grid-template-columns:${ORDER_GRID};gap:14px;padding:13px 20px;border-bottom:1px solid #f2ece1;align-items:center;font-size:13.5px`,
                      )}
                    >
                      <span style={s("font:500 12.5px 'Geist Mono',monospace")}>#{o.orderNumber}</span>
                      <span>
                        <div>{o.name}</div>
                        <div style={s("font-size:11px;color:#b3ada3")}>{o.email}</div>
                      </span>
                      <span style={s("color:#8a8275")}>{o.itemCount} items</span>
                      <span style={s("font:500 13px 'Geist Mono',monospace")}>{money(o.total)}</span>
                      <span>
                        <select
                          value={o.status}
                          onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                          style={s(
                            `font-size:12px;font-weight:500;padding:4px 8px;border-radius:999px;background:${clr[0]};color:${clr[1]};border:none;cursor:pointer`,
                          )}
                        >
                          {ORDER_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </span>
                      <span style={s("display:flex;flex-direction:column;gap:4px")}>
                        <input
                          value={o.carrier}
                          onChange={(e) => setOrderField(o.id, "carrier", e.target.value)}
                          placeholder="Carrier"
                          style={s("border:1px solid #e7e0d3;border-radius:6px;padding:4px 7px;font-size:11.5px;width:100%")}
                        />
                        <input
                          value={o.trackingNumber}
                          onChange={(e) => setOrderField(o.id, "trackingNumber", e.target.value)}
                          placeholder="Tracking #"
                          style={s("border:1px solid #e7e0d3;border-radius:6px;padding:4px 7px;font-size:11.5px;width:100%;font-family:'Geist Mono',monospace")}
                        />
                      </span>
                      <span style={s("color:#8a8275;font:400 12.5px 'Geist Mono',monospace")}>{shortDate(o.createdAt)}</span>
                    </div>
                  );
                })
              )}
            </div>
            {!ordersLoading && orders.length > 0 ? (
              <div style={s("display:flex;justify-content:space-between;align-items:center;margin-top:16px;font-size:12.5px;color:#8a8275")}>
                <span>
                  Showing {(orderPage - 1) * ORDER_PAGE_SIZE + 1}–{Math.min(orderPage * ORDER_PAGE_SIZE, orderTotal)} of {orderTotal}
                </span>
                <div style={s("display:flex;gap:8px;align-items:center")}>
                  <button
                    onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                    disabled={orderPage <= 1}
                    style={s(
                      `background:#fff;border:1px solid #e0d9cc;border-radius:7px;padding:6px 12px;font-size:12.5px;${
                        orderPage <= 1 ? "opacity:.4;cursor:default" : "cursor:pointer"
                      }`,
                    )}
                  >
                    ← Prev
                  </button>
                  <span style={s("font:500 12px 'Geist Mono',monospace")}>
                    Page {orderPage} of {orderTotalPages}
                  </span>
                  <button
                    onClick={() => setOrderPage((p) => Math.min(orderTotalPages, p + 1))}
                    disabled={orderPage >= orderTotalPages}
                    style={s(
                      `background:#fff;border:1px solid #e0d9cc;border-radius:7px;padding:6px 12px;font-size:12.5px;${
                        orderPage >= orderTotalPages ? "opacity:.4;cursor:default" : "cursor:pointer"
                      }`,
                    )}
                  >
                    Next →
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {view === "discounts" ? (
          <div style={s("animation:gbFade .4s both;max-width:900px")}>
            <h1 style={s("font-size:26px;font-weight:600;letter-spacing:-.02em;margin:0 0 4px")}>Discount codes</h1>
            <p style={s("font-size:13.5px;color:#8a8275;margin:0 0 22px")}>Create and manage promo codes for checkout.</p>

            <div style={s("background:#fff;border:1px solid #e7e0d3;border-radius:14px;padding:22px;margin-bottom:22px;display:flex;flex-direction:column;gap:14px")}>
              <div style={s("display:grid;grid-template-columns:1.2fr .9fr .8fr 1fr 1fr 1.2fr;gap:12px")}>
                <div style={s("display:flex;flex-direction:column;gap:6px")}>
                  <label style={s("font-size:12px;font-weight:500;color:#5f5a52")}>Code</label>
                  <input
                    value={newDiscount.code}
                    onChange={(e) => setNewDiscount((d) => ({ ...d, code: e.target.value }))}
                    placeholder="SUMMER10"
                    style={s("border:1px solid #e0d9cc;border-radius:9px;padding:10px 12px;font-size:13.5px")}
                  />
                </div>
                <div style={s("display:flex;flex-direction:column;gap:6px")}>
                  <label style={s("font-size:12px;font-weight:500;color:#5f5a52")}>Type</label>
                  <select
                    value={newDiscount.type}
                    onChange={(e) => setNewDiscount((d) => ({ ...d, type: e.target.value }))}
                    style={s("border:1px solid #e0d9cc;border-radius:9px;padding:10px 12px;font-size:13.5px;background:#fff;cursor:pointer")}
                  >
                    <option value="percent">Percent</option>
                    <option value="fixed">Fixed ($)</option>
                  </select>
                </div>
                <div style={s("display:flex;flex-direction:column;gap:6px")}>
                  <label style={s("font-size:12px;font-weight:500;color:#5f5a52")}>Value</label>
                  <input
                    value={newDiscount.value}
                    onChange={(e) => setNewDiscount((d) => ({ ...d, value: e.target.value }))}
                    placeholder={newDiscount.type === "percent" ? "10" : "500"}
                    style={s("border:1px solid #e0d9cc;border-radius:9px;padding:10px 12px;font-size:13.5px")}
                  />
                </div>
                <div style={s("display:flex;flex-direction:column;gap:6px")}>
                  <label style={s("font-size:12px;font-weight:500;color:#5f5a52")}>Min. subtotal ($)</label>
                  <input
                    value={newDiscount.minSubtotal}
                    onChange={(e) => setNewDiscount((d) => ({ ...d, minSubtotal: e.target.value }))}
                    placeholder="0"
                    style={s("border:1px solid #e0d9cc;border-radius:9px;padding:10px 12px;font-size:13.5px")}
                  />
                </div>
                <div style={s("display:flex;flex-direction:column;gap:6px")}>
                  <label style={s("font-size:12px;font-weight:500;color:#5f5a52")}>Usage limit</label>
                  <input
                    value={newDiscount.usageLimit}
                    onChange={(e) => setNewDiscount((d) => ({ ...d, usageLimit: e.target.value }))}
                    placeholder="Unlimited"
                    style={s("border:1px solid #e0d9cc;border-radius:9px;padding:10px 12px;font-size:13.5px")}
                  />
                </div>
                <div style={s("display:flex;flex-direction:column;gap:6px")}>
                  <label style={s("font-size:12px;font-weight:500;color:#5f5a52")}>Expires</label>
                  <input
                    type="date"
                    value={newDiscount.expiresAt}
                    onChange={(e) => setNewDiscount((d) => ({ ...d, expiresAt: e.target.value }))}
                    style={s("border:1px solid #e0d9cc;border-radius:9px;padding:9px 12px;font-size:13.5px")}
                  />
                </div>
              </div>
              <div>
                <Hv
                  as="button"
                  onClick={createDiscount}
                  css="background:#c2410c;color:#fff;border:none;padding:11px 22px;border-radius:9px;font-size:13.5px;font-weight:500;cursor:pointer;transition:background .25s"
                  hover="background:#9a330a"
                >
                  {savingDiscount ? "Creating…" : "Create code"}
                </Hv>
              </div>
            </div>

            <div style={s("background:#fff;border:1px solid #e7e0d3;border-radius:14px;overflow:hidden")}>
              <div
                style={s(
                  "display:grid;grid-template-columns:1.2fr .8fr .8fr 1fr .8fr .8fr;gap:14px;padding:13px 20px;border-bottom:1px solid #eee7db;font:500 11px 'Geist Mono',monospace;letter-spacing:.06em;color:#9a948a;text-transform:uppercase",
                )}
              >
                <span>Code</span>
                <span>Type</span>
                <span>Value</span>
                <span>Usage</span>
                <span>Active</span>
                <span></span>
              </div>
              {discountsLoading ? (
                <div style={s("padding:24px 20px;color:#8a8275;font-size:13.5px")}>Loading discount codes…</div>
              ) : discounts.length === 0 ? (
                <div style={s("padding:24px 20px;color:#8a8275;font-size:13.5px")}>No discount codes yet.</div>
              ) : (
                discounts.map((d) => (
                  <div
                    key={d.id}
                    style={s(
                      "display:grid;grid-template-columns:1.2fr .8fr .8fr 1fr .8fr .8fr;gap:14px;padding:13px 20px;border-bottom:1px solid #f2ece1;align-items:center;font-size:13.5px",
                    )}
                  >
                    <span style={s("font:500 13px 'Geist Mono',monospace")}>{d.code}</span>
                    <span style={s("color:#8a8275")}>{d.type === "percent" ? "Percent" : "Fixed"}</span>
                    <span style={s("font:500 13px 'Geist Mono',monospace")}>{d.type === "percent" ? `${d.value}%` : money(d.value)}</span>
                    <span style={s("color:#8a8275")}>
                      {d.usedCount}
                      {d.usageLimit ? ` / ${d.usageLimit}` : ""}
                    </span>
                    <span>
                      <input type="checkbox" checked={d.active} onChange={(e) => toggleDiscountActive(d.id, e.target.checked)} />
                    </span>
                    <span onClick={() => deleteDiscount(d.id)} style={s("font-size:12.5px;color:#b3402a;cursor:pointer;font-weight:500")}>
                      Delete
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {view === "admins" ? (
          <div style={s("animation:gbFade .4s both;max-width:700px")}>
            <h1 style={s("font-size:26px;font-weight:600;letter-spacing:-.02em;margin:0 0 4px")}>Admin users</h1>
            <p style={s("font-size:13.5px;color:#8a8275;margin:0 0 22px")}>Owner-only. Manage who can access this panel.</p>

            <div style={s("background:#fff;border:1px solid #e7e0d3;border-radius:14px;padding:22px;margin-bottom:22px;display:flex;flex-direction:column;gap:14px")}>
              <div style={s("display:grid;grid-template-columns:1.2fr 1.2fr .8fr;gap:12px")}>
                <div style={s("display:flex;flex-direction:column;gap:6px")}>
                  <label style={s("font-size:12px;font-weight:500;color:#5f5a52")}>Username</label>
                  <input
                    value={newAdmin.username}
                    onChange={(e) => setNewAdmin((a) => ({ ...a, username: e.target.value }))}
                    placeholder="e.g. jsmith"
                    style={s("border:1px solid #e0d9cc;border-radius:9px;padding:10px 12px;font-size:13.5px")}
                  />
                </div>
                <div style={s("display:flex;flex-direction:column;gap:6px")}>
                  <label style={s("font-size:12px;font-weight:500;color:#5f5a52")}>Password</label>
                  <input
                    type="password"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin((a) => ({ ...a, password: e.target.value }))}
                    placeholder="8+ characters"
                    style={s("border:1px solid #e0d9cc;border-radius:9px;padding:10px 12px;font-size:13.5px")}
                  />
                </div>
                <div style={s("display:flex;flex-direction:column;gap:6px")}>
                  <label style={s("font-size:12px;font-weight:500;color:#5f5a52")}>Role</label>
                  <select
                    value={newAdmin.role}
                    onChange={(e) => setNewAdmin((a) => ({ ...a, role: e.target.value }))}
                    style={s("border:1px solid #e0d9cc;border-radius:9px;padding:10px 12px;font-size:13.5px;background:#fff;cursor:pointer")}
                  >
                    <option value="staff">Staff</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
              </div>
              <div>
                <Hv
                  as="button"
                  onClick={createAdmin}
                  css="background:#c2410c;color:#fff;border:none;padding:11px 22px;border-radius:9px;font-size:13.5px;font-weight:500;cursor:pointer;transition:background .25s"
                  hover="background:#9a330a"
                >
                  {savingAdmin ? "Creating…" : "Create admin"}
                </Hv>
              </div>
            </div>

            <div style={s("background:#fff;border:1px solid #e7e0d3;border-radius:14px;overflow:hidden")}>
              <div
                style={s(
                  "display:grid;grid-template-columns:1.4fr 1fr .6fr;gap:14px;padding:13px 20px;border-bottom:1px solid #eee7db;font:500 11px 'Geist Mono',monospace;letter-spacing:.06em;color:#9a948a;text-transform:uppercase",
                )}
              >
                <span>Username</span>
                <span>Role</span>
                <span></span>
              </div>
              {adminsLoading ? (
                <div style={s("padding:24px 20px;color:#8a8275;font-size:13.5px")}>Loading admins…</div>
              ) : admins.length === 0 ? (
                <div style={s("padding:24px 20px;color:#8a8275;font-size:13.5px")}>No admin users found.</div>
              ) : (
                admins.map((a) => (
                  <div
                    key={a.id}
                    style={s(
                      "display:grid;grid-template-columns:1.4fr 1fr .6fr;gap:14px;padding:13px 20px;border-bottom:1px solid #f2ece1;align-items:center;font-size:13.5px",
                    )}
                  >
                    <span style={s("font-weight:500")}>
                      {a.username}
                      {a.username === adminUsername ? <span style={s("color:#9a948a;font-weight:400")}> (you)</span> : null}
                    </span>
                    <span style={s("color:#8a8275;text-transform:capitalize")}>{a.role}</span>
                    <span onClick={() => deleteAdmin(a.id)} style={s("font-size:12.5px;color:#b3402a;cursor:pointer;font-weight:500")}>
                      Remove
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
