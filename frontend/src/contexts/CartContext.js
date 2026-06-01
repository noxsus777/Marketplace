import { createContext, useContext, useState, useCallback } from "react";
import API from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [cartCount, setCartCount] = useState(0);

  const fetchCart = useCallback(async () => {
    if (!user) { setCart({ items: [], total: 0 }); setCartCount(0); return; }
    try {
      const { data } = await API.get("/cart");
      setCart(data);
      setCartCount(data.items.reduce((sum, i) => sum + i.quantity, 0));
    } catch {
      setCart({ items: [], total: 0 });
      setCartCount(0);
    }
  }, [user]);

  const addToCart = async (productId, quantity = 1) => {
    await API.post("/cart/add", { product_id: productId, quantity });
    await fetchCart();
  };

  const removeFromCart = async (productId) => {
    await API.post("/cart/remove", { product_id: productId });
    await fetchCart();
  };

  const clearCart = async () => {
    await API.post("/cart/clear");
    await fetchCart();
  };

  return (
    <CartContext.Provider value={{ cart, cartCount, fetchCart, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};
