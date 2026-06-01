from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import secrets
import uuid
import time
import cloudinary
import cloudinary.utils
import cloudinary.uploader
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from typing import List, Optional

# Cloudinary config
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ── Helpers ──
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str) -> str:
    return jwt.encode({"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=60), "type": "access"}, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    return jwt.encode({"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ── Models ──
class RegisterInput(BaseModel):
    name: str
    email: str
    password: str

class LoginInput(BaseModel):
    email: str
    password: str

class ProductCreate(BaseModel):
    name: str
    description: str = ""
    price: float
    original_price: Optional[float] = None
    image_url: str = ""
    category: str = ""
    subcategory: str = ""
    platform: str = ""
    badge: str = ""
    in_stock: bool = True
    featured: bool = False
    best_seller: bool = False

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    platform: Optional[str] = None
    badge: Optional[str] = None
    in_stock: Optional[bool] = None
    featured: Optional[bool] = None
    best_seller: Optional[bool] = None

class CategoryCreate(BaseModel):
    name: str
    icon: str = ""
    description: str = ""

class CartItemInput(BaseModel):
    product_id: str
    quantity: int = 1

class OrderStatusUpdate(BaseModel):
    status: str


# ── Auth Routes ──
@api_router.post("/auth/register")
async def register(input_data: RegisterInput, response: Response):
    email = input_data.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "email": email,
        "name": input_data.name,
        "password_hash": hash_password(input_data.password),
        "role": "customer",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return {"id": user_id, "email": email, "name": input_data.name, "role": "customer"}

@api_router.post("/auth/login")
async def login(input_data: LoginInput, request: Request, response: Response):
    email = input_data.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if locked_until and datetime.now(timezone.utc) < datetime.fromisoformat(locked_until):
            raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
        else:
            await db.login_attempts.delete_one({"identifier": identifier})

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(input_data.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": identifier})
    user_id = str(user["_id"])
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return {"id": user_id, "email": email, "name": user.get("name", ""), "role": user.get("role", "customer")}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie(key="access_token", value=access, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
        return {"message": "Token refreshed"}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ── Cloudinary Routes ──
@api_router.get("/cloudinary/signature")
async def cloudinary_signature(request: Request):
    await require_admin(request)
    timestamp = int(time.time())
    folder = "premium_sphere/products"
    params = {"timestamp": timestamp, "folder": folder}
    signature = cloudinary.utils.api_sign_request(params, os.getenv("CLOUDINARY_API_SECRET"))
    return {
        "signature": signature,
        "timestamp": timestamp,
        "cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME"),
        "api_key": os.getenv("CLOUDINARY_API_KEY"),
        "folder": folder,
    }


# ── Category Routes ──
@api_router.get("/categories")
async def get_categories():
    cats = await db.categories.find({}, {"_id": 0}).to_list(100)
    return cats

@api_router.post("/categories")
async def create_category(data: CategoryCreate, request: Request):
    await require_admin(request)
    cat_id = str(uuid.uuid4())
    doc = {"id": cat_id, **data.model_dump()}
    await db.categories.insert_one(doc)
    return {"id": cat_id, **data.model_dump()}

@api_router.delete("/categories/{cat_id}")
async def delete_category(cat_id: str, request: Request):
    await require_admin(request)
    await db.categories.delete_one({"id": cat_id})
    return {"message": "Deleted"}


# ── Product Routes ──
@api_router.get("/products")
async def get_products(category: Optional[str] = None, search: Optional[str] = None, featured: Optional[bool] = None, best_seller: Optional[bool] = None, limit: int = 50, skip: int = 0):
    query = {}
    if category:
        query["category"] = {"$regex": category, "$options": "i"}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}},
            {"platform": {"$regex": search, "$options": "i"}},
        ]
    if featured is not None:
        query["featured"] = featured
    if best_seller is not None:
        query["best_seller"] = best_seller
    products = await db.products.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.products.count_documents(query)
    return {"products": products, "total": total}

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.post("/products")
async def create_product(data: ProductCreate, request: Request):
    await require_admin(request)
    product_id = str(uuid.uuid4())
    doc = {"id": product_id, **data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, data: ProductUpdate, request: Request):
    await require_admin(request)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    return updated

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, request: Request):
    await require_admin(request)
    await db.products.delete_one({"id": product_id})
    return {"message": "Deleted"}


# ── Cart Routes ──
@api_router.get("/cart")
async def get_cart(request: Request):
    user = await get_current_user(request)
    cart = await db.carts.find_one({"user_id": user["_id"]}, {"_id": 0})
    if not cart:
        return {"user_id": user["_id"], "items": [], "total": 0}
    # Enrich with product details
    enriched = []
    total = 0
    for item in cart.get("items", []):
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            enriched.append({**item, "product": product})
            total += product["price"] * item["quantity"]
    return {"user_id": user["_id"], "items": enriched, "total": round(total, 2)}

@api_router.post("/cart/add")
async def add_to_cart(data: CartItemInput, request: Request):
    user = await get_current_user(request)
    cart = await db.carts.find_one({"user_id": user["_id"]})
    if not cart:
        await db.carts.insert_one({"user_id": user["_id"], "items": [{"product_id": data.product_id, "quantity": data.quantity}]})
    else:
        existing_item = None
        for item in cart.get("items", []):
            if item["product_id"] == data.product_id:
                existing_item = item
                break
        if existing_item:
            await db.carts.update_one(
                {"user_id": user["_id"], "items.product_id": data.product_id},
                {"$inc": {"items.$.quantity": data.quantity}},
            )
        else:
            await db.carts.update_one(
                {"user_id": user["_id"]},
                {"$push": {"items": {"product_id": data.product_id, "quantity": data.quantity}}},
            )
    return {"message": "Added to cart"}

@api_router.post("/cart/remove")
async def remove_from_cart(data: CartItemInput, request: Request):
    user = await get_current_user(request)
    await db.carts.update_one(
        {"user_id": user["_id"]},
        {"$pull": {"items": {"product_id": data.product_id}}},
    )
    return {"message": "Removed from cart"}

@api_router.post("/cart/clear")
async def clear_cart(request: Request):
    user = await get_current_user(request)
    await db.carts.update_one({"user_id": user["_id"]}, {"$set": {"items": []}})
    return {"message": "Cart cleared"}


# ── Order Routes ──
@api_router.post("/orders")
async def create_order(request: Request):
    user = await get_current_user(request)
    cart = await db.carts.find_one({"user_id": user["_id"]})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    items = []
    total = 0
    for item in cart["items"]:
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            items.append({**item, "product_name": product["name"], "price": product["price"], "image_url": product.get("image_url", "")})
            total += product["price"] * item["quantity"]
    order = {
        "id": str(uuid.uuid4()),
        "user_id": user["_id"],
        "user_email": user.get("email", ""),
        "items": items,
        "total": round(total, 2),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(order)
    await db.carts.update_one({"user_id": user["_id"]}, {"$set": {"items": []}})
    order.pop("_id", None)
    return order

@api_router.get("/orders")
async def get_orders(request: Request):
    user = await get_current_user(request)
    query = {"user_id": user["_id"]}
    if user.get("role") == "admin":
        query = {}  # Admin sees all orders
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, data: OrderStatusUpdate, request: Request):
    await require_admin(request)
    valid = ["pending", "processing", "delivered", "completed", "cancelled"]
    if data.status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid)}")
    result = await db.orders.update_one({"id": order_id}, {"$set": {"status": data.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    updated = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return updated


# ── Admin Stats ──
@api_router.get("/admin/stats")
async def admin_stats(request: Request):
    await require_admin(request)
    total_products = await db.products.count_documents({})
    total_orders = await db.orders.count_documents({})
    total_users = await db.users.count_documents({})
    total_categories = await db.categories.count_documents({})
    return {"total_products": total_products, "total_orders": total_orders, "total_users": total_users, "total_categories": total_categories}


# ── Root ──
@api_router.get("/")
async def root():
    return {"message": "Premium Sphere API"}


# ── App Setup ──
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Startup ──
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.products.create_index("category")
    await db.products.create_index("name")
    await seed_admin()
    await seed_data()

async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@premiumsphere.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "name": "Admin",
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Admin user seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Admin password updated")

async def seed_data():
    # Seed categories if empty
    cat_count = await db.categories.count_documents({})
    if cat_count == 0:
        categories = [
            {"id": "subscriptions", "name": "Subscriptions", "icon": "Tv", "description": "Netflix, Spotify, Prime & more"},
            {"id": "gaming", "name": "Gaming", "icon": "Gamepad2", "description": "Game keys, accounts & top-ups"},
            {"id": "software", "name": "Software", "icon": "Monitor", "description": "Windows, Office & productivity tools"},
            {"id": "gift-cards", "name": "Gift Cards", "icon": "Gift", "description": "Apple, Amazon, Steam & more"},
            {"id": "ai-tools", "name": "AI & Tools", "icon": "Cpu", "description": "ChatGPT, Claude, Cursor & more"},
            {"id": "top-up", "name": "Game Top-Up", "icon": "Zap", "description": "UC, Diamonds, Coins & credits"},
        ]
        await db.categories.insert_many(categories)
        logger.info("Categories seeded")

    # Seed products if empty
    prod_count = await db.products.count_documents({})
    if prod_count == 0:
        products = [
            {"id": str(uuid.uuid4()), "name": "Netflix Premium 1 Month", "description": "Stream unlimited movies & shows with Netflix Premium subscription.", "price": 4.99, "original_price": 11.99, "image_url": "https://images.unsplash.com/photo-1574375927938-d5a98e8d6f15?w=400&q=80", "category": "Subscriptions", "subcategory": "Streaming", "platform": "All Platforms", "badge": "HOT", "in_stock": True, "featured": True, "best_seller": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Spotify Premium 1 Month", "description": "Ad-free music streaming with offline downloads.", "price": 3.99, "original_price": 9.99, "image_url": "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=400&q=80", "category": "Subscriptions", "subcategory": "Music", "platform": "All Platforms", "badge": "", "in_stock": True, "featured": False, "best_seller": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Amazon Prime 1 Month", "description": "Prime Video, free shipping, and exclusive deals.", "price": 3.49, "original_price": 8.99, "image_url": "https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=400&q=80", "category": "Subscriptions", "subcategory": "Streaming", "platform": "All Platforms", "badge": "DEAL", "in_stock": True, "featured": True, "best_seller": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Windows 11 Pro Key", "description": "Genuine Windows 11 Pro activation key. Lifetime license.", "price": 12.99, "original_price": 45.00, "image_url": "https://images.unsplash.com/photo-1624571409412-1f253a335be2?w=400&q=80", "category": "Software", "subcategory": "OS", "platform": "Windows", "badge": "HOT", "in_stock": True, "featured": True, "best_seller": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Office 365 Pro Plus", "description": "Microsoft Office 365 subscription with Word, Excel, PowerPoint & more.", "price": 9.99, "original_price": 29.99, "image_url": "https://images.unsplash.com/photo-1633419461186-7d40a38105ec?w=400&q=80", "category": "Software", "subcategory": "Productivity", "platform": "Windows", "badge": "", "in_stock": True, "featured": False, "best_seller": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "ChatGPT Plus 1 Month", "description": "Access GPT-4, plugins, and advanced features.", "price": 15.99, "original_price": 24.99, "image_url": "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&q=80", "category": "AI & Tools", "subcategory": "AI", "platform": "Web", "badge": "NEW", "in_stock": True, "featured": True, "best_seller": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Claude AI Pro 1 Month", "description": "Anthropic Claude Pro with extended context and priority access.", "price": 18.99, "original_price": 25.00, "image_url": "https://images.unsplash.com/photo-1712002641088-9d76f9080889?w=400&q=80", "category": "AI & Tools", "subcategory": "AI", "platform": "Web", "badge": "", "in_stock": True, "featured": True, "best_seller": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Steam Gift Card $10", "description": "Add $10 to your Steam Wallet instantly.", "price": 11.50, "original_price": None, "image_url": "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400&q=80", "category": "Gift Cards", "subcategory": "Gaming", "platform": "Steam", "badge": "", "in_stock": True, "featured": False, "best_seller": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Steam Gift Card $50", "description": "Add $50 to your Steam Wallet.", "price": 52.00, "original_price": None, "image_url": "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400&q=80", "category": "Gift Cards", "subcategory": "Gaming", "platform": "Steam", "badge": "", "in_stock": True, "featured": False, "best_seller": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Apple Gift Card $25", "description": "Use for App Store, Apple Music, iCloud & more.", "price": 26.99, "original_price": None, "image_url": "https://images.unsplash.com/photo-1591337676887-a217a6c9cc0a?w=400&q=80", "category": "Gift Cards", "subcategory": "Apple", "platform": "Apple", "badge": "", "in_stock": True, "featured": False, "best_seller": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Google Play $10", "description": "Google Play store credit for apps, games & movies.", "price": 11.00, "original_price": None, "image_url": "https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=400&q=80", "category": "Gift Cards", "subcategory": "Google", "platform": "Google", "badge": "", "in_stock": True, "featured": False, "best_seller": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "GTA V - PC Steam Key", "description": "Grand Theft Auto V for PC. Steam activation key.", "price": 14.99, "original_price": 29.99, "image_url": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80", "category": "Gaming", "subcategory": "Action", "platform": "Steam", "badge": "HOT", "in_stock": True, "featured": True, "best_seller": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Minecraft Java & Bedrock", "description": "Minecraft Java and Bedrock Edition bundle.", "price": 19.99, "original_price": 49.99, "image_url": "https://images.unsplash.com/photo-1587573089734-599d584d68f4?w=400&q=80", "category": "Gaming", "subcategory": "Adventure", "platform": "PC", "badge": "DEAL", "in_stock": True, "featured": True, "best_seller": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "EA FC 26 - Steam Key", "description": "EA Sports FC 26 football game. Global Steam key.", "price": 29.99, "original_price": 69.99, "image_url": "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&q=80", "category": "Gaming", "subcategory": "Sports", "platform": "Steam", "badge": "NEW", "in_stock": True, "featured": False, "best_seller": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Random Steam Key - Standard", "description": "Get a random Steam game key. Could be any genre!", "price": 1.99, "original_price": 5.99, "image_url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80", "category": "Gaming", "subcategory": "Random", "platform": "Steam", "badge": "DEAL", "in_stock": True, "featured": False, "best_seller": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "PUBG Mobile UC Top-Up", "description": "Direct UC top-up for PUBG Mobile. All amounts available.", "price": 4.99, "original_price": None, "image_url": "https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=400&q=80", "category": "Game Top-Up", "subcategory": "Mobile", "platform": "Mobile", "badge": "", "in_stock": True, "featured": False, "best_seller": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Free Fire Diamonds", "description": "Top-up Free Fire diamonds instantly.", "price": 2.99, "original_price": None, "image_url": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&q=80", "category": "Game Top-Up", "subcategory": "Mobile", "platform": "Mobile", "badge": "", "in_stock": True, "featured": False, "best_seller": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Mobile Legends Diamonds", "description": "MLBB diamond top-up. Fast & reliable.", "price": 1.99, "original_price": None, "image_url": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&q=80", "category": "Game Top-Up", "subcategory": "Mobile", "platform": "Mobile", "badge": "", "in_stock": True, "featured": False, "best_seller": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Amazon Gift Card $25", "description": "Amazon.com gift card. Email delivery.", "price": 26.50, "original_price": None, "image_url": "https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=400&q=80", "category": "Gift Cards", "subcategory": "Shopping", "platform": "Amazon", "badge": "", "in_stock": True, "featured": False, "best_seller": False, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Cursor AI Pro 1 Month", "description": "AI-powered code editor with advanced features.", "price": 19.99, "original_price": None, "image_url": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&q=80", "category": "AI & Tools", "subcategory": "Dev Tools", "platform": "Web", "badge": "NEW", "in_stock": True, "featured": False, "best_seller": False, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.products.insert_many(products)
        logger.info(f"Seeded {len(products)} products")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
