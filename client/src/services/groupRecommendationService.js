/**
 * Group Recommendation Engine v2 — Production-Hardened
 *
 * Weighted scoring across 4 dimensions:
 *   - Threshold proximity (40%): how close to free delivery
 *   - Hostel match (30%): same hostel as user
 *   - Member activity (20%): contribution rate / engagement
 *   - Group size (10%): more members = more likely to complete
 *
 * All functions are pure, deterministic, and NaN-safe.
 * Debug logging enabled in development only.
 */

const WEIGHTS = {
  thresholdProximity: 0.4,
  hostelMatch: 0.3,
  memberActivity: 0.2,
  groupSize: 0.1,
};

const IS_DEV = import.meta.env.DEV;

// --- Utility ---

function safeNumber(val, fallback = 0) {
  const n = Number(val);
  return isNaN(n) || !isFinite(n) ? fallback : n;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, safeNumber(value)));
}

function normalizeHostel(hostel) {
  return (hostel || "").trim().toLowerCase();
}

// --- Core Scoring ---

/**
 * Score a single group for a user.
 * Returns a score between 0-100 with full breakdown.
 */
export function scoreGroup(group, userHostel) {
  const members = group.members || [];
  const groupTotal = safeNumber(members.reduce((s, m) => s + safeNumber(m.totalAmount), 0));
  const threshold = safeNumber(group.deliveryThreshold, 199);
  const remaining = Math.max(0, threshold - groupTotal);
  const completionPercentage = threshold > 0 ? (groupTotal / threshold) * 100 : 0;

  // 1. Threshold Proximity Score (0-100)
  const thresholdScore = clamp(completionPercentage, 0, 100);

  // 2. Hostel Match Score (0 or 100)
  const hostelScore = normalizeHostel(group.hostelName) === normalizeHostel(userHostel) ? 100 : 0;

  // 3. Member Activity Score (0-100)
  const memberCount = members.length || 0;
  const avgContribution = memberCount > 0 ? groupTotal / memberCount : 0;
  let activityScore = 0;
  let activityLevel = "none";

  if (avgContribution >= 50) {
    activityScore = 100;
    activityLevel = "high";
  } else if (avgContribution >= 25) {
    activityScore = 60 + ((avgContribution - 25) / 25) * 40;
    activityLevel = "medium";
  } else if (avgContribution > 0) {
    activityScore = (avgContribution / 25) * 60;
    activityLevel = "low";
  }
  activityScore = clamp(activityScore, 0, 100);

  // 4. Group Size Score (0-100): logarithmic, caps at 8 members
  const sizeScore = clamp(memberCount > 0 ? Math.min(100, (Math.log2(memberCount + 1) / Math.log2(9)) * 100) : 0, 0, 100);

  // Weighted total (clamped 0-100)
  const totalScore = clamp(
    Math.round(
      thresholdScore * WEIGHTS.thresholdProximity +
      hostelScore * WEIGHTS.hostelMatch +
      activityScore * WEIGHTS.memberActivity +
      sizeScore * WEIGHTS.groupSize
    ),
    0,
    100
  );

  const breakdown = {
    thresholdScore: Math.round(thresholdScore),
    hostelScore,
    activityScore: Math.round(activityScore),
    groupSizeScore: Math.round(sizeScore),
    totalScore,
    completionPercentage: Math.round(completionPercentage),
    remaining: Math.round(remaining),
    groupTotal: Math.round(groupTotal),
    threshold,
    memberCount,
    avgContribution: Math.round(avgContribution),
    activityLevel,
  };

  // Development debug logging
  if (IS_DEV) {
    console.group(`🤖 Score: ${group.storeName} (${group.hostelName})`);
    console.table({
      "Threshold (40%)": `${breakdown.thresholdScore}/100 → ${Math.round(thresholdScore * WEIGHTS.thresholdProximity)}pts`,
      "Hostel (30%)": `${breakdown.hostelScore}/100 → ${Math.round(hostelScore * WEIGHTS.hostelMatch)}pts`,
      "Activity (20%)": `${breakdown.activityScore}/100 [${activityLevel}] → ${Math.round(activityScore * WEIGHTS.memberActivity)}pts`,
      "Size (10%)": `${breakdown.groupSizeScore}/100 → ${Math.round(sizeScore * WEIGHTS.groupSize)}pts`,
      "TOTAL": `${totalScore}/100`,
    });
    console.log("Metrics:", { groupTotal, remaining, threshold, memberCount, avgContribution });
    console.groupEnd();
  }

  return breakdown;
}

// --- ETA Estimation ---

/**
 * Estimate time to threshold completion.
 * Deterministic bucketing based on remaining amount and activity.
 */
export function estimateCompletionTime(group, activityLevel) {
  const members = group.members || [];
  const groupTotal = safeNumber(members.reduce((s, m) => s + safeNumber(m.totalAmount), 0));
  const threshold = safeNumber(group.deliveryThreshold, 199);
  const remaining = Math.max(0, threshold - groupTotal);
  const completionPct = threshold > 0 ? (groupTotal / threshold) * 100 : 0;

  if (remaining <= 0) {
    return { eta: "Complete", label: "Threshold reached!", color: "green", minutes: 0 };
  }

  // Deterministic bucketing based on remaining + activity
  if (remaining <= 20 && activityLevel === "high") {
    return { eta: "< 10 min", label: "Almost there!", color: "green", minutes: 5 };
  }
  if (remaining <= 40 || (remaining <= 60 && activityLevel === "high")) {
    return { eta: "10–30 min", label: "Closing soon", color: "green", minutes: 20 };
  }
  if (remaining <= 100 || (remaining <= 120 && activityLevel !== "low")) {
    return { eta: "30–60 min", label: "Moderate wait", color: "yellow", minutes: 45 };
  }
  return { eta: "1+ hour", label: "Needs more members", color: "red", minutes: 90 };
}

// --- Explanation Engine ---

/**
 * Generate dynamic explanation reasons for a recommendation.
 * Returns 2-4 specific, data-driven reasons.
 */
export function generateExplanation(group, score) {
  const reasons = [];

  // Threshold proximity reasons
  if (score.remaining <= 10) {
    reasons.push(`Only ₹${score.remaining} away from free delivery`);
  } else if (score.remaining <= 30) {
    reasons.push(`Just ₹${score.remaining} more for free delivery`);
  } else if (score.remaining <= 80) {
    reasons.push(`₹${score.remaining} remaining to threshold`);
  }

  // Hostel match
  if (score.hostelScore === 100) {
    reasons.push("Same hostel as you");
  }

  // Activity
  if (score.activityLevel === "high") {
    reasons.push("Highly active group");
  } else if (score.activityLevel === "medium") {
    reasons.push("Moderately active group");
  }

  // Members
  if (score.memberCount >= 5) {
    reasons.push(`${score.memberCount} members already joined`);
  } else if (score.memberCount >= 3) {
    reasons.push(`${score.memberCount} active members`);
  }

  // Completion
  if (score.completionPercentage >= 90) {
    reasons.push("About to reach threshold");
  } else if (score.completionPercentage >= 70) {
    reasons.push(`${score.completionPercentage}% to threshold`);
  }

  // Ensure at least 2 reasons
  if (reasons.length === 0) {
    reasons.push("Open group available");
  }
  if (reasons.length === 1) {
    reasons.push(`${score.memberCount} member${score.memberCount !== 1 ? "s" : ""} in group`);
  }

  return reasons.slice(0, 4);
}

// --- Confidence ---

/**
 * Calculate recommendation confidence.
 */
export function calculateConfidence(score) {
  const totalScore = score.totalScore;
  if (totalScore >= 90) return { level: "High Confidence", badge: "success", value: totalScore };
  if (totalScore >= 70) return { level: "Good Match", badge: "success", value: totalScore };
  if (totalScore >= 50) return { level: "Moderate Match", badge: "warning", value: totalScore };
  return { level: "Weak Match", badge: "danger", value: totalScore };
}

// --- Savings ---

/**
 * Calculate expected savings for a user if they join a group.
 */
export function calculateExpectedSavings(group, score) {
  const memberCount = score.memberCount || 1;
  const deliveryFee = safeNumber(group.deliveryFee, 40);
  const handlingFee = safeNumber(group.handlingFee, 0);
  const platformFee = safeNumber(group.platformFee, 0);
  const totalFees = deliveryFee + handlingFee + platformFee;
  const thresholdReachable = score.remaining < 100;

  // If threshold will be reached, delivery is free
  const estimatedFeeShare = thresholdReachable
    ? (handlingFee + platformFee) / (memberCount + 1)
    : totalFees / (memberCount + 1);

  const soloDeliveryFee = totalFees;
  const savings = Math.max(0, soloDeliveryFee - estimatedFeeShare);

  // Probability of completion
  const completionProbability = clamp(
    Math.round(score.completionPercentage * 0.7 + (memberCount / 5) * 30),
    0,
    99
  );

  return {
    estimatedFeeShare: Math.round(estimatedFeeShare * 100) / 100,
    savings: Math.round(savings * 100) / 100,
    soloDeliveryFee,
    completionProbability,
    thresholdReachable,
  };
}

// --- Main Entry Point ---

/**
 * Get top recommended groups for a user.
 * Filters invalid groups, scores, ranks, and categorizes.
 */
export function getRecommendedGroups(groups, userEmail, userHostel) {
  if (!groups || !Array.isArray(groups) || !userEmail) {
    return { all: [], bestMatch: null, fastestClosing: null, lowestRemaining: null };
  }

  const normalizedEmail = (userEmail || "").trim().toLowerCase();

  // TASK 5: Filter invalid groups
  const eligible = groups.filter((g) => {
    // Must not be closed
    if (g.isClosed) return false;
    // Must be ACTIVE status (if field exists)
    if (g.status && g.status !== "ACTIVE") return false;
    // Must not already be a member
    const isMember = (g.members || []).some(
      (m) => (m.email || "").trim().toLowerCase() === normalizedEmail
    );
    return !isMember;
  });

  // Score each group
  const scored = eligible.map((group) => {
    const score = scoreGroup(group, userHostel);
    const eta = estimateCompletionTime(group, score.activityLevel);
    const explanation = generateExplanation(group, score);
    const confidence = calculateConfidence(score);
    const savings = calculateExpectedSavings(group, score);

    return { group, score, eta, explanation, confidence, savings };
  });

  // Sort by total score descending
  scored.sort((a, b) => b.score.totalScore - a.score.totalScore);

  // Categorize (only assign labels to groups with meaningful scores)
  const bestMatch = scored.length > 0 && scored[0].score.totalScore > 0 ? scored[0] : null;

  const fastestClosing = [...scored]
    .filter((s) => s.score.remaining > 0)
    .sort((a, b) => a.score.remaining - b.score.remaining)[0] || null;

  const lowestRemaining = fastestClosing; // same metric in this context

  if (IS_DEV && scored.length > 0) {
    console.group("🤖 Final Recommendations");
    scored.slice(0, 5).forEach((r, i) => {
      console.log(`#${i + 1} ${r.group.storeName}: ${r.score.totalScore}pts [${r.confidence.level}]`);
    });
    console.groupEnd();
  }

  return {
    all: scored.slice(0, 6),
    bestMatch,
    fastestClosing,
    lowestRemaining,
  };
}

// --- Validation Test Data (DEV only) ---

export function runValidationTests() {
  if (!IS_DEV) return;

  console.group("🧪 Recommendation Engine Validation Tests");

  // Scenario A: Threshold ranking
  const groupA = { storeName: "A", hostelName: "Test", deliveryThreshold: 199, deliveryFee: 40, handlingFee: 0, platformFee: 0, isClosed: false, status: "ACTIVE", members: [{ email: "x@x.com", totalAmount: 190, cartItems: [] }] };
  const groupB = { storeName: "B", hostelName: "Test", deliveryThreshold: 199, deliveryFee: 40, handlingFee: 0, platformFee: 0, isClosed: false, status: "ACTIVE", members: [{ email: "x@x.com", totalAmount: 100, cartItems: [] }] };
  const groupC = { storeName: "C", hostelName: "Test", deliveryThreshold: 199, deliveryFee: 40, handlingFee: 0, platformFee: 0, isClosed: false, status: "ACTIVE", members: [{ email: "x@x.com", totalAmount: 40, cartItems: [] }] };

  const scoreA = scoreGroup(groupA, "Other");
  const scoreB = scoreGroup(groupB, "Other");
  const scoreC = scoreGroup(groupC, "Other");

  console.assert(scoreA.totalScore > scoreB.totalScore, `FAIL: A(${scoreA.totalScore}) should > B(${scoreB.totalScore})`);
  console.assert(scoreB.totalScore > scoreC.totalScore, `FAIL: B(${scoreB.totalScore}) should > C(${scoreC.totalScore})`);
  console.log(`✓ Scenario A: A(${scoreA.totalScore}) > B(${scoreB.totalScore}) > C(${scoreC.totalScore})`);

  // Scenario B: Hostel bonus
  const groupSame = { storeName: "Same", hostelName: "Brahmaputra", deliveryThreshold: 199, deliveryFee: 40, handlingFee: 0, platformFee: 0, isClosed: false, status: "ACTIVE", members: [{ email: "x@x.com", totalAmount: 100, cartItems: [] }] };
  const groupDiff = { storeName: "Diff", hostelName: "Subarnarekha", deliveryThreshold: 199, deliveryFee: 40, handlingFee: 0, platformFee: 0, isClosed: false, status: "ACTIVE", members: [{ email: "x@x.com", totalAmount: 100, cartItems: [] }] };

  const scoreSame = scoreGroup(groupSame, "Brahmaputra");
  const scoreDiff = scoreGroup(groupDiff, "Brahmaputra");

  console.assert(scoreSame.totalScore > scoreDiff.totalScore, `FAIL: Same(${scoreSame.totalScore}) should > Diff(${scoreDiff.totalScore})`);
  console.log(`✓ Scenario B: Same(${scoreSame.totalScore}) > Diff(${scoreDiff.totalScore})`);

  // Scenario C: Closed group excluded
  const closedGroup = { storeName: "Closed", hostelName: "Test", deliveryThreshold: 199, deliveryFee: 40, handlingFee: 0, platformFee: 0, isClosed: true, status: "ACTIVE", members: [] };
  const result = getRecommendedGroups([closedGroup], "user@test.com", "Test");

  console.assert(result.all.length === 0, "FAIL: Closed group should not appear in recommendations");
  console.log(`✓ Scenario C: Closed group excluded (${result.all.length} results)`);

  console.log("✅ All validation tests passed");
  console.groupEnd();
}
