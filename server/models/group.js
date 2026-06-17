const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
    storeName: {
        type: String,
        required: true
    },

    groupLeader: {
        type: String,
        required: true
    },

    leaderName: {
        type: String,
        default: ""
    },

    hostelName: {
        type: String,
        required: true
    },

    closingTime: {
        type: Date,
        required: true
    },

    deliveryFee: {
        type: Number,
        default: 40
    },
    deliveryThreshold: {
    type: Number,
    default: 199
},

handlingFee: {
    type: Number,
    default: 0
},

platformFee: {
    type: Number,
    default: 0
},

closeMode: {
    type: String,
    enum: ["TIME", "TARGET"],
    default: "TIME"
},

isClosed: {
    type: Boolean,
    default: false
},

closedAt: {
    type: Date,
    default: null
},

    status: {
        type: String,
        default: "ACTIVE"
    },

    paymentQR: {
        type: String,
        default: ""
    },

    leaderUpiId: {
        type: String,
        default: ""
    },

    members: [
    {
        name: String,

        email: String,

        paid: {
            type: Boolean,
            default: false
        },

        totalAmount: {
            type: Number,
            default: 0
        },

        paymentVerified: {
    type: Boolean,
    default: false
},

        cartItems: [
            {
                productName: String,

                productLink: String,

                quantity: Number,

                price: Number,

                itemTotal: Number
            }
        ]
    }
]
});

module.exports =
    mongoose.models.Group ||
    mongoose.model("Group", groupSchema);