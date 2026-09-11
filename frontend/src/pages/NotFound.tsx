import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="font-display font-bold text-2xl text-charcoal mb-2">Page not found</h2>
      <p className="text-sm text-gray-500 mb-6">The page you're looking for doesn't exist or you don't have access to it.</p>
      <Link to="/" className="bg-gold hover:bg-gold-dark text-charcoal font-semibold rounded-lg px-5 py-2.5 text-sm">
        Back to Dashboard
      </Link>
    </div>
  );
}
