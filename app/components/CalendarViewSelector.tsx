type ViewMode = 'day' | 'week' | 'month';

interface CalendarViewSelectorProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export default function CalendarViewSelector({ currentView, onViewChange }: CalendarViewSelectorProps) {
  const views: { mode: ViewMode; label: string }[] = [
    { mode: 'day', label: 'Day' },
    { mode: 'week', label: 'Week' },
    { mode: 'month', label: 'Month' },
  ];

  return (
    <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
      {views.map(({ mode, label }) => (
        <button
          key={mode}
          onClick={() => onViewChange(mode)}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
            currentView === mode
              ? 'bg-gray-800 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}