import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Edit, Package, Users, ShoppingCart, Tag, X, Save, Upload, Image, Loader2 } from "lucide-react";
import API from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ImageUploader = ({ value, onChange }) => {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || "");
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { setPreview(value || ""); }, [value]);

  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      // Get signed params from backend
      const { data: sig } = await API.get("/cloudinary/signature");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sig.api_key);
      formData.append("timestamp", sig.timestamp);
      formData.append("signature", sig.signature);
      formData.append("folder", sig.folder);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`,
        { method: "POST", body: formData }
      );
      const result = await res.json();

      if (result.secure_url) {
        setPreview(result.secure_url);
        onChange(result.secure_url);
      }
    } catch (e) {
      console.error("Upload failed:", e);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) uploadFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  return (
    <div
      data-testid="image-uploader"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && fileRef.current?.click()}
      className={`relative cursor-pointer border-2 border-dashed rounded-xl transition-all duration-300 overflow-hidden ${
        dragOver ? "border-[#6c5ce7] bg-[#6c5ce7]/10" : preview ? "border-[#2a2a3a]" : "border-[#2a2a3a] hover:border-[#6c5ce7]/50"
      }`}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        data-testid="image-file-input"
      />

      {uploading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 size={32} className="text-[#6c5ce7] animate-spin mb-3" />
          <p className="text-sm text-[#a1a1b5]">Uploading...</p>
        </div>
      ) : preview ? (
        <div className="relative group">
          <img src={preview} alt="Product" className="w-full h-48 object-cover" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <p className="text-sm text-white font-medium">Click to change</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="w-14 h-14 rounded-2xl bg-[#6c5ce7]/10 flex items-center justify-center mb-3">
            <Image size={24} className="text-[#6c5ce7]" />
          </div>
          <p className="text-sm font-medium text-white mb-1">Drop image here or click to upload</p>
          <p className="text-xs text-[#6b6b80]">PNG, JPG, WEBP up to 10MB</p>
        </div>
      )}
    </div>
  );
};

const AdminPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("products");
  const [stats, setStats] = useState({});
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({
    name: "", description: "", price: "", original_price: "", image_url: "",
    category: "", subcategory: "", platform: "", badge: "", in_stock: true, featured: false, best_seller: false,
  });
  const [catForm, setCatForm] = useState({ name: "", icon: "", description: "" });
  const [showCatForm, setShowCatForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") { navigate("/"); return; }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      const [s, p, c, o] = await Promise.all([
        API.get("/admin/stats"), API.get("/products?limit=100"), API.get("/categories"), API.get("/orders"),
      ]);
      setStats(s.data);
      setProducts(p.data.products);
      setCategories(c.data);
      setOrders(o.data);
    } catch (e) { console.error(e); }
  };

  const resetForm = () => ({
    name: "", description: "", price: "", original_price: "", image_url: "",
    category: "", subcategory: "", platform: "", badge: "", in_stock: true, featured: false, best_seller: false,
  });

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      price: parseFloat(form.price) || 0,
      original_price: form.original_price ? parseFloat(form.original_price) : null,
    };
    try {
      if (editingProduct) {
        await API.put(`/products/${editingProduct.id}`, payload);
      } else {
        await API.post("/products", payload);
      }
      setShowForm(false);
      setEditingProduct(null);
      setForm(resetForm());
      loadData();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleEdit = (p) => {
    setEditingProduct(p);
    setForm({ ...p, price: String(p.price), original_price: p.original_price ? String(p.original_price) : "" });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    await API.delete(`/products/${id}`);
    loadData();
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    await API.post("/categories", catForm);
    setCatForm({ name: "", icon: "", description: "" });
    setShowCatForm(false);
    loadData();
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    await API.delete(`/categories/${id}`);
    loadData();
  };

  if (!user || user.role !== "admin") return null;

  return (
    <div data-testid="admin-panel" className="pt-20 pb-16 max-w-7xl mx-auto px-4 lg:px-8">
      <h1 className="heading-font text-2xl font-semibold text-white mb-6">Admin Panel</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Package, label: "Products", value: stats.total_products || 0, color: "#6c5ce7" },
          { icon: ShoppingCart, label: "Orders", value: stats.total_orders || 0, color: "#00b894" },
          { icon: Users, label: "Users", value: stats.total_users || 0, color: "#f39c12" },
          { icon: Tag, label: "Categories", value: stats.total_categories || 0, color: "#e74c3c" },
        ].map(s => (
          <div key={s.label} data-testid={`stat-${s.label.toLowerCase()}`} className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-5">
            <s.icon size={20} style={{ color: s.color }} className="mb-2" />
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-[#6b6b80]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {["products", "categories", "orders"].map(t => (
          <button key={t} onClick={() => setTab(t)} data-testid={`admin-tab-${t}`} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? "bg-[#6c5ce7] text-white" : "bg-[#16161f] text-[#a1a1b5] border border-[#2a2a3a]"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Products Tab */}
      {tab === "products" && (
        <div>
          <button data-testid="add-product-button" onClick={() => { setShowForm(true); setEditingProduct(null); setForm(resetForm()); }} className="mb-4 bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors">
            <Plus size={16} /> Add Product
          </button>

          {showForm && (
            <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-6 mb-6 animate-fadeInUp">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white">{editingProduct ? "Edit Product" : "Add New Product"}</h3>
                <button onClick={() => { setShowForm(false); setEditingProduct(null); }} className="text-[#6b6b80] hover:text-white transition-colors"><X size={20} /></button>
              </div>

              <form onSubmit={handleSaveProduct}>
                {/* Image Upload - prominent at top */}
                <div className="mb-6">
                  <label className="text-xs text-[#a1a1b5] mb-2 block font-medium">Product Image</label>
                  <ImageUploader value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} />
                </div>

                {/* Essential fields: Name, Description, Price */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-xs text-[#a1a1b5] mb-1 block font-medium">Product Name *</label>
                    <input data-testid="product-form-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Netflix Premium 1 Month" className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#6b6b80] focus:outline-none focus:border-[#6c5ce7] transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-[#a1a1b5] mb-1 block font-medium">Description</label>
                    <textarea data-testid="product-form-description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What is this product? Describe it briefly..." rows={3} className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#6b6b80] focus:outline-none focus:border-[#6c5ce7] transition-colors resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-[#a1a1b5] mb-1 block font-medium">Price (NPR) *</label>
                      <input data-testid="product-form-price" type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required placeholder="9.99" className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#6b6b80] focus:outline-none focus:border-[#6c5ce7] transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs text-[#a1a1b5] mb-1 block font-medium">Original Price (optional)</label>
                      <input type="number" step="0.01" value={form.original_price} onChange={e => setForm({ ...form, original_price: e.target.value })} placeholder="19.99" className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#6b6b80] focus:outline-none focus:border-[#6c5ce7] transition-colors" />
                    </div>
                  </div>
                </div>

                {/* Optional details - collapsible feel */}
                <details className="mb-6 group">
                  <summary className="text-sm text-[#6c5ce7] cursor-pointer font-medium mb-4 hover:text-[#a29bfe] transition-colors">More options (category, badge, flags...)</summary>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="text-xs text-[#a1a1b5] mb-1 block">Category</label>
                      <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#6c5ce7]">
                        <option value="">Select category</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[#a1a1b5] mb-1 block">Platform</label>
                      <input value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} placeholder="e.g. Steam, Web" className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#6b6b80] focus:outline-none focus:border-[#6c5ce7]" />
                    </div>
                    <div>
                      <label className="text-xs text-[#a1a1b5] mb-1 block">Badge</label>
                      <select value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#6c5ce7]">
                        <option value="">None</option>
                        <option value="HOT">HOT</option>
                        <option value="NEW">NEW</option>
                        <option value="DEAL">DEAL</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-5 mt-4">
                    <label className="flex items-center gap-2 text-sm text-[#a1a1b5] cursor-pointer">
                      <input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} className="accent-[#6c5ce7] w-4 h-4" /> Featured
                    </label>
                    <label className="flex items-center gap-2 text-sm text-[#a1a1b5] cursor-pointer">
                      <input type="checkbox" checked={form.best_seller} onChange={e => setForm({ ...form, best_seller: e.target.checked })} className="accent-[#6c5ce7] w-4 h-4" /> Best Seller
                    </label>
                    <label className="flex items-center gap-2 text-sm text-[#a1a1b5] cursor-pointer">
                      <input type="checkbox" checked={form.in_stock} onChange={e => setForm({ ...form, in_stock: e.target.checked })} className="accent-[#6c5ce7] w-4 h-4" /> In Stock
                    </label>
                  </div>
                </details>

                <button data-testid="product-form-submit" type="submit" disabled={saving} className="w-full bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
                </button>
              </form>
            </div>
          )}

          {/* Product List */}
          <div className="space-y-2">
            {products.map(p => (
              <div key={p.id} data-testid={`admin-product-${p.id}`} className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-3 flex items-center gap-3 hover:border-[#2a2a3a]/80 transition-colors">
                <img src={p.image_url || "https://via.placeholder.com/48"} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-[#1c1c28]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{p.name}</p>
                  <p className="text-xs text-[#6b6b80]">{p.category || "Uncategorized"} &middot; NPR {p.price?.toFixed(2)}</p>
                </div>
                {p.badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.badge === "HOT" ? "bg-[#e74c3c]/20 text-[#e74c3c]" : p.badge === "NEW" ? "bg-[#6c5ce7]/20 text-[#6c5ce7]" : "bg-[#f39c12]/20 text-[#f39c12]"}`}>{p.badge}</span>}
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => handleEdit(p)} data-testid={`edit-product-${p.id}`} className="p-2 text-[#a1a1b5] hover:text-[#6c5ce7] transition-colors rounded-lg hover:bg-[#6c5ce7]/10"><Edit size={14} /></button>
                  <button onClick={() => handleDelete(p.id)} data-testid={`delete-product-${p.id}`} className="p-2 text-[#a1a1b5] hover:text-[#e74c3c] transition-colors rounded-lg hover:bg-[#e74c3c]/10"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {tab === "categories" && (
        <div>
          <button onClick={() => setShowCatForm(true)} data-testid="add-category-button" className="mb-4 bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors">
            <Plus size={16} /> Add Category
          </button>
          {showCatForm && (
            <form onSubmit={handleAddCategory} className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-end">
              <input data-testid="category-form-name" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} required placeholder="Name" className="bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#6c5ce7]" />
              <input value={catForm.icon} onChange={e => setCatForm({ ...catForm, icon: e.target.value })} placeholder="Icon name" className="bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#6c5ce7]" />
              <input value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} placeholder="Description" className="bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#6c5ce7] flex-1" />
              <button type="submit" data-testid="category-form-submit" className="bg-[#6c5ce7] text-white px-4 py-2 rounded-lg text-sm font-medium">Add</button>
              <button type="button" onClick={() => setShowCatForm(false)} className="text-[#6b6b80] px-3 py-2 text-sm">Cancel</button>
            </form>
          )}
          <div className="space-y-2">
            {categories.map(c => (
              <div key={c.id} data-testid={`admin-category-${c.id}`} className="bg-[#16161f] border border-[#2a2a3a] rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{c.name}</p>
                  <p className="text-xs text-[#6b6b80]">{c.description}</p>
                </div>
                <button onClick={() => handleDeleteCategory(c.id)} className="p-2 text-[#a1a1b5] hover:text-[#e74c3c]"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {tab === "orders" && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <p className="text-[#6b6b80] text-center py-12">No orders yet</p>
          ) : orders.map(o => (
            <div key={o.id} data-testid={`admin-order-${o.id}`} className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-medium text-white">Order #{o.id.slice(0, 8)}</p>
                  <p className="text-xs text-[#6b6b80]">{o.user_email} &middot; {new Date(o.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    data-testid={`order-status-select-${o.id}`}
                    value={o.status}
                    onChange={async (e) => {
                      try {
                        await API.put(`/orders/${o.id}/status`, { status: e.target.value });
                        loadData();
                      } catch (err) { console.error(err); }
                    }}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border cursor-pointer focus:outline-none transition-colors ${
                      o.status === "pending" ? "bg-[#f39c12]/10 border-[#f39c12]/30 text-[#f39c12]" :
                      o.status === "processing" ? "bg-[#6c5ce7]/10 border-[#6c5ce7]/30 text-[#6c5ce7]" :
                      o.status === "delivered" ? "bg-[#00b894]/10 border-[#00b894]/30 text-[#00b894]" :
                      o.status === "completed" ? "bg-[#00b894]/10 border-[#00b894]/30 text-[#00b894]" :
                      "bg-[#e74c3c]/10 border-[#e74c3c]/30 text-[#e74c3c]"
                    }`}
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="delivered">Delivered</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2 mb-3">
                {o.items?.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {item.image_url && <img src={item.image_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{item.product_name}</p>
                      <p className="text-xs text-[#6b6b80]">x{item.quantity} &middot; NPR {item.price?.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#2a2a3a] pt-3 flex justify-between items-center">
                <span className="text-xs text-[#6b6b80]">{o.items?.length || 0} item(s)</span>
                <span className="text-base font-bold text-white">NPR {o.total?.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
