import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingCart, Check, Star, Shield, Zap, MessageCircle } from "lucide-react";
import API from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

const ProductPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    API.get(`/products/${id}`).then(res => { setProduct(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  const handleAdd = async () => {
    if (!user) { navigate("/login"); return; }
    try {
      await addToCart(product.id);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center pt-16"><div className="w-8 h-8 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin" /></div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center pt-16 text-[#6b6b80]">Product not found</div>;

  const discount = product.original_price ? Math.round(((product.original_price - product.price) / product.original_price) * 100) : 0;

  return (
    <div data-testid="product-page" className="pt-20 pb-16 max-w-7xl mx-auto px-4 lg:px-8">
      <Link to="/" data-testid="back-to-home" className="inline-flex items-center gap-2 text-sm text-[#6b6b80] hover:text-white mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Store
      </Link>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Image */}
        <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl overflow-hidden relative">
          {product.badge && (
            <span className={`absolute top-4 left-4 z-10 ${product.badge === "HOT" ? "badge-hot" : product.badge === "NEW" ? "badge-new" : "badge-deal"} text-sm px-3 py-1`}>
              {product.badge}
            </span>
          )}
          <img src={product.image_url} alt={product.name} data-testid="product-image" className="w-full aspect-square object-cover" />
        </div>

        {/* Details */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-[#6c5ce7] bg-[#6c5ce7]/10 px-3 py-1 rounded-full font-medium">{product.category}</span>
            {product.platform && <span className="text-xs text-[#6b6b80] bg-[#16161f] px-3 py-1 rounded-full border border-[#2a2a3a]">{product.platform}</span>}
          </div>

          <h1 data-testid="product-name" className="heading-font text-2xl sm:text-3xl font-semibold text-white mb-4">{product.name}</h1>

          <div className="flex items-center gap-3 mb-6">
            <span data-testid="product-price" className="text-3xl font-bold text-white">NPR {product.price.toFixed(2)}</span>
            {product.original_price && (
              <>
                <span className="text-lg text-[#6b6b80] line-through">NPR {product.original_price.toFixed(2)}</span>
                <span className="text-sm font-bold text-[#00b894] bg-[#00b894]/10 px-2 py-0.5 rounded">-{discount}%</span>
              </>
            )}
          </div>

          <p className="text-[#a1a1b5] text-base mb-8 leading-relaxed">{product.description}</p>

          <button data-testid="add-to-cart-button" onClick={handleAdd} className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all duration-300 ${added ? "bg-[#00b894] text-white" : "bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white"}`}>
            {added ? <><Check size={18} /> Added to Cart</> : <><ShoppingCart size={18} /> Add to Cart</>}
          </button>

          <a
            href={`https://wa.me/9779811761679?text=${encodeURIComponent(`Hi! I'm interested in buying "${product.name}" (NPR ${product.price.toFixed(2)}) from Premium Sphere.\n\nProduct: ${product.name}\nPrice: NPR ${product.price.toFixed(2)}\nLink: ${window.location.href}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="whatsapp-buy-button"
            className="w-full sm:w-auto mt-3 px-8 py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all duration-300 bg-[#25D366] hover:bg-[#1da851] text-white"
          >
            <MessageCircle size={18} /> Buy on WhatsApp
          </a>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { icon: Zap, label: "Instant Delivery" },
              { icon: Shield, label: "Secure Purchase" },
              { icon: Star, label: "Verified Seller" },
            ].map(b => (
              <div key={b.label} className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-3 text-center">
                <b.icon size={18} className="text-[#6c5ce7] mx-auto mb-1" />
                <p className="text-[10px] text-[#6b6b80]">{b.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
