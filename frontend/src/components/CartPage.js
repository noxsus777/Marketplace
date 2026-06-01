import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, ShoppingCart, ArrowLeft, ChevronRight, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import API from "@/lib/api";

const CartPage = () => {
  const { user } = useAuth();
  const { cart, fetchCart, removeFromCart, clearCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => { if (user) fetchCart(); }, [user, fetchCart]);

  const handleCheckout = async () => {
    try {
      await API.post("/orders");
      await fetchCart();
      navigate("/orders");
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-16 gap-4">
        <ShoppingCart size={48} className="text-[#2a2a3a]" />
        <p className="text-[#6b6b80]">Sign in to view your cart</p>
        <Link to="/login" className="bg-[#6c5ce7] text-white px-6 py-2.5 rounded-xl text-sm font-medium">Sign In</Link>
      </div>
    );
  }

  return (
    <div data-testid="cart-page" className="pt-20 pb-16 max-w-4xl mx-auto px-4 lg:px-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#6b6b80] hover:text-white mb-6 transition-colors">
        <ArrowLeft size={16} /> Continue Shopping
      </Link>

      <h1 className="heading-font text-2xl font-semibold text-white mb-6">Shopping Cart</h1>

      {cart.items.length === 0 ? (
        <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-12 text-center">
          <ShoppingCart size={48} className="text-[#2a2a3a] mx-auto mb-4" />
          <p className="text-[#6b6b80] mb-4">Your cart is empty</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-[#6c5ce7] text-white px-6 py-2.5 rounded-xl text-sm font-medium">
            Browse Store <ChevronRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {cart.items.map((item) => (
            <div key={item.product_id} data-testid={`cart-item-${item.product_id}`} className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-4 flex items-center gap-4">
              <img src={item.product?.image_url} alt={item.product?.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <Link to={`/product/${item.product_id}`} className="text-sm font-medium text-white hover:text-[#6c5ce7] truncate block">{item.product?.name}</Link>
                <p className="text-xs text-[#6b6b80]">Qty: {item.quantity}</p>
              </div>
              <span className="text-base font-bold text-white">NPR {(item.product?.price * item.quantity).toFixed(2)}</span>
              <button data-testid={`remove-cart-${item.product_id}`} onClick={() => removeFromCart(item.product_id)} className="p-2 text-[#6b6b80] hover:text-[#e74c3c] transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[#a1a1b5]">Total</span>
              <span data-testid="cart-total" className="text-2xl font-bold text-white">NPR {cart.total.toFixed(2)}</span>
            </div>
            <div className="flex flex-col gap-3">
              <a
                href={`https://wa.me/9779811761679?text=${encodeURIComponent(
                  `Hi! I'd like to purchase the following from Premium Sphere:\n\n${cart.items.map(i => `- ${i.product?.name} x${i.quantity} (NPR ${(i.product?.price * i.quantity).toFixed(2)})`).join('\n')}\n\nTotal: NPR ${cart.total.toFixed(2)}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="whatsapp-checkout-button"
                className="w-full bg-[#25D366] hover:bg-[#1da851] text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-base"
              >
                <MessageCircle size={20} /> Buy on WhatsApp
              </a>
              <button data-testid="checkout-button" onClick={handleCheckout} className="w-full bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                Place Order (In-App)
              </button>
              <button data-testid="clear-cart-button" onClick={clearCart} className="w-full px-6 py-2.5 border border-[#2a2a3a] rounded-xl text-sm text-[#a1a1b5] hover:text-white hover:border-[#6b6b80] transition-colors">
                Clear Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
