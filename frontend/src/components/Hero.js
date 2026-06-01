import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Zap, Shield, Clock, Star, Tv, Gamepad2, Monitor, Gift, Cpu } from "lucide-react";
import API from "@/lib/api";

const ICON_MAP = { Tv, Gamepad2, Monitor, Gift, Cpu, Zap };

const ProductCard = ({ product, onAddToCart }) => {
  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  return (
    <Link to={`/product/${product.id}`} data-testid={`product-card-${product.id}`} className="product-card flex-shrink-0 w-[200px] sm:w-[220px]">
      <div className="relative aspect-square bg-[#1c1c28] overflow-hidden">
        {product.badge && (
          <span className={`absolute top-2 left-2 z-10 ${product.badge === "HOT" ? "badge-hot" : product.badge === "NEW" ? "badge-new" : "badge-deal"}`}>
            {product.badge}
          </span>
        )}
        {discount > 0 && <span className="discount-badge">-{discount}%</span>}
        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" />
      </div>
      <div className="p-3">
        <p className="text-xs text-[#6b6b80] mb-1 truncate">{product.category} {product.platform && `• ${product.platform}`}</p>
        <h3 className="text-sm font-medium text-white mb-2 line-clamp-2 leading-tight min-h-[2.5rem]">{product.name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-white">NPR {product.price.toFixed(2)}</span>
          {product.original_price && (
            <span className="text-xs text-[#6b6b80] line-through">NPR {product.original_price.toFixed(2)}</span>
          )}
        </div>
      </div>
    </Link>
  );
};

const ProductCarousel = ({ title, products, showAll = "/search" }) => {
  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <Link to={showAll} data-testid={`view-all-${title.toLowerCase().replace(/\s+/g, '-')}`} className="text-sm text-[#6c5ce7] hover:text-[#a29bfe] flex items-center gap-1 transition-colors">
          Show All <ChevronRight size={16} />
        </Link>
      </div>
      <div className="carousel-container flex gap-4 pb-2">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
};

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [wakingUp, setWakingUp] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 10;

    const load = async () => {
      while (attempt < maxAttempts) {
        try {
          const [prodRes, catRes] = await Promise.all([
            API.get("/products?limit=50"),
            API.get("/categories"),
          ]);
          if (!cancelled) {
            setProducts(prodRes.data.products);
            setCategories(catRes.data);
            setLoading(false);
            setWakingUp(false);
          }
          return;
        } catch (e) {
          attempt++;
          if (!cancelled) {
            setRetryCount(attempt);
            if (attempt >= 2) setWakingUp(true);
          }
          if (attempt < maxAttempts) {
            await new Promise(r => setTimeout(r, 5000));
          } else {
            if (!cancelled) setLoading(false);
          }
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const bestSellers = products.filter((p) => p.best_seller);
  const featured = products.filter((p) => p.featured);
  const gaming = products.filter((p) => p.category === "Gaming");
  const subs = products.filter((p) => p.category === "Subscriptions");
  const giftCards = products.filter((p) => p.category === "Gift Cards");

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-16 gap-5">
        <div className="w-10 h-10 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin" />
        {wakingUp ? (
          <div className="text-center">
            <p className="text-white font-semibold mb-1">🌙 Server is waking up...</p>
            <p className="text-[#a1a1b5] text-sm">This takes ~30 seconds on first load.</p>
            <p className="text-[#6b6b80] text-xs mt-1">Attempt {retryCount} of 10 — please wait</p>
            <div className="mt-3 w-48 h-1.5 bg-[#2a2a3a] rounded-full mx-auto overflow-hidden">
              <div
                className="h-full bg-[#6c5ce7] rounded-full transition-all duration-500"
                style={{ width: `${(retryCount / 10) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-[#6b6b80] text-sm">Loading store...</p>
        )}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-16 gap-4">
        <p className="text-white font-semibold">😴 Server didn't respond</p>
        <p className="text-[#a1a1b5] text-sm">Please refresh the page to try again.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div data-testid="home-page" className="pt-20 pb-16">
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 mb-12">
        <div className="hero-banner p-8 lg:p-12 flex flex-col lg:flex-row items-center gap-8">
          <div className="flex-1">
            <span className="inline-block text-xs tracking-widest uppercase font-bold text-[#6c5ce7] mb-3">Instant Delivery</span>
            <h1 data-testid="hero-heading" className="heading-font text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              Your Digital<br />Marketplace
            </h1>
            <p className="text-[#a1a1b5] text-base mb-6 max-w-md">
              Game keys, subscriptions, gift cards & software — delivered to your inbox in seconds.
            </p>
            <Link to="/search" data-testid="hero-cta" className="inline-flex items-center gap-2 bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white font-semibold px-6 py-3 rounded-xl transition-colors">
              Browse Store <ChevronRight size={18} />
            </Link>
          </div>
          <div className="flex-shrink-0 hidden lg:block">
            <img src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80" alt="Gaming" className="w-72 h-48 object-cover rounded-xl opacity-80" />
          </div>
        </div>
      </div>

      {/* Trust badges */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 mb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Zap, label: "Instant Delivery", sub: "Keys in seconds" },
            { icon: Shield, label: "100% Secure", sub: "Encrypted payments" },
            { icon: Clock, label: "24/7 Support", sub: "Always here to help" },
            { icon: Star, label: "4.9/5 Rating", sub: "Trusted by thousands" },
          ].map((b) => (
            <div key={b.label} className="trust-badge" data-testid={`trust-badge-${b.label.toLowerCase().replace(/\s+/g, '-')}`}>
              <b.icon size={20} className="text-[#6c5ce7] flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white">{b.label}</p>
                <p className="text-[10px] text-[#6b6b80]">{b.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 mb-12">
        <h2 className="text-xl font-semibold text-white mb-5">Browse Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.map((cat) => {
            const Icon = ICON_MAP[cat.icon] || Gift;
            return (
              <Link to={`/search?category=${encodeURIComponent(cat.name)}`} key={cat.id} data-testid={`category-card-${cat.id}`} className="category-card text-center">
                <Icon size={28} className="text-[#6c5ce7] mx-auto mb-2" />
                <p className="text-sm font-medium text-white mb-1">{cat.name}</p>
                <p className="text-[10px] text-[#6b6b80] line-clamp-2">{cat.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Product sections */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {featured.length > 0 && <ProductCarousel title="Featured Products" products={featured} showAll="/search?featured=true" />}
        {bestSellers.length > 0 && <ProductCarousel title="Best Sellers" products={bestSellers} showAll="/search?best_seller=true" />}
        {gaming.length > 0 && <ProductCarousel title="Gaming" products={gaming} showAll="/search?category=Gaming" />}
        {subs.length > 0 && <ProductCarousel title="Subscriptions" products={subs} showAll="/search?category=Subscriptions" />}
        {giftCards.length > 0 && <ProductCarousel title="Gift Cards" products={giftCards} showAll="/search?category=Gift+Cards" />}
      </div>
    </div>
  );
};

export default HomePage;
