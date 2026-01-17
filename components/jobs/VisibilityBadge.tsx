import { JobVisibility } from '@/lib/models/types';

interface VisibilityBadgeProps {
  visibility: JobVisibility;
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

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${style.bgColor} ${style.textColor} ${style.borderColor} ${className}`}
    >
      <span>{style.icon}</span>
      <span>{style.label}</span>
    </span>
  );
}
