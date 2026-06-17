export function EmptyState({ icon = "📦", title, description, action }) {
  return (
    <div className="text-center py-12 px-4">
      <span className="text-4xl block mb-4">{icon}</span>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
