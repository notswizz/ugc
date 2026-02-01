'use client';

import { useState } from 'react';
import { Mail, Users, ChevronDown, Search } from 'lucide-react';
import type { WaitlistEntry } from '@/lib/models/waitlist';

interface WaitlistTableProps {
  entries: WaitlistEntry[];
  onEntrySelect?: (entry: WaitlistEntry) => void;
}

export default function WaitlistTable({ entries, onEntrySelect }: WaitlistTableProps) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(true);

  const filteredEntries = entries.filter(entry => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        entry.email.toLowerCase().includes(searchLower) ||
        entry.name.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  const getExperienceLabel = (level?: string) => {
    switch (level) {
      case 'beginner': return 'Beginner';
      case 'intermediate': return 'Intermediate';
      case 'experienced': return 'Experienced';
      case 'professional': return 'Pro';
      default: return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-zinc-900">Waitlist</h3>
            <p className="text-xs text-zinc-500">
              {entries.length} creator{entries.length !== 1 ? 's' : ''} signed up
            </p>
          </div>
        </div>
        <div className={`w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-4 h-4 text-zinc-600" />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-100">
          {/* Search */}
          <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 focus:border-orange-500 outline-none"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-zinc-100">
            {filteredEntries.length === 0 ? (
              <div className="px-5 py-8 text-center text-zinc-400 text-sm">
                {entries.length === 0 ? 'No signups yet' : 'No matching entries'}
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => onEntrySelect?.(entry)}
                  className="px-5 py-3 flex items-center gap-4 hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Users className="w-4 h-4 text-orange-600" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900 truncate">{entry.name}</span>
                      {entry.experienceLevel && (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-zinc-100 text-zinc-600 rounded-full">
                          {getExperienceLabel(entry.experienceLevel)}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-zinc-500 truncate block">{entry.email}</span>
                  </div>

                  {/* Socials indicator */}
                  {entry.socials && Object.keys(entry.socials).length > 0 && (
                    <div className="flex -space-x-1">
                      {entry.socials.tiktok && (
                        <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-[10px] text-white ring-2 ring-white">T</div>
                      )}
                      {entry.socials.instagram && (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center text-[10px] text-white ring-2 ring-white">I</div>
                      )}
                      {entry.socials.youtube && (
                        <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-[10px] text-white ring-2 ring-white">Y</div>
                      )}
                      {entry.socials.x && (
                        <div className="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center text-[10px] text-white ring-2 ring-white">X</div>
                      )}
                    </div>
                  )}

                  {/* Date */}
                  <div className="text-xs text-zinc-400 whitespace-nowrap">
                    {formatDate(entry.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
