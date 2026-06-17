# 🛒 HostelCart AI

**A hostel-focused group ordering platform that helps students reduce delivery charges from Blinkit, Zepto, Instamart, and similar quick-commerce apps.**

Students create or join hostel-based group orders, combine purchases, reach free-delivery thresholds, and share additional charges fairly — powered by AI recommendations and real-time collaboration.

---

## 📋 Problem Statement

Students in hostels frequently want to order low-value items (₹20–₹100) from quick-commerce platforms. However, delivery charges (₹25–₹50) and platform fees make small orders disproportionately expensive.

**Example:** A student ordering Maggi worth ₹14 would pay ₹40+ in delivery — nearly 3× the product cost.

**HostelCart solves this by:**
- Combining orders from multiple hostel residents into a single group order
- Reaching free-delivery thresholds (typically ₹199) collectively
- Splitting unavoidable fees fairly among verified members
- Using AI to recommend optimal groups and suggest items to bridge threshold gaps
- Giving the group leader full control over when to finalize and place the order

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Frontend (React)                       │
│  Dashboard │ Group Details │ Cart │ Leader Dashboard │ AI     │
├──────────────────────────────────────────────────────────────┤
│                    Socket.IO (Real-Time)                       │
├──────────────────────────────────────────────────────────────┤
│                      Backend (Express.js)                      │
│  Auth │ Groups │ Cart CRUD │ Payments │ Leader │ UPI          │
├──────────────────────────────────────────────────────────────┤
│                      MongoDB Atlas │ JWT                       │
└──────────────────────────────────────────────────────────────┘
```

**Monorepo Structure:**
```
HostelCart-AI/
├── client/                # React frontend (Vite + Tailwind CSS)
│   └── src/
│       ├── components/    # layout, shared, features/ai
│       ├── pages/         # 7 page components
│       ├── services/      # api, socket, aiService, groupRecommendationService
│       ├── contexts/      # AuthContext, GroupContext
│       ├── hooks/         # useAuth, useGroup, useSocket
│       └── utils/         # constants, formatters, validators
├── server/                # Express.js backend
│   ├── middleware/        # auth, leaderAuth, cartLock
│   ├── models/            # User, Group (Mongoose)
│   ├── helpers/           # cartHelpers, socketEvents, groupCleanup
│   └── server.js          # Main server file
└── ml-model/              # Future ML model directory
```

---

## ✨ Features

### Core Features
| Feature | Description |
|---------|-------------|
| **Group Creation** | Create delivery groups for any store with customizable thresholds, fees, and UPI payment details |
| **Leader-First Membership** | Leader auto-added as first member on creation; duplicate join prevention |
| **Cart CRUD** | Add, edit, remove items with real-time total recalculation |
| **Cart Locking** | Cart becomes immutable after leader verifies payment |
| **UPI Payment Flow** | Leader provides UPI ID; members see it before marking paid; copy + deeplink support |
| **Leader-Controlled Closure** | Groups NEVER auto-close. Leader decides when to finalize via threshold achievement modal |
| **Verified Payment Threshold** | Threshold is checked against verified payments only (not cart totals) |
| **Leader Auto-Verification** | When leader pays, they're automatically verified (no self-verification deadlock) |
| **Leader Authorization** | Only leaders can verify payments, close groups, update fees |
| **Final Shopping List** | Aggregated, deduplicated, case-insensitive product list for verified members |
| **Fee Splitting** | Delivery/handling/platform fees split equally among verified members |
| **Leader Identity** | Every group displays leader name for trust and visibility |
| **Dashboard Tabs** | Active Groups / My Groups / Closed groups with counts |
| **Auto-Cleanup** | TIME-mode groups close on schedule; closed groups deleted after 12 hours |

### 🤖 AI Features
| Feature | Description |
|---------|-------------|
| **Missing Item Suggestions** | Analyzes cart contents and suggests complementary items (Maggi → Sauce, Bowls) |
| **Threshold Completion** | Recommends items priced near the remaining delivery gap |
| **Smart Order Templates** | One-click templates: Movie Night, Study Session, Birthday Party, Hostel Essentials |
| **Savings Calculator** | Shows "Adding ₹X more saves ₹Y per member in delivery fees" |
| **Shopping Insights** | Most ordered items, top spender, average order value per group |
| **Group Recommendations** | AI-scored ranking: 40% threshold proximity, 30% hostel match, 20% activity, 10% size |
| **ETA Prediction** | Estimates group completion time: <10min, 10-30min, 30-60min, 1+ hour |
| **Confidence Scoring** | High/Good/Moderate/Weak match labels with explanations |

### 🔌 Socket.IO Real-Time Events
| Event | Trigger | Effect |
|-------|---------|--------|
| `member-joined` | User joins group | Dashboard/details refresh, toast notification |
| `cart-item-added` | Item added to cart | Progress bar updates across clients |
| `cart-item-updated` | Item edited | Totals refresh for all group members |
| `cart-item-removed` | Item removed | Totals recalculated live |
| `payment-submitted` | Member marks paid | Leader dashboard updates |
| `payment-verified` | Leader verifies | Member's cart locks, toast shown |
| `threshold-reached` | Verified total ≥ threshold | Leader sees checkout decision modal |
| `fees-updated` | Leader changes fees | All members see new fees instantly |
| `group-closed` | Leader closes group | All members notified, UI disables actions |
| `payment-details-updated` | Leader updates UPI ID | New UPI shown to all members |

---

## 💰 Payment Workflow

```
1. Leader creates group → provides UPI ID
2. Members add items to cart → cart total grows (GROUP STAYS OPEN)
3. Members transfer money to leader's UPI → click "I've Paid"
4. Leader sees payment in dashboard → clicks "Verify"
5. Each verification checks: verifiedTotal ≥ threshold?
6. YES → Leader sees "Threshold Achieved" modal
   - [Verify More Payments] → group stays open
   - [Close Group & Place Order] → group closes, shopping list generated
7. NO → Leader continues verifying, group stays open
```

**Key rule:** Groups NEVER close automatically from cart totals. Only **verified payment totals** trigger the threshold check, and even then, the **leader decides** when to close.

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js | Runtime |
| Express.js 5 | HTTP framework |
| MongoDB Atlas | Database |
| Mongoose | ODM |
| JWT | Authentication |
| bcrypt | Password hashing |
| Socket.IO | Real-time communication |
| CORS | Cross-origin support |

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 19 | UI framework |
| Vite 6 | Build tool & dev server |
| React Router 7 | Client-side routing |
| Axios | HTTP client |
| Tailwind CSS 4 | Utility-first styling |
| Socket.IO Client | Real-time updates |
| Vitest | Unit testing |
| fast-check | Property-based testing |

---

## 🚀 Installation

### Prerequisites
- Node.js 18+
- MongoDB Atlas account

### 1. Clone the repository
```bash
git clone https://github.com/your-username/HostelCart-AI.git
cd HostelCart-AI
```

### 2. Install root dependencies
```bash
npm install
```

### 3. Setup Backend
```bash
cd server
npm install
```

### 4. Setup Frontend
```bash
cd client
npm install
```

### 5. Configure environment variables (see below)

### 6. Start the application
```bash
# Terminal 1 — Backend
cd server
node server.js

# Terminal 2 — Frontend
cd client
npm run dev
```

Backend runs on `http://localhost:5000`
Frontend runs on `http://localhost:5173`

---

## 🔐 Environment Variables

### `server/.env`
```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/hostelcart
JWT_SECRET=your_jwt_secret_key_here
```

### `client/.env`
```env
VITE_API_URL=http://localhost:5000
```

> **Note:** No Cloudinary or external media storage required. Payment uses UPI ID (text field).

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/signup` | ❌ | Register new user |
| POST | `/login` | ❌ | Login, returns JWT |
| GET | `/profile` | ✅ | Get logged-in user |

### Groups
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/groups` | ✅ | Create group (JSON, requires `leaderUpiId`) |
| GET | `/groups` | ❌ | List all groups |
| POST | `/groups/:id/join` | ❌ | Join a group (blocked if closed) |
| GET | `/groups/:groupId/summary` | ❌ | Group progress summary |
| GET | `/groups/:groupId/final-summary` | ❌ | Final fee breakdown |

### Cart (requires auth + cartLock)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/groups/:groupId/cart` | ✅ | Legacy add item |
| POST | `/groups/:groupId/cart/add` | ✅ | Add item (validated) |
| PUT | `/groups/:groupId/cart/edit` | ✅ | Edit item by ID |
| DELETE | `/groups/:groupId/cart/remove` | ✅ | Remove item by ID |

### Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/groups/:groupId/pay` | ❌ | Mark self as paid (auto-verifies leader) |
| POST | `/groups/:groupId/verify-payment` | ✅👑 | Leader verifies member payment; returns `verifiedTotal` + `thresholdReached` |

### Leader Actions (auth + leaderAuth)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/groups/:groupId/close` | ✅👑 | Close group (leader decision only) |
| PUT | `/groups/:groupId/fees` | ✅👑 | Update delivery/handling/platform fees |
| PUT | `/groups/:groupId/payment-details` | ✅👑 | Update leader UPI ID |

### Shopping Lists
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/groups/:groupId/shopping-list` | ❌ | Paid members' items |
| GET | `/groups/:groupId/final-shopping-list` | ❌ | Verified members' aggregated list (requires closed group) |

---

## 🌐 Deployment

### Frontend → Vercel
```bash
cd client
npm run build
# Deploy dist/ to Vercel
```

### Backend → Render / Railway
```bash
cd server
# Set environment variables on platform
# Start command: node server.js
```

### Database → MongoDB Atlas
- Free M0 cluster
- Whitelist deployment IP or use 0.0.0.0/0

> **No external media storage needed.** Payment information uses UPI ID text field stored directly in MongoDB.

---

## 📱 Pages

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Email + password authentication |
| Signup | `/signup` | Name, email, password, hostel, room |
| Dashboard | `/dashboard` | Tabbed view (Active/My/Closed), metrics, AI recommendations |
| Create Group | `/groups/create` | Store, hostel, threshold, fees, UPI ID |
| Group Details | `/groups/:id` | Members, progress, fees, UPI payment, AI insights |
| Cart | `/groups/:id/cart` | Add/edit/remove items, AI suggestions, templates |
| Leader Dashboard | `/groups/:id/leader` | Verify payments, update fees/UPI, close group, threshold modal |

---

## 🔮 Future Scope

| Feature | Status |
|---------|--------|
| 3-State Lifecycle (OPEN/READY/CLOSED) | Design complete |
| Google OAuth Login | Planned |
| Email OTP Verification | Planned |
| Push Notifications | Planned |
| Mobile App (React Native) | Planned |
| Gemini/OpenAI Integration | Architecture ready |
| Leader Reputation System | Schema ready |
| Order History & Analytics | Planned |
| Multi-language Support | Planned |
| Smart Price Comparison | Planned |

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

ISC

---

**Built with ❤️ for hostel residents who refuse to pay ₹40 delivery on a ₹14 Maggi.**
