import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import API from "@/lib/api";

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        const q = searchParams.get("q");
        const cat = searchParams.get("category");
        if (q) params.set("search", q);
        if (cat) params.set("category", cat);
        if (searchParams.get("featured")) params.set("featured", "true");
        if (searchParams.get("best_seller")) params.set("best_seller", "true");
        params.set("limit", "100");

        const [prodRes, catRes] = await Promise.all([
          API.get(`/products?${params.toString()}`),
          API.get("/categories"),
        ]);
        setProducts(prodRes.data.products);
        setCategories(catRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (selectedCategory) params.set("category", selectedCategory);
    setSearchParams(params);
  };

  const handleCategoryClick = (catName) => {
    const newCat = selectedCategory === catName ? "" : catName;
    setSelectedCategory(newCat);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (newCat) params.set("category", newCat);
    setSearchParams(params);
  };

  return (
    <div data-testid="search-page" className="pt-20 pb-16 max-w-7xl mx-auto px-4 lg:px-8">
      <div className="mb-8">
        <form onSubmit={handleSearch} className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b80]" />
            <input
              data-testid="search-page-input"
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full bg-[#16161f] border border-[#2a2a3a] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-[#6b6b80] focus:outline-none focus:border-[#6c5ce7]"
            />
          </div>
          <button data-testid="search-page-submit" type="submit" className="bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white px-6 rounded-xl font-medium text-sm transition-colors flex items-center gap-2">
            <SlidersHorizontal size={16} /> Filter
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => handleCategoryClick("")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!selectedCategory ? "bg-[#6c5ce7] text-white" : "bg-[#16161f] text-[#a1a1b5] border border-[#2a2a3a] hover:border-[#6c5ce7]"}`}>
            All
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => handleCategoryClick(cat.name)} data-testid={`filter-category-${cat.id}`} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedCategory === cat.name ? "bg-[#6c5ce7] text-white" : "bg-[#16161f] text-[#a1a1b5] border border-[#2a2a3a] hover:border-[#6c5ce7]"}`}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin" /></div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[#6b6b80] text-lg">No products found</p>
          <p className="text-[#6b6b80] text-sm mt-2">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.map(product => {
            const discount = product.original_price ? Math.round(((product.original_price - product.price) / product.original_price) * 100) : 0;
            return (
              <Link to={`/product/${product.id}`} key={product.id} data-testid={`search-product-${product.id}`} className="product-card">
                <div className="relative aspect-square bg-[#1c1c28] overflow-hidden">
                  {product.badge && <span className={`absolute top-2 left-2 z-10 ${product.badge === "HOT" ? "badge-hot" : product.badge === "NEW" ? "badge-new" : "badge-deal"}`}>{product.badge}</span>}
                  {discount > 0 && <span className="discount-badge">-{discount}%</span>}
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
                <div className="p-3">
                  <p className="text-xs text-[#6b6b80] mb-1 truncate">{product.category}</p>
                  <h3 className="text-sm font-medium text-white mb-2 line-clamp-2 leading-tight min-h-[2.5rem]">{product.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">NPR {product.price.toFixed(2)}</span>
                    {product.original_price && <span className="text-xs text-[#6b6b80] line-through">NPR {product.original_price.toFixed(2)}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
