import Link from 'next/link';

interface SettingsMenuItemProps {
  name: string;
  href: string;
  icon: React.ReactNode;
  isActive?: boolean;
}

export default function SettingsMenuItem({ name, href, icon, isActive = false }: SettingsMenuItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 px-6 py-4 transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
          : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
      }`}
    >
      <div className={`w-6 h-6 ${isActive ? 'text-blue-700' : 'text-gray-500'}`}>
        {icon}
      </div>
      <span className="font-medium text-base">{name}</span>
    </Link>
  );
}