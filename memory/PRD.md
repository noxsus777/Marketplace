# Premium Sphere - E-Commerce Marketplace PRD

## Overview
Premium Sphere is a dark-themed digital marketplace e-commerce platform inspired by shoppystorenp.com. Built as a general marketplace for game keys, subscriptions, gift cards, software, and AI tools.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + React Router v7
- **Backend**: FastAPI (Python) + MongoDB (motor async driver)
- **Auth**: JWT-based with httpOnly cookies, bcrypt password hashing
- **Database**: MongoDB with collections: users, products, categories, carts, orders, login_attempts

## Core Requirements
1. Product catalog with categories & search
2. User authentication (register/login/logout)
3. Shopping cart & checkout UI (no payment integration)
4. Admin panel for product/category management
5. Dark theme matching reference site style

## What's Been Implemented (April 12, 2026)
- Full backend API: auth, products CRUD, categories CRUD, cart, orders, admin stats
- Seeded 20 products across 6 categories
- Admin user auto-seeded
- Frontend: Homepage with hero, trust badges, categories grid, product carousels
- Product detail page with add-to-cart
- Cart page with checkout flow
- Search page with category filtering
- Orders page showing order history
- Admin panel with product/category CRUD and stats dashboard
- **Cloudinary image upload** — drag-and-drop or click-to-upload for product images (signed upload flow)
- Simplified admin product form: just name, description, photo, price — with optional extras collapsed
- **Order status management** — admin can update order status (pending/processing/delivered/completed/cancelled) via dropdown
- **WhatsApp Buy button** — green "Buy on WhatsApp" button on product pages and cart, pre-fills message with product/order details to +977 9811761679
- Responsive dark-themed design
- All tests passing (100% backend, 100% frontend)

## User Personas
1. **Customer** - Browse, search, add to cart, checkout, view orders
2. **Admin** - Manage products, categories, view orders & stats

## Prioritized Backlog
### P0 (Done)
- [x] Product catalog with categories & search
- [x] User auth (register/login/logout)
- [x] Cart & checkout UI
- [x] Admin panel
- [x] Cloudinary image upload for products
- [x] Order status management (admin dropdown)
- [x] WhatsApp Buy button (product page + cart)

### P1 (Next)
- [ ] Wishlist functionality
- [ ] User profile page
- [ ] Flash sale timer feature
- [ ] Product reviews & ratings

### P2 (Future)
- [ ] Payment integration (Stripe)
- [ ] Product reviews & ratings
- [ ] Email notifications (order confirmation)
- [ ] Flash sale timer feature
- [ ] Product variants (e.g., 1 month / 3 months / 1 year)

## Next Tasks
1. Add product image upload via Cloudinary
2. Order status management for admin
3. Wishlist feature
4. Payment integration
