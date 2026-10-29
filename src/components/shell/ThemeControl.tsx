import { ComputerDesktopIcon, MoonIcon, SunIcon } from '@heroicons/react/16/solid';
import { useTheme, type ThemePreference } from '../../theme/ThemeProvider';

const options: { value: ThemePreference; label: string; icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'system', label: 'System', icon: ComputerDesktopIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
];

export function ThemeControl() {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-950/5 p-1 dark:bg-white/5"
    >
      {options.map((option) => {
        const selected = preference === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
              selected
                ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
            }`}
            onClick={() => {
              setPreference(option.value);
            }}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
