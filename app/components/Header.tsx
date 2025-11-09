import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image 
              src="/logo.png" 
              alt="Stove Industry Supplies Logo" 
              width={128} 
              height={128}
              className="h-12 w-auto"
            />
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-8">
            <Link 
              href="/" 
              className="text-gray-700 hover:text-gray-900 font-semibold text-lg transition-colors"
            >
              HOME
            </Link>
            <Link 
              href="/booking" 
              className="text-gray-700 hover:text-gray-900 font-semibold text-lg transition-colors"
            >
              BOOKING
            </Link>
            <Link 
              href="/admin" 
              className="text-gray-700 hover:text-gray-900 font-semibold text-lg transition-colors"
            >
              ADMIN
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}