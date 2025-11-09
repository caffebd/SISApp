export default function HeroBanner() {
  return (
    <div className="relative w-full h-[600px] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1717497043712-e197abe15c28?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTAwNDR8MHwxfHNlYXJjaHw0fHxmaXJlcGxhY2UlMjBsaXZpbmclMjByb29tJTIwc3RvdmUlMjBpbnRlcmlvciUyMGNvenl8ZW58MHwwfHx8MTc2MjE4NDU1M3ww&ixlib=rb-4.1.0&q=85"
          alt="Cozy living room interior with a modern woodburning stove fireplace, warm ambient lighting, comfortable furniture, home setting - Photo by Vije Vijendranath on Unsplash"
          className="w-full h-full object-cover"
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Text Overlay */}
      <div className="relative h-full flex items-center justify-center">
        <h1 className="text-5xl md:text-7xl font-bold text-white text-center px-4 drop-shadow-2xl">
          Welcome To Stove Industry Supplies
        </h1>
      </div>
    </div>
  );
}