import { useRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import VisibilityBadge from '@/components/gigs/VisibilityBadge';
import { THINGS } from '@/lib/things/constants';
import SquadSelector from './SquadSelector';
import type { GigFormData } from '@/lib/gigs/create-gig-schema';

interface BasicDetailsStepProps {
  gigData: GigFormData;
  updateGigData: (updates: Partial<GigFormData>) => void;
}

export default function BasicDetailsStep({ gigData, updateGigData }: BasicDetailsStepProps) {
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Filter categories based on search
  const filteredCategories = THINGS.filter(thing =>
    thing.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Gig Title *</label>
        <Input
          placeholder="e.g., Authentic Coffee Shop Review"
          value={gigData.title}
          onChange={(e) => updateGigData({ title: e.target.value })}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Platform *</label>
        <div className="grid grid-cols-3 gap-3">
          {/* TikTok */}
          <button
            type="button"
            onClick={() => updateGigData({ platform: 'tiktok', contentType: 'video' })}
            className={`p-4 rounded-lg border-2 text-center transition-[border-color,background-color,box-shadow] duration-200 ${
              gigData.platform === 'tiktok'
                ? 'bg-orange-50 border-orange-500 shadow-sm'
                : 'bg-white border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <svg className="w-8 h-8 mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
            </svg>
            <div className="text-sm font-semibold">TikTok</div>
          </button>

          {/* Instagram */}
          <button
            type="button"
            onClick={() => updateGigData({ platform: 'instagram' })}
            className={`p-4 rounded-lg border-2 text-center transition-[border-color,background-color,box-shadow] duration-200 ${
              gigData.platform === 'instagram'
                ? 'bg-orange-50 border-orange-500 shadow-sm'
                : 'bg-white border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <svg className="w-8 h-8 mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
            </svg>
            <div className="text-sm font-semibold">Instagram</div>
          </button>

          {/* X (Twitter) */}
          <button
            type="button"
            onClick={() => updateGigData({ platform: 'x' })}
            className={`p-4 rounded-lg border-2 text-center transition-[border-color,background-color,box-shadow] duration-200 ${
              gigData.platform === 'x'
                ? 'bg-orange-50 border-orange-500 shadow-sm'
                : 'bg-white border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <svg className="w-8 h-8 mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <div className="text-sm font-semibold">X</div>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Content Type *</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateGigData({ contentType: 'video' })}
            className={`p-6 rounded-lg border-2 text-center transition-[border-color,background-color,box-shadow] duration-200 ${
              gigData.contentType === 'video'
                ? 'bg-blue-50 border-blue-500 shadow-sm'
                : 'bg-white border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div className="text-4xl mb-2">🎥</div>
            <div className="text-base font-semibold">Video</div>
          </button>
          <button
            type="button"
            onClick={() => updateGigData({ contentType: 'photo' })}
            disabled={gigData.platform === 'tiktok'}
            className={`p-6 rounded-lg border-2 text-center transition-[border-color,background-color,box-shadow,opacity] duration-200 ${
              gigData.platform === 'tiktok'
                ? 'bg-zinc-100 border-zinc-300 opacity-50 cursor-not-allowed'
                : gigData.contentType === 'photo'
                ? 'bg-purple-50 border-purple-500 shadow-sm'
                : 'bg-white border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div className="text-4xl mb-2">📷</div>
            <div className="text-base font-semibold">Photo</div>
            {gigData.platform === 'tiktok' && (
              <div className="text-xs text-zinc-500 mt-1">TikTok is video only</div>
            )}
          </button>
        </div>
      </div>

      {/* Instagram Format Selection */}
      {gigData.platform === 'instagram' && (
        <div>
          <label className="block text-sm font-medium mb-2">Instagram Format *</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => updateGigData({ instagramFormat: 'post' })}
              className={`p-4 rounded-lg border-2 text-center transition-[border-color,background-color,box-shadow] duration-200 ${
                gigData.instagramFormat === 'post'
                  ? 'bg-pink-50 border-pink-500 shadow-sm'
                  : 'bg-white border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="text-2xl mb-1">📱</div>
              <div className="text-sm font-semibold">Post</div>
            </button>
            <button
              type="button"
              onClick={() => updateGigData({ instagramFormat: 'story' })}
              className={`p-4 rounded-lg border-2 text-center transition-[border-color,background-color,box-shadow] duration-200 ${
                gigData.instagramFormat === 'story'
                  ? 'bg-pink-50 border-pink-500 shadow-sm'
                  : 'bg-white border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="text-2xl mb-1">⭕</div>
              <div className="text-sm font-semibold">Story</div>
            </button>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Primary Thing/Category *</label>
        <div className="relative" ref={categoryDropdownRef}>
          <Input
            placeholder="Search categories (e.g., Food, Beauty, Tech)..."
            value={categorySearch}
            onChange={(e) => {
              setCategorySearch(e.target.value);
              setShowCategoryDropdown(true);
            }}
            onFocus={() => setShowCategoryDropdown(true)}
            className="pr-10"
          />
          {gigData.primaryThing && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <span>{THINGS.find(t => t.id === gigData.primaryThing)?.icon}</span>
              <button
                type="button"
                onClick={() => {
                  updateGigData({ primaryThing: '' });
                  setCategorySearch('');
                }}
                className="text-zinc-400 hover:text-zinc-600 transition-colors duration-200"
                aria-label="Clear category"
              >
                ✕
              </button>
            </div>
          )}

          {/* Dropdown */}
          {showCategoryDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredCategories.length > 0 ? (
                filteredCategories.map(thing => (
                  <button
                    key={thing.id}
                    type="button"
                    onClick={() => {
                      updateGigData({ primaryThing: thing.id });
                      setCategorySearch(thing.name);
                      setShowCategoryDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-2 border-b last:border-b-0 ${
                      gigData.primaryThing === thing.id ? 'bg-green-50' : ''
                    }`}
                  >
                    <span className="text-xl">{thing.icon}</span>
                    <span className="font-medium">{thing.name}</span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-gray-500 text-sm">
                  No categories found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected category display */}
        {gigData.primaryThing && (
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <span>{THINGS.find(t => t.id === gigData.primaryThing)?.icon}</span>
            <span>{THINGS.find(t => t.id === gigData.primaryThing)?.name}</span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Gig Description</label>
        <textarea
          className="w-full p-3 border rounded-md min-h-[100px]"
          placeholder="Describe what you want the creator to do..."
          value={gigData.description}
          onChange={(e) => updateGigData({ description: e.target.value })}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Product Description (for AI Evaluation)</label>
        <textarea
          className="w-full p-3 border rounded-md min-h-[80px]"
          placeholder="Describe exactly what the product is (e.g., 'Nike Air Max running shoes in blue and white', 'iPhone 15 Pro Max 256GB'). This helps AI accurately evaluate if the product is shown in the video."
          value={gigData.productDescription}
          onChange={(e) => updateGigData({ productDescription: e.target.value })}
        />
        <p className="text-xs text-gray-500 mt-1">Be specific - include product name, model, colors, size, or other distinguishing features.</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Visibility</label>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => updateGigData({ visibility: 'open' })}
            className={`w-full p-3 rounded-lg border text-left ${
              gigData.visibility === 'open'
                ? 'bg-green-50 border-green-300'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <VisibilityBadge visibility="open" />
              <span className="text-sm">Any creator who meets requirements</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => updateGigData({ visibility: 'squad' })}
            className={`w-full p-3 rounded-lg border text-left ${
              gigData.visibility === 'squad'
                ? 'bg-purple-50 border-purple-300'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <VisibilityBadge visibility="squad" />
              <span className="text-sm">Only creators in eligible squads</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => updateGigData({ visibility: 'invite' })}
            className={`w-full p-3 rounded-lg border text-left ${
              gigData.visibility === 'invite'
                ? 'bg-orange-50 border-orange-300'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <VisibilityBadge visibility="invite" />
              <span className="text-sm">Only invited creators</span>
            </div>
          </button>
        </div>

        {/* Squad Selection (when visibility is 'squad') */}
        {gigData.visibility === 'squad' && (
          <SquadSelector
            selectedSquadIds={gigData.squadIds || []}
            onSelectionChange={(squadIds) => updateGigData({ squadIds })}
          />
        )}
      </div>
    </div>
  );
}
