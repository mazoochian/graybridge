"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { Product } from "@/lib/catalog";

export interface CartItem {
  key: string;
  id: number;
  size: string;
  color: string;
  qty: number;
}

export interface Customer {
  name: string;
  email: string;
}

interface StoreValue {
  catalog: Product[];
  setCatalog: Dispatch<SetStateAction<Product[]>>;
  catalogLoading: boolean;
  catalogError: boolean;
  reloadCatalog: () => void;
  cart: CartItem[];
  cartOpen: boolean;
  toast: string;
  cartCount: number;
  addToCart: (id: number, size?: string, color?: string) => void;
  changeQty: (key: string, d: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  showToast: (msg: string, ms?: number) => void;
  customer: Customer | null;
  customerChecked: boolean;
  refreshCustomer: () => Promise<void>;
  wishlist: number[];
  toggleWishlist: (productId: number) => void;
}

const StoreCtx = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const v = useContext(StoreCtx);
  if (!v) throw new Error("useStore must be used inside <Providers>");
  return v;
}

export function Providers({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate cart from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem("gb_cart") || "[]");
      if (Array.isArray(c)) setCart(c);
    } catch {
      /* ignore */
    }
  }, []);

  const loadCatalog = () => {
    setCatalogLoading(true);
    setCatalogError(false);
    fetch("/api/products")
      .then((r) => {
        if (!r.ok) throw new Error(`products fetch failed: ${r.status}`);
        return r.json();
      })
      .then((rows) => {
        if (Array.isArray(rows)) setCatalog(rows);
        else throw new Error("unexpected /api/products response shape");
      })
      .catch(() => setCatalogError(true))
      .finally(() => setCatalogLoading(false));
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerChecked, setCustomerChecked] = useState(false);
  const [wishlist, setWishlist] = useState<number[]>([]);

  const refreshCustomer = async () => {
    try {
      const res = await fetch("/api/account/me");
      const data = await res.json();
      setCustomer(data?.authed ? { name: data.name, email: data.email } : null);
    } catch {
      setCustomer(null);
    } finally {
      setCustomerChecked(true);
    }
  };

  useEffect(() => {
    refreshCustomer();
  }, []);

  useEffect(() => {
    if (!customer) {
      setWishlist([]);
      return;
    }
    fetch("/api/account/wishlist")
      .then((r) => r.json())
      .then((d) => setWishlist(Array.isArray(d?.items) ? d.items.map((i: { productId: number }) => i.productId) : []))
      .catch(() => setWishlist([]));
  }, [customer]);

  const toggleWishlist = (productId: number) => {
    if (!customer) {
      showToast("Sign in to save favorites");
      return;
    }
    const has = wishlist.includes(productId);
    setWishlist((prev) => (has ? prev.filter((id) => id !== productId) : [...prev, productId]));
    if (has) {
      fetch(`/api/account/wishlist/${productId}`, { method: "DELETE" }).catch(() => {});
    } else {
      fetch("/api/account/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      }).catch(() => {});
    }
  };

  const persist = (c: CartItem[]) => {
    try {
      localStorage.setItem("gb_cart", JSON.stringify(c));
    } catch {
      /* ignore */
    }
  };

  const showToast = (msg: string, ms = 2600) => {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), ms);
  };

  const addToCart = (id: number, size = "M", color = "") => {
    setCart((prev) => {
      const next = prev.map((c) => ({ ...c }));
      const key = id + "_" + size;
      const ex = next.find((c) => c.key === key);
      if (ex) ex.qty++;
      else next.push({ key, id, size, color, qty: 1 });
      persist(next);
      return next;
    });
    const p = catalog.find((x) => x.id === id);
    showToast((p ? p.name : "Item") + " added to bag");
    setCartOpen(true);
  };

  const changeQty = (key: string, d: number) => {
    setCart((prev) => {
      let next = prev.map((c) => ({ ...c }));
      const it = next.find((c) => c.key === key);
      if (!it) return prev;
      it.qty += d;
      if (it.qty <= 0) next = next.filter((c) => c.key !== key);
      persist(next);
      return next;
    });
  };

  const removeItem = (key: string) => {
    setCart((prev) => {
      const next = prev.filter((c) => c.key !== key);
      persist(next);
      return next;
    });
  };

  const clearCart = () => {
    persist([]);
    setCart([]);
    setCartOpen(false);
  };

  const cartCount = cart.reduce((n, c) => n + c.qty, 0);

  const value: StoreValue = {
    catalog,
    setCatalog,
    catalogLoading,
    catalogError,
    reloadCatalog: loadCatalog,
    cart,
    cartOpen,
    toast,
    cartCount,
    addToCart,
    changeQty,
    removeItem,
    clearCart,
    openCart: () => setCartOpen(true),
    closeCart: () => setCartOpen(false),
    showToast,
    customer,
    customerChecked,
    refreshCustomer,
    wishlist,
    toggleWishlist,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
