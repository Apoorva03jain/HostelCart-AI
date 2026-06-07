const auth = require("./middleware/auth");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
console.log("LOADED UPDATED FILE");
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Group = require("./models/Group");
const express = require("express");

const app = express();
app.use(express.json());

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
app.post("/groups", async (req, res) => {
    try {
        const group = await Group.create(req.body);

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

        group.members.push({
            name: req.body.name,
            email: req.body.email
        });

        await group.save();

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
app.post("/groups/:groupId/cart", async (req, res) => {
    try {

        const group = await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({
                message: "Group not found"
            });
        }

        const member = group.members.find(
            member => member.email === req.body.email
        );

        if (!member) {
            return res.status(404).json({
                message: "Member not found"
            });
        }
       if (member.paymentVerified) {

    return res.status(400).json({
        message:
            "Cart locked after payment verification"
    });

}


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

        if (
            group.closeMode === "TARGET" &&
            freeDeliveryAchieved &&
            !group.isClosed
        ) {
            group.isClosed = true;
            await group.save();
        }

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

        const member =
            group.members.find(
                m => m.email === req.body.email
            );

        if (!member) {
            return res.status(404).json({
                message: "Member not found"
            });
        }

        member.paid = true;

        await group.save();

        res.json({
            message: "Payment marked successfully"
        });

    } catch (error) {
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
app.post("/groups/:groupId/close", async (req, res) => {

    try {

        const group =
            await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({
                message: "Group not found"
            });
        }

        group.isClosed = true;

        await group.save();

        res.json({
            message: "Group closed successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }

});
app.post("/groups/:groupId/verify-payment", async (req, res) => {

    try {

        const group =
            await Group.findById(req.params.groupId);

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

        res.json({
            message: "Payment verified"
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});
app.get("/groups/:groupId/final-shopping-list", async (req, res) => {

    try {

        const group =
            await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({
                message: "Group not found"
            });
        }

        const shoppingList = {};

        group.members.forEach(member => {

            if (!member.paymentVerified)
                return;

            member.cartItems.forEach(item => {

                if (!shoppingList[item.productName]) {

                    shoppingList[item.productName] =
                        item.quantity;

                } else {

                    shoppingList[item.productName] +=
                        item.quantity;

                }

            });

        });

        res.json(shoppingList);

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
  })
  .catch((error) => {
    console.log("❌ MongoDB Error:", error);
  });

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});