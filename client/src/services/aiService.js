/**
 * AI Service Layer - Rule-based Shopping Intelligence
 *
 * Architecture: Pure functions that take group/cart data and return recommendations.
 * No paid APIs. Designed so each function can be swapped with a Gemini/OpenAI call
 * in the future by changing only this file.
 *
 * Future integration point:
 *   Replace rule-based logic with: await api.post("/ai/suggest", { cartItems, context })
 */

// --- Knowledge Base ---

const COMPLEMENTARY_ITEMS = {
  maggi: [
    { productName: "Maggi Masala Sauce", price: 35 },
    { productName: "Disposable Bowls (10pc)", price: 25 },
    { productName: "Paper Cups (10pc)", price: 20 },
  ],
  chips: [
    { productName: "Soft Drink (250ml)", price: 20 },
    { productName: "Dip Sauce", price: 40 },
    { productName: "Paper Napkins", price: 15 },
  ],
  "soft drink": [
    { productName: "Chips", price: 30 },
    { productName: "Paper Cups (10pc)", price: 20 },
    { productName: "Ice Tray", price: 45 },
  ],
  bread: [
    { productName: "Butter", price: 55 },
    { productName: "Jam", price: 65 },
    { productName: "Cheese Slice (5pc)", price: 45 },
  ],
  milk: [
    { productName: "Cornflakes", price: 80 },
    { productName: "Sugar Sachet (10pc)", price: 15 },
    { productName: "Tea Bags (10pc)", price: 30 },
  ],
  noodles: [
    { productName: "Soy Sauce", price: 40 },
    { productName: "Chopsticks (Pair)", price: 10 },
    { productName: "Disposable Bowls (10pc)", price: 25 },
  ],
  biscuit: [
    { productName: "Tea Bags (10pc)", price: 30 },
    { productName: "Milk (500ml)", price: 28 },
  ],
  tea: [
    { productName: "Biscuits", price: 30 },
    { productName: "Sugar Sachet (10pc)", price: 15 },
    { productName: "Milk (500ml)", price: 28 },
  ],
  coffee: [
    { productName: "Sugar Sachet (10pc)", price: 15 },
    { productName: "Milk (500ml)", price: 28 },
    { productName: "Biscuits", price: 30 },
  ],
  toothpaste: [
    { productName: "Toothbrush", price: 35 },
    { productName: "Mouthwash (100ml)", price: 55 },
  ],
  shampoo: [
    { productName: "Conditioner", price: 70 },
    { productName: "Comb", price: 20 },
  ],
  soap: [
    { productName: "Towel (Small)", price: 80 },
    { productName: "Body Lotion (50ml)", price: 45 },
  ],
};

const FILLER_ITEMS = [
  { productName: "Chocolate Bar", price: 10 },
  { productName: "Chewing Gum", price: 10 },
  { productName: "Candy Pack", price: 15 },
  { productName: "Biscuit Pack", price: 20 },
  { productName: "Juice Box", price: 25 },
  { productName: "Chips (Small)", price: 20 },
  { productName: "Water Bottle", price: 20 },
  { productName: "Bread", price: 40 },
  { productName: "Butter (Small)", price: 30 },
  { productName: "Banana (4pc)", price: 30 },
  { productName: "Apple (1pc)", price: 35 },
  { productName: "Milk (500ml)", price: 28 },
  { productName: "Curd (200ml)", price: 25 },
  { productName: "Eggs (6pc)", price: 42 },
  { productName: "Peanuts (50g)", price: 15 },
  { productName: "Muesli Bar", price: 35 },
  { productName: "Tissue Pack", price: 30 },
  { productName: "Paper Napkins", price: 15 },
  { productName: "Hand Sanitizer", price: 35 },
  { productName: "Pen", price: 10 },
];

const ORDER_TEMPLATES = {
  "Movie Night": {
    icon: "🎬",
    description: "Snacks and drinks for a movie marathon",
    items: [
      { productName: "Popcorn", price: 40, quantity: 2 },
      { productName: "Chips", price: 30, quantity: 2 },
      { productName: "Soft Drink (500ml)", price: 40, quantity: 3 },
      { productName: "Chocolate Bar", price: 50, quantity: 2 },
      { productName: "Juice Box", price: 25, quantity: 2 },
    ],
  },
  "Study Session": {
    icon: "📚",
    description: "Fuel for late-night study groups",
    items: [
      { productName: "Coffee Sachet", price: 10, quantity: 4 },
      { productName: "Biscuits", price: 30, quantity: 2 },
      { productName: "Energy Bar", price: 35, quantity: 3 },
      { productName: "Water Bottle", price: 20, quantity: 4 },
      { productName: "Chips (Small)", price: 20, quantity: 2 },
    ],
  },
  "Birthday Party": {
    icon: "🎂",
    description: "Essentials for a hostel birthday celebration",
    items: [
      { productName: "Cake (500g)", price: 250, quantity: 1 },
      { productName: "Candles", price: 20, quantity: 1 },
      { productName: "Soft Drink (1L)", price: 65, quantity: 2 },
      { productName: "Paper Plates (10pc)", price: 25, quantity: 1 },
      { productName: "Paper Cups (10pc)", price: 20, quantity: 1 },
      { productName: "Chips", price: 30, quantity: 3 },
    ],
  },
  "Hostel Essentials": {
    icon: "🏠",
    description: "Daily necessities every hostel resident needs",
    items: [
      { productName: "Toothpaste", price: 50, quantity: 1 },
      { productName: "Soap", price: 35, quantity: 1 },
      { productName: "Shampoo Sachet", price: 5, quantity: 4 },
      { productName: "Tissue Pack", price: 30, quantity: 1 },
      { productName: "Hand Sanitizer", price: 35, quantity: 1 },
      { productName: "Detergent (Small)", price: 40, quantity: 1 },
    ],
  },
};

// --- Core Functions ---

/**
 * Suggest complementary items based on current cart contents.
 * Returns items NOT already in the cart.
 */
export function suggestMissingItems(cartItems = []) {
  const cartNames = new Set(
    cartItems.map((item) => item.productName.trim().toLowerCase())
  );

  const suggestions = new Map();

  cartItems.forEach((item) => {
    const key = item.productName.trim().toLowerCase();

    // Check each keyword in our knowledge base
    Object.entries(COMPLEMENTARY_ITEMS).forEach(([keyword, items]) => {
      if (key.includes(keyword)) {
        items.forEach((suggestion) => {
          const sugKey = suggestion.productName.toLowerCase();
          if (!cartNames.has(sugKey) && !suggestions.has(sugKey)) {
            suggestions.set(sugKey, {
              ...suggestion,
              reason: `Goes well with ${item.productName}`,
            });
          }
        });
      }
    });
  });

  return Array.from(suggestions.values()).slice(0, 5);
}

/**
 * Recommend items to bridge the gap to delivery threshold.
 * Returns items whose prices are close to the remaining amount.
 */
export function suggestThresholdItems(remaining, cartItems = []) {
  if (remaining <= 0) return [];

  const cartNames = new Set(
    cartItems.map((item) => item.productName.trim().toLowerCase())
  );

  // Filter items not already in cart, within a useful price range
  const candidates = FILLER_ITEMS.filter(
    (item) => !cartNames.has(item.productName.toLowerCase())
  );

  // Score items by how close they are to the remaining amount
  const scored = candidates.map((item) => ({
    ...item,
    gap: Math.abs(item.price - remaining),
    fits: item.price <= remaining + 20, // allow slight overshoot
  }));

  // Prefer items that fit within remaining, then sort by gap
  return scored
    .filter((item) => item.fits)
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 5)
    .map(({ gap, fits, ...item }) => item);
}

/**
 * Get all order templates with calculated totals.
 */
export function getOrderTemplates() {
  return Object.entries(ORDER_TEMPLATES).map(([name, template]) => {
    const total = template.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    return {
      name,
      icon: template.icon,
      description: template.description,
      items: template.items,
      total,
    };
  });
}

/**
 * Calculate savings opportunity based on threshold gap.
 * Returns a message if adding a small amount can save delivery fees.
 */
export function calculateSavingsOpportunity(group, summary) {
  if (!group || !summary) return null;
  if (summary.freeDeliveryAchieved) return null;

  const remaining = summary.remainingForFreeDelivery;
  const memberCount = group.members.length || 1;
  const deliveryFee = group.deliveryFee || 0;
  const savingsPerPerson = deliveryFee / memberCount;

  if (remaining <= 0 || remaining > 100) return null; // Only show for close gaps

  return {
    remaining,
    savingsPerPerson: Math.round(savingsPerPerson * 100) / 100,
    message: `Adding ${formatPrice(remaining)} more saves ${formatPrice(savingsPerPerson)} per member in delivery fees!`,
    urgency: remaining <= 30 ? "high" : remaining <= 60 ? "medium" : "low",
  };
}

/**
 * Generate shopping insights from group data.
 */
export function generateShoppingInsights(group) {
  if (!group || !group.members || group.members.length === 0) return null;

  const allItems = [];
  let highestSpender = { name: "—", total: 0 };

  group.members.forEach((member) => {
    if (member.totalAmount > highestSpender.total) {
      highestSpender = { name: member.name, total: member.totalAmount };
    }
    member.cartItems.forEach((item) => {
      allItems.push(item);
    });
  });

  // Product frequency
  const productCounts = {};
  allItems.forEach((item) => {
    const key = item.productName.trim().toLowerCase();
    if (!productCounts[key]) {
      productCounts[key] = { name: item.productName, count: 0, totalQty: 0 };
    }
    productCounts[key].count++;
    productCounts[key].totalQty += item.quantity;
  });

  const mostOrdered = Object.values(productCounts)
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, 5);

  const groupTotal = group.members.reduce((s, m) => s + m.totalAmount, 0);
  const avgOrderValue = group.members.length > 0 ? groupTotal / group.members.length : 0;

  return {
    totalProducts: allItems.length,
    totalQuantity: allItems.reduce((s, i) => s + i.quantity, 0),
    mostOrdered,
    highestSpender,
    groupTotal,
    avgOrderValue: Math.round(avgOrderValue * 100) / 100,
  };
}

// Helper
function formatPrice(amount) {
  return `₹${Number(amount).toFixed(0)}`;
}
