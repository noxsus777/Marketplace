import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer data-testid="footer" className="border-t border-[#2a2a3a] mt-16 pt-12 pb-8 px-4 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] flex items-center justify-center">
                <span className="text-white font-bold text-xs">PS</span>
              </div>
              <span className="heading-font text-lg font-semibold text-white">Premium Sphere</span>
            </div>
            <p className="text-sm text-[#6b6b80] leading-relaxed max-w-sm">
              Your trusted digital marketplace for game keys, subscriptions, gift cards & software. Instant delivery, secure payments, 24/7 support.
            </p>
          </div>
          <div>
            <h4 className="text-xs tracking-wider uppercase font-bold text-[#a1a1b5] mb-4">Store</h4>
            <ul className="space-y-2">
              {["Gaming", "Subscriptions", "Gift Cards", "Software", "AI & Tools"].map(item => (
                <li key={item}>
                  <Link to={`/search?category=${encodeURIComponent(item)}`} data-testid={`footer-link-${item.toLowerCase().replace(/\s+/g, '-')}`} className="text-sm text-[#6b6b80] hover:text-white transition-colors">{item}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs tracking-wider uppercase font-bold text-[#a1a1b5] mb-4">Support</h4>
            <ul className="space-y-2">
              {["Contact Us", "FAQ", "Terms", "Privacy"].map(item => (
                <li key={item}>
                  <span className="text-sm text-[#6b6b80] hover:text-white transition-colors cursor-pointer">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-[#2a2a3a] pt-6 text-center">
          <p className="text-xs text-[#6b6b80]">&copy; {new Date().getFullYear()} Premium Sphere. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
