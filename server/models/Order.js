const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    hostel: {
        type: String,
        required: true
    },

    currentAmount: {
        type: Number,
        required: true
    },

    targetAmount: {
        type: Number,
        required: true
    }
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;