import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import HomePage from "@/components/Hero";
import { LoginPage, RegisterPage } from "@/components/AuthPages";
import ProductPage from "@/components/ProductPage";
import CartPage from "@/components/CartPage";
import SearchPage from "@/components/SearchPage";
import OrdersPage from "@/components/OrdersPage";
import AdminPanel from "@/components/AdminPanel";
import Footer from "@/components/Footer";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("App crashed:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0a0a0f", color: "#fff", gap: "12px", padding: "24px", textAlign: "center" }}>
          <div style={{ fontSize: "48px" }}>⚠️</div>
          <p style={{ fontSize: "18px", fontWeight: 600 }}>Something went wrong</p>
          <p style={{ color: "#a1a1b5", fontSize: "14px" }}>{this.state.error?.message || "An unexpected error occurred"}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: "8px", background: "#6c5ce7", color: "#fff", border: "none", borderRadius: "12px", padding: "10px 24px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/product/:id" element={<ProductPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/admin" element={<AdminPanel />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
