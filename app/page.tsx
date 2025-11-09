import HeroBanner from './components/HeroBanner';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen">
      <HeroBanner />
      
      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Your Trusted Partner in Woodburning Stoves
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Welcome to <strong>Stove Industry Supplies</strong>, a family-run business dedicated to delivering 
            top-quality products in the Woodburning Stove Industry at competitive prices.
          </p>
        </div>

        {/* CTA Section */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mt-12">
          <Link 
            href="/booking"
            className="px-10 py-4 bg-gradient-to-br from-sky-700 to-blue-900 text-white font-bold text-lg rounded-2xl transition-all hover:shadow-xl hover:scale-105"
          >
            Book an Engineer Visit
          </Link>
          <Link 
            href="https://stoveindustrysupplies.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-10 py-4 bg-white border-2 border-gray-300 text-gray-900 font-bold text-lg rounded-2xl transition-all hover:shadow-xl hover:border-gray-400"
          >
            Browse Our Products
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-gradient-to-br from-sky-700 to-blue-900 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Fast Delivery</h3>
            <p className="text-gray-600">
              Quick and reliable delivery service to get your stove parts when you need them.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-gradient-to-br from-sky-700 to-blue-900 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Expert Advice</h3>
            <p className="text-gray-600">
              Our team of Hetas registered engineers provide professional guidance and support.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-gradient-to-br from-sky-700 to-blue-900 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Quality Products</h3>
            <p className="text-gray-600">
              Premium replacement parts manufactured in our Blackpool warehouse using finest materials.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}