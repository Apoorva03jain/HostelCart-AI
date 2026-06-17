export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
      <div className="container mx-auto px-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} HostelCart — Save on delivery, order together.
      </div>
    </footer>
  );
}
