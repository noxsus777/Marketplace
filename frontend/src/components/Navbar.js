import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, User, Menu, X, LogOut, Shield, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const [search, setSearch] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/search?q=${encodeURIComponent(search.trim())}`);
      setSearch("");
      setMobileOpen(false);
    }
  };

  return (
    <nav data-testid="navbar" className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "glass-nav shadow-lg" : "bg-[#0a0a0f]/90 backdrop-blur-md"}`}>
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" data-testid="nav-logo" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] flex items-center justify-center">
              <span className="text-white font-bold text-xs">PS</span>
            </div>
            <span className="heading-font text-lg font-semibold text-white hidden sm:block">Premium Sphere</span>
          </Link>

          {/* Search - desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b80]" />
              <input
                data-testid="search-input"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full bg-[#16161f] border border-[#2a2a3a] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#6b6b80] focus:outline-none focus:border-[#6c5ce7] transition-colors"
              />
            </div>
          </form>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <Link to="/cart" data-testid="cart-button" className="relative p-2 rounded-xl hover:bg-[#16161f] transition-colors">
              <ShoppingCart size={20} className="text-[#a1a1b5]" />
              {cartCount > 0 && (
                <span data-testid="cart-count" className="absolute -top-1 -right-1 w-5 h-5 bg-[#6c5ce7] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative">
                <button data-testid="user-menu-button" onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 p-2 rounded-xl hover:bg-[#16161f] transition-colors">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{user.name?.[0]?.toUpperCase() || "U"}</span>
                  </div>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-12 w-52 bg-[#16161f] border border-[#2a2a3a] rounded-xl shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-[#2a2a3a]">
                      <p className="text-sm font-medium text-white truncate">{user.name}</p>
                      <p className="text-xs text-[#6b6b80] truncate">{user.email}</p>
                    </div>
                    <Link to="/orders" onClick={() => setUserMenuOpen(false)} data-testid="nav-orders-link" className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#a1a1b5] hover:bg-[#1c1c28] hover:text-white transition-colors">
                      <Package size={15} /> My Orders
                    </Link>
                    {user.role === "admin" && (
                      <Link to="/admin" onClick={() => setUserMenuOpen(false)} data-testid="nav-admin-link" className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#a1a1b5] hover:bg-[#1c1c28] hover:text-white transition-colors">
                        <Shield size={15} /> Admin Panel
                      </Link>
                    )}
                    <button onClick={() => { logout(); setUserMenuOpen(false); }} data-testid="logout-button" className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#e74c3c] hover:bg-[#1c1c28] transition-colors">
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" data-testid="login-link" className="flex items-center gap-2 px-4 py-2 bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white text-sm font-medium rounded-xl transition-colors">
                <User size={16} /> Sign In
              </Link>
            )}

            <button data-testid="mobile-menu-toggle" className="md:hidden p-2 text-[#a1a1b5]" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        {mobileOpen && (
          <div className="md:hidden pb-4">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b80]" />
                <input
                  data-testid="mobile-search-input"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full bg-[#16161f] border border-[#2a2a3a] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#6b6b80] focus:outline-none focus:border-[#6c5ce7]"
                />
              </div>
            </form>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
