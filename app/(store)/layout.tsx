import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { Toast } from "@/components/Toast";
import { s } from "@/lib/style";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={s("min-height:100vh;display:flex;flex-direction:column")}>
      <Header />
      {children}
      <Footer />
      <CartDrawer />
      <Toast />
    </div>
  );
}
