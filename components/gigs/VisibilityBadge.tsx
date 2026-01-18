import { GigVisibility } from '@/lib/models/types';

interface VisibilityBadgeProps {
  visibility: GigVisibility;
  className?: string;
}

export default function VisibilityBadge({ visibility, className = '' }: VisibilityBadgeProps) {
  const config = {
    open: {
      label: 'Open',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-300',
      icon: '🌐',
    },
    squad: {
      label: 'Squad',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-800',
      borderColor: 'border-purple-300',
      icon: '👥',
    },
    invite: {
      label: 'Invite',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-800',
      borderColor: 'border-orange-300',
      icon: '✉️',
    },
  };

  const style = config[visibility];

  // Return null if visibility is not valid
  if (!style || !visibility) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${style.bgColor} ${style.textColor} ${style.borderColor} ${className}`}
    >
      <span className="text-[10px]">{style.icon}</span>
      <span>{style.label}</span>
    </span>
  );
}
