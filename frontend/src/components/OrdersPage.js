import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Package, Clock, CheckCircle, Loader2, XCircle, Truck } from "lucide-react";
import API from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const OrdersPage = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      API.get("/orders").then(res => { setOrders(res.data); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [user]);

  if (!user) return <div className="min-h-screen flex items-center justify-center pt-16 text-[#6b6b80]">Sign in to view orders</div>;

  return (
    <div data-testid="orders-page" className="pt-20 pb-16 max-w-4xl mx-auto px-4 lg:px-8">
      <h1 className="heading-font text-2xl font-semibold text-white mb-6">My Orders</h1>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin" /></div>
      ) : orders.length === 0 ? (
        <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-12 text-center">
          <Package size={48} className="text-[#2a2a3a] mx-auto mb-4" />
          <p className="text-[#6b6b80] mb-4">No orders yet</p>
          <Link to="/" className="inline-flex bg-[#6c5ce7] text-white px-6 py-2.5 rounded-xl text-sm font-medium">Browse Store</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} data-testid={`order-${order.id}`} className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-[#6b6b80]">Order #{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-[#6b6b80]">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {order.status === "pending" && <Clock size={14} className="text-[#f39c12]" />}
                  {order.status === "processing" && <Loader2 size={14} className="text-[#6c5ce7]" />}
                  {order.status === "delivered" && <Truck size={14} className="text-[#00b894]" />}
                  {order.status === "completed" && <CheckCircle size={14} className="text-[#00b894]" />}
                  {order.status === "cancelled" && <XCircle size={14} className="text-[#e74c3c]" />}
                  <span className={`text-xs font-medium capitalize ${
                    order.status === "pending" ? "text-[#f39c12]" :
                    order.status === "processing" ? "text-[#6c5ce7]" :
                    order.status === "cancelled" ? "text-[#e74c3c]" :
                    "text-[#00b894]"
                  }`}>{order.status}</span>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {item.image_url && <img src={item.image_url} alt="" className="w-10 h-10 rounded object-cover" />}
                    <div className="flex-1">
                      <p className="text-sm text-white">{item.product_name}</p>
                      <p className="text-xs text-[#6b6b80]">x{item.quantity}</p>
                    </div>
                    <span className="text-sm font-medium text-white">NPR {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#2a2a3a] pt-3 flex justify-between">
                <span className="text-sm text-[#a1a1b5]">Total</span>
                <span className="text-base font-bold text-white">NPR {order.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
