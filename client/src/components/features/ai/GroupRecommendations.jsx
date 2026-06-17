import { useMemo, useEffect } from "react";
import { Card } from "../../shared/Card";
import { Button } from "../../shared/Button";
import { Badge } from "../../shared/Badge";
import { ProgressBar } from "../../shared/ProgressBar";
import { getRecommendedGroups, runValidationTests } from "../../../services/groupRecommendationService";
import { formatCurrency } from "../../../utils/formatters";

const IS_DEV = import.meta.env.DEV;

export function GroupRecommendations({ groups, userEmail, userHostel, onJoin, joinLoading }) {
  const recommendations = useMemo(
    () => getRecommendedGroups(groups, userEmail, userHostel),
    [groups, userEmail, userHostel]
  );

  // Run validation tests in dev mode on mount
  useEffect(() => {
    if (IS_DEV) {
      runValidationTests();
    }
  }, []);

  if (recommendations.all.length === 0) {
    return (
      <Card title="🤖 Recommended Groups for You">
        <div className="text-center py-8">
          <span className="text-3xl block mb-3">🎯</span>
          <h3 className="text-sm font-medium text-gray-900 mb-1">No recommendations available</h3>
          <p className="text-xs text-gray-500 mb-4">
            You have already joined all active groups or no suitable groups currently exist.
          </p>
          <a href="/groups/create" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            + Create a Group
          </a>
        </div>
      </Card>
    );
  }

  return (
    <Card title="🤖 Recommended Groups for You">
      <p className="text-xs text-gray-500 mb-4">
        AI-powered recommendations based on your hostel, threshold progress, and group activity
      </p>

      {/* Top Picks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.all.slice(0, 3).map((rec, idx) => (
          <RecommendationCard
            key={rec.group._id}
            rec={rec}
            rank={idx + 1}
            label={
              idx === 0 && rec.score.totalScore > 0 ? "Best Match" :
              idx === 1 && rec.score.totalScore > 0 ? "Runner Up" :
              idx === 2 && rec.score.totalScore > 0 ? "Also Good" : null
            }
            onJoin={onJoin}
            joinLoading={joinLoading}
          />
        ))}
      </div>

      {/* More recommendations */}
      {recommendations.all.length > 3 && (
        <details className="mt-4">
          <summary className="text-sm text-indigo-600 cursor-pointer hover:text-indigo-800 font-medium">
            Show {recommendations.all.length - 3} more
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
            {recommendations.all.slice(3).map((rec, idx) => (
              <RecommendationCard
                key={rec.group._id}
                rec={rec}
                rank={idx + 4}
                onJoin={onJoin}
                joinLoading={joinLoading}
              />
            ))}
          </div>
        </details>
      )}

      {/* Dev Debug Panel */}
      {IS_DEV && (
        <details className="mt-4 border-t border-dashed border-gray-200 pt-3">
          <summary className="text-xs text-gray-400 cursor-pointer">🛠 Debug: Score Breakdown</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left">Group</th>
                  <th className="px-2 py-1">Total</th>
                  <th className="px-2 py-1">Threshold(40%)</th>
                  <th className="px-2 py-1">Hostel(30%)</th>
                  <th className="px-2 py-1">Activity(20%)</th>
                  <th className="px-2 py-1">Size(10%)</th>
                  <th className="px-2 py-1">ETA</th>
                  <th className="px-2 py-1">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.all.map((rec) => (
                  <tr key={rec.group._id} className="border-t">
                    <td className="px-2 py-1 font-medium">{rec.group.storeName}</td>
                    <td className="px-2 py-1 text-center font-bold">{rec.score.totalScore}</td>
                    <td className="px-2 py-1 text-center">{rec.score.thresholdScore}</td>
                    <td className="px-2 py-1 text-center">{rec.score.hostelScore}</td>
                    <td className="px-2 py-1 text-center">{rec.score.activityScore} [{rec.score.activityLevel}]</td>
                    <td className="px-2 py-1 text-center">{rec.score.groupSizeScore}</td>
                    <td className="px-2 py-1 text-center">{rec.eta.eta}</td>
                    <td className="px-2 py-1 text-center">{rec.confidence.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </Card>
  );
}

function RecommendationCard({ rec, rank, label, onJoin, joinLoading }) {
  const { group, score, eta, explanation, confidence, savings } = rec;
  const etaColors = { green: "success", yellow: "warning", red: "danger" };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs font-bold text-gray-400">#{rank}</span>
          <div className="min-w-0">
            <h4 className="font-semibold text-gray-900 truncate">{group.storeName}</h4>
            <p className="text-xs text-gray-500">{group.hostelName}</p>
            <p className="text-xs text-indigo-500">👑 {group.leaderName || group.groupLeader.split("@")[0]}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant={confidence.badge}>{score.totalScore}pts</Badge>
          {label && <span className="text-xs text-indigo-600 font-medium">{label}</span>}
        </div>
      </div>

      {/* Confidence */}
      <div className="mb-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          confidence.badge === "success" ? "bg-green-100 text-green-700" :
          confidence.badge === "warning" ? "bg-yellow-100 text-yellow-700" :
          "bg-red-100 text-red-700"
        }`}>
          {confidence.level}
        </span>
      </div>

      {/* Progress */}
      <div className="my-2">
        <ProgressBar
          value={score.groupTotal}
          max={score.threshold}
          label={`${formatCurrency(score.groupTotal)} / ${formatCurrency(score.threshold)}`}
        />
        <p className="text-xs text-gray-500 mt-1">
          {score.remaining > 0 ? `₹${score.remaining} remaining` : "Threshold reached!"}
        </p>
      </div>

      {/* ETA + Activity */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Badge variant={etaColors[eta.color]}>{eta.eta}</Badge>
        <span className="text-xs text-gray-400">{eta.label}</span>
        {score.activityLevel !== "none" && (
          <Badge variant={score.activityLevel === "high" ? "success" : score.activityLevel === "medium" ? "warning" : "info"}>
            {score.activityLevel} activity
          </Badge>
        )}
      </div>

      {/* Explanation */}
      <div className="mb-3 space-y-1">
        {explanation.map((reason, idx) => (
          <p key={idx} className="text-xs text-gray-600 flex items-center gap-1">
            <span className="text-green-500">✓</span> {reason}
          </p>
        ))}
      </div>

      {/* Savings */}
      {savings.savings > 0 && (
        <div className="bg-green-50 rounded px-3 py-2 mb-3">
          <p className="text-xs text-green-700 font-medium">
            💸 Save ~{formatCurrency(savings.savings)} vs solo
          </p>
          <p className="text-xs text-green-600">
            {savings.completionProbability}% completion probability
          </p>
        </div>
      )}

      {/* Action */}
      <div className="mt-auto">
        <Button
          size="sm"
          className="w-full"
          onClick={() => onJoin(group._id)}
          loading={joinLoading === group._id}
        >
          Join Group
        </Button>
      </div>
    </div>
  );
}
