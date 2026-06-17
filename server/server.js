require("dotenv").config();
const auth = require("./middleware/auth");
const leaderAuth = require("./middleware/leaderAuth");
const cartLock = require("./middleware/cartLock");
const { recalculateMemberTotal, validateCartInput, checkTimeBasedClosure } = require("./helpers/cartHelpers");
const socketEvents = require("./helpers/socketEvents");
const { startCleanupScheduler } = require("./helpers/groupCleanup");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
console.log("LOADED UPDATED FILE");
const mongoose = require("mongoose");
const User = require("./models/User");
const Group = require("./models/group");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Socket.IO connection handling
socketEvents.setIO(io);

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  // Join a group room
  socket.on("join-group", (groupId) => {
    socket.join(groupId);
    console.log(`Socket ${socket.id} joined room: ${groupId}`);
  });

  // Leave a group room
  socket.on("leave-group", (groupId) => {
    socket.leave(groupId);
    console.log(`Socket ${socket.id} left room: ${groupId}`);
  });

  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
  });
});

const PORT = 5000;

app.get("/", (req, res) => {
    res.send("HostelCart AI Backend Running 🚀");
});

app.get("/about", (req, res) => {
    res.send("About Route Working");
});

app.get("/health", (req, res) => {
    res.send("Health Route Working");
});
app.get("/apoorva", (req, res) => {
  res.send("HOSTELCART SERVER IS WORKING");
});

app.get("/orders", (req, res) => {
    const orders = [
        {
            id: 1,
            hostel: "Brahmaputra",
            currentAmount: 150,
            targetAmount: 299
        },
        {
            id: 2,
            hostel: "Subarnarekha",
            currentAmount: 220,
            targetAmount: 299
        }
    ];

    res.json(orders);
});

app.get("/users", async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
console.log("SIGNUP ROUTE REGISTERED");
app.post("/signup", async (req, res) => {

    try {

        const existingUser =
            await User.findOne({
                email: req.body.email
            });

        if (existingUser) {

            return res.status(400).json({
                message: "Email already registered"
            });

        }

        const hashedPassword =
            await bcrypt.hash(
                req.body.password,
                10
            );

        const user =
            await User.create({

                name: req.body.name,

                email: req.body.email,

                password: hashedPassword,

                hostelName: req.body.hostelName,

                roomNumber: req.body.roomNumber

            });

        res.status(201).json({
            message: "User created successfully"
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});
app.post("/login", async (req, res) => {

    try {

        const user =
            await User.findOne({
                email: req.body.email
            });

        if (!user) {

            return res.status(400).json({
                message: "User not found"
            });

        }

        const isMatch =
            await bcrypt.compare(
                req.body.password,
                user.password
            );

        if (!isMatch) {

            return res.status(400).json({
                message: "Invalid password"
            });

        }

        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            message: "Login successful",
            token
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});
app.post("/groups", [auth], async (req, res) => {
    try {
        // Validate UPI ID
        if (!req.body.leaderUpiId || req.body.leaderUpiId.trim().length < 3) {
            return res.status(400).json({
                message: "Valid UPI ID is required (e.g. user@paytm)"
            });
        }

        // Create group with leader as first member
        const groupData = {
            storeName: req.body.storeName,
            groupLeader: req.user.email,
            leaderName: req.body.leaderName || req.user.email.split("@")[0],
            hostelName: req.body.hostelName,
            closingTime: req.body.closingTime,
            deliveryThreshold: Number(req.body.deliveryThreshold) || 199,
            deliveryFee: Number(req.body.deliveryFee) || 40,
            handlingFee: Number(req.body.handlingFee) || 0,
            platformFee: Number(req.body.platformFee) || 0,
            closeMode: req.body.closeMode || "TIME",
            leaderUpiId: req.body.leaderUpiId.trim(),
            members: [
                {
                    name: req.body.leaderName || req.user.email.split("@")[0],
                    email: req.user.email,
                    paid: false,
                    paymentVerified: false,
                    totalAmount: 0,
                    cartItems: [],
                }
            ],
        };

        const group = await Group.create(groupData);

        res.status(201).json({
            message: "Group created successfully",
            group
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.get("/groups", async (req, res) => {
    try {
        const groups = await Group.find();

        res.json(groups);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.post("/groups/:id/join", async (req, res) => {
    try {

        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({
                message: "Group not found"
            });
        }

        if (group.isClosed) {
            return res.status(400).json({
                message: "Group is closed"
            });
        }

        // Prevent duplicate membership
        const alreadyMember = group.members.some(
            m => m.email.toLowerCase() === req.body.email.toLowerCase()
        );
        if (alreadyMember) {
            return res.status(400).json({
                message: "Already a member"
            });
        }

        group.members.push({
            name: req.body.name,
            email: req.body.email
        });

        await group.save();

        // Emit real-time event
        socketEvents.emitMemberJoined(req.params.id, {
            name: req.body.name,
            email: req.body.email,
        });

        res.json({
            message: "Joined group successfully",
            group
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.post("/groups/:groupId/cart", [auth, cartLock], async (req, res) => {
    try {
        const group = req.group;
        const member = req.member;

        const itemTotal =
            req.body.quantity * req.body.price;

        member.cartItems.push({
            productName: req.body.productName,
            productLink: req.body.productLink,
            quantity: req.body.quantity,
            price: req.body.price,
            itemTotal
        });

        member.totalAmount += itemTotal;

        await group.save();

        socketEvents.emitCartItemAdded(req.params.groupId, { memberEmail: member.email, productName: req.body.productName });

        res.json({
            message: "Item added successfully",
            member
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.post("/groups/:groupId/cart/add", [auth, cartLock], async (req, res) => {
    try {
        const group = req.group;
        const member = req.member;
        const { productName, productLink, quantity, price } = req.body;

        // Validation using shared helper
        const validationError = validateCartInput(req.body, {
            requireProductName: true,
            requireQuantity: true,
            requirePrice: true
        });
        if (validationError) {
            return res.status(400).json(validationError);
        }

        // Calculate item total
        const itemTotal = quantity * price;

        // Push item to member's cart
        member.cartItems.push({
            productName: productName.trim(),
            productLink: productLink || "",
            quantity,
            price,
            itemTotal
        });

        // Recalculate totalAmount from all cart items (ensures consistency)
        recalculateMemberTotal(member);

        await group.save();

        socketEvents.emitCartItemAdded(req.params.groupId, { memberEmail: member.email, productName: productName.trim() });

        res.json({
            message: "Item added successfully",
            member
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.put("/groups/:groupId/cart/edit", [auth, cartLock], async (req, res) => {
    try {
        const group = req.group;
        const member = req.member;
        const { itemId, productName, productLink, quantity, price } = req.body;

        // itemId is required to identify the item
        if (!itemId) {
            return res.status(400).json({
                message: "itemId is required"
            });
        }

        // Validate quantity/price if provided
        const validationError = validateCartInput(req.body, {
            requireProductName: false,
            requireQuantity: false,
            requirePrice: false
        });
        if (validationError) {
            return res.status(400).json(validationError);
        }

        // Find item by its _id in the member's cart
        const item = member.cartItems.id(itemId);

        if (!item) {
            return res.status(404).json({
                message: "Item not found in cart"
            });
        }

        // Apply updates for provided fields only
        if (productName !== undefined) item.productName = productName.trim();
        if (productLink !== undefined) item.productLink = productLink;
        if (quantity !== undefined) item.quantity = quantity;
        if (price !== undefined) item.price = price;

        // Recalculate item total
        item.itemTotal = item.quantity * item.price;

        // Recalculate member total from all items
        recalculateMemberTotal(member);

        await group.save();

        socketEvents.emitCartItemUpdated(req.params.groupId, { memberEmail: member.email, itemId });

        res.json({
            message: "Item updated successfully",
            member
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.delete("/groups/:groupId/cart/remove", [auth, cartLock], async (req, res) => {
    try {
        const group = req.group;
        const member = req.member;
        const { itemId } = req.body;

        // itemId is required to identify the item
        if (!itemId) {
            return res.status(400).json({
                message: "itemId is required"
            });
        }

        // Find item by its _id in the member's cart
        const item = member.cartItems.id(itemId);

        if (!item) {
            return res.status(404).json({
                message: "Item not found in cart"
            });
        }

        // Remove the item using Mongoose pull
        member.cartItems.pull(itemId);

        // Recalculate member total from remaining items
        recalculateMemberTotal(member);

        await group.save();

        socketEvents.emitCartItemRemoved(req.params.groupId, { memberEmail: member.email, itemId });

        res.json({
            message: "Item removed successfully",
            member
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.get("/groups/:groupId/summary", async (req, res) => {
    try {

        const group = await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({
                message: "Group not found"
            });
        }

        let groupTotal = 0;

        group.members.forEach(member => {
            groupTotal += member.totalAmount;
        });

        const remaining =
            Math.max(
                0,
                group.deliveryThreshold - groupTotal
            );

        const freeDeliveryAchieved =
            groupTotal >= group.deliveryThreshold;

        res.json({
            storeName: group.storeName,
            closeMode: group.closeMode,
            groupTotal,
            deliveryThreshold: group.deliveryThreshold,
            remainingForFreeDelivery: remaining,
            freeDeliveryAchieved,
            isClosed: group.isClosed
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.get("/groups/:groupId/final-summary", async (req, res) => {
    try {

        const group = await Group.findById(req.params.groupId);
        if (!group.isClosed) {
    return res.json({
        message: "Group still open",
        groupTotal,
        remainingForFreeDelivery:
            Math.max(
                0,
                group.deliveryThreshold - groupTotal
            )
    });
}

        if (!group) {
            return res.status(404).json({
                message: "Group not found"
            });
        }

        let groupTotal = 0;

        group.members.forEach(member => {
            groupTotal += member.totalAmount;
        });

        const freeDeliveryAchieved =
            groupTotal >= group.deliveryThreshold;

        let totalCharges = 0;

        if (!freeDeliveryAchieved) {
            totalCharges += group.deliveryFee;
        }

        totalCharges += group.handlingFee;
        totalCharges += group.platformFee;

        const sharePerPerson =
            group.members.length > 0
                ? totalCharges / group.members.length
                : 0;

        const memberBreakdown =
            group.members.map(member => ({
                name: member.name,
                email: member.email,
                cartTotal: member.totalAmount,
                chargeShare: sharePerPerson,
                finalPayable:
                    member.totalAmount + sharePerPerson,
                paid: member.paid
            }));

        res.json({
            groupTotal,
            freeDeliveryAchieved,
            totalCharges,
            sharePerPerson,
            memberBreakdown
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.post("/groups/:groupId/pay", async (req, res) => {
    try {

        const group = await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({
                message: "Group not found"
            });
        }

        const payerEmail = (req.body.email || "").trim().toLowerCase();

        console.log("💰 PAY REQUEST", {
            target: req.body.email,
            normalized: payerEmail,
            groupLeader: group.groupLeader,
            memberEmails: group.members.map(m => m.email)
        });

        const member =
            group.members.find(
                m => m.email.toLowerCase() === payerEmail
            );

        if (!member) {
            return res.status(404).json({
                message: "Member not found"
            });
        }

        member.paid = true;

        // Auto-verify if the payer is the group leader
        const isLeader = payerEmail === group.groupLeader.trim().toLowerCase();

        console.log("💰 IS LEADER?", { isLeader, payerEmail, groupLeader: group.groupLeader.trim().toLowerCase() });

        if (isLeader) {
            member.paymentVerified = true;
        }

        console.log("💰 MEMBER BEFORE SAVE:", { paid: member.paid, paymentVerified: member.paymentVerified });

        await group.save();

        // Verify save worked
        const savedGroup = await Group.findById(req.params.groupId);
        const savedMember = savedGroup.members.find(m => m.email.toLowerCase() === payerEmail);
        console.log("💰 MEMBER AFTER SAVE:", { paid: savedMember.paid, paymentVerified: savedMember.paymentVerified });

        // Emit payment-submitted event
        socketEvents.emitPaymentSubmitted(req.params.groupId, { email: req.body.email });

        // If leader, also emit payment-verified (auto-verification)
        if (isLeader) {
            socketEvents.emitPaymentVerified(req.params.groupId, { email: req.body.email });
        }

        res.json({
            message: isLeader
                ? "Payment marked and auto-verified (leader)"
                : "Payment marked successfully",
            autoVerified: isLeader
        });

    } catch (error) {
        console.error("❌ PAY ERROR:", error.message);
        res.status(500).json({
            message: error.message
        });
    }
});
app.get("/groups/:groupId/shopping-list", async (req, res) => {
    try {

        const group = await Group.findById(req.params.groupId);

        const items = {};

        group.members.forEach(member => {

            if (!member.paid) return;

            member.cartItems.forEach(item => {

                if (!items[item.productName]) {
                    items[item.productName] = 0;
                }

                items[item.productName] += item.quantity;

            });

        });

        res.json(items);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.post("/groups/:groupId/close", [auth, leaderAuth], async (req, res) => {

    try {

        const group = req.group; // Already fetched by leaderAuth middleware

        if (group.isClosed) {
            return res.status(400).json({
                message: "Group is already closed"
            });
        }

        group.isClosed = true;
        group.closedAt = new Date();

        await group.save();

        socketEvents.emitGroupClosed(req.params.groupId, { closedBy: "leader" });

        res.json({
            message: "Group closed successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }

});
app.post("/groups/:groupId/verify-payment", [auth, leaderAuth], async (req, res) => {

    try {

        const group = req.group; // Already fetched by leaderAuth middleware

        if (!req.body.email) {
            return res.status(400).json({
                message: "Member email is required"
            });
        }

        // Prevent leader from verifying own payment
        if (req.body.email.toLowerCase() === req.user.email.toLowerCase()) {
            return res.status(400).json({
                message: "Leader cannot verify their own payment"
            });
        }

        const member =
            group.members.find(
                m => m.email === req.body.email
            );

        if (!member) {
            return res.status(404).json({
                message: "Member not found"
            });
        }

        member.paymentVerified = true;
        member.paid = true;

        await group.save();

        // Calculate verified total for threshold check
        const verifiedTotal = group.members
            .filter(m => m.paymentVerified === true)
            .reduce((sum, m) => sum + m.totalAmount, 0);

        const thresholdReached = verifiedTotal >= group.deliveryThreshold;
        const pendingMembers = group.members.filter(m => !m.paymentVerified);

        socketEvents.emitPaymentVerified(req.params.groupId, { email: req.body.email });

        // If threshold reached, emit event for leader modal
        if (thresholdReached) {
            socketEvents.emitToGroup(req.params.groupId, "threshold-reached", {
                verifiedTotal,
                threshold: group.deliveryThreshold,
                pendingCount: pendingMembers.length,
                pendingAmount: pendingMembers.reduce((s, m) => s + m.totalAmount, 0),
            });
        }

        res.json({
            message: "Payment verified",
            verifiedTotal,
            thresholdReached,
            pendingCount: pendingMembers.length,
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});
app.put("/groups/:groupId/fees", [auth, leaderAuth], async (req, res) => {

    try {

        const group = req.group; // Already fetched by leaderAuth middleware
        const { deliveryFee, handlingFee, platformFee } = req.body;

        // Validate at least one fee field is present
        if (deliveryFee === undefined && handlingFee === undefined && platformFee === undefined) {
            return res.status(400).json({
                message: "At least one fee field is required (deliveryFee, handlingFee, platformFee)"
            });
        }

        // Validate each provided fee value
        const fields = { deliveryFee, handlingFee, platformFee };
        for (const [field, value] of Object.entries(fields)) {
            if (value !== undefined) {
                if (typeof value !== "number" || value < 0 || value > 99999) {
                    return res.status(400).json({
                        message: `Invalid value for ${field}: must be a number between 0 and 99999`
                    });
                }
            }
        }

        // Apply updates only for provided fields
        if (deliveryFee !== undefined) group.deliveryFee = deliveryFee;
        if (handlingFee !== undefined) group.handlingFee = handlingFee;
        if (platformFee !== undefined) group.platformFee = platformFee;

        await group.save();

        socketEvents.emitFeesUpdated(req.params.groupId, {
            deliveryFee: group.deliveryFee,
            handlingFee: group.handlingFee,
            platformFee: group.platformFee,
        });

        res.json({
            message: "Fees updated successfully",
            group
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }

});
app.put("/groups/:groupId/payment-details", [auth, leaderAuth], async (req, res) => {
    try {
        const group = req.group;

        if (!req.body.leaderUpiId || req.body.leaderUpiId.trim().length < 3) {
            return res.status(400).json({
                message: "Valid UPI ID is required"
            });
        }

        group.leaderUpiId = req.body.leaderUpiId.trim();
        await group.save();

        socketEvents.emitToGroup(req.params.groupId, "payment-details-updated", {
            leaderUpiId: group.leaderUpiId,
        });

        res.json({
            message: "Payment details updated successfully",
            leaderUpiId: group.leaderUpiId,
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.get("/groups/:groupId/final-shopping-list", async (req, res) => {

    try {

        // 1. Validate ObjectId format before querying DB
        if (!mongoose.Types.ObjectId.isValid(req.params.groupId)) {
            return res.status(400).json({
                message: "Invalid group identifier"
            });
        }

        // 2. Fetch group
        const group =
            await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({
                message: "Group not found"
            });
        }

        // 3. Group must be closed before generating final shopping list
        if (!group.isClosed) {
            return res.status(400).json({
                message: "Group must be closed before generating final shopping list"
            });
        }

        // 4. Single pass aggregation: collect products and compute totals
        const productMap = new Map();
        let verifiedMembers = 0;
        let groupTotal = 0;

        group.members.forEach(member => {

            // Only include payment-verified members
            if (!member.paymentVerified) return;

            verifiedMembers++;
            groupTotal += member.totalAmount;

            member.cartItems.forEach(item => {

                // Normalize: trim whitespace, lowercase for deduplication key
                const key = item.productName.trim().toLowerCase();

                if (productMap.has(key)) {
                    productMap.get(key).totalQuantity += item.quantity;
                } else {
                    // Store first-seen display name (trimmed)
                    productMap.set(key, {
                        productName: item.productName.trim(),
                        totalQuantity: item.quantity
                    });
                }

            });

        });

        // 5. Convert to array and sort alphabetically (case-insensitive)
        const shoppingList = Array.from(productMap.values()).sort(
            (a, b) => a.productName.toLowerCase().localeCompare(b.productName.toLowerCase())
        );

        res.json({
            shoppingList,
            verifiedMembers,
            groupTotal
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});
app.get("/profile", auth, async (req, res) => {

    try {

        const user =
            await User.findById(
                req.user.userId
            );

        res.json(user);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    startCleanupScheduler();
  })
  .catch((error) => {
    console.log("❌ MongoDB Error:", error);
  });

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});