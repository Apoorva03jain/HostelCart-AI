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

    status: {
        type: String,
        default: "ACTIVE"
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

module.exports = mongoose.model("Group", groupSchema);