import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { THINGS } from '@/lib/things/constants';
import type { CreatorFilters } from '@/lib/scout/filters';

interface FilterPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  filters: CreatorFilters;
  onFiltersChange: (filters: Partial<CreatorFilters>) => void;
  uniqueLocations: string[];
  allInterests: string[];
}

export default function FilterPanel({
  isOpen,
  onToggle,
  filters,
  onFiltersChange,
  uniqueLocations,
  allInterests,
}: FilterPanelProps) {
  const hasActiveFilters =
    filters.locationFilter ||
    filters.interestFilter.length > 0 ||
    filters.socialFilter ||
    filters.followingCountFilter.platform ||
    filters.sortBy !== 'username';

  const clearAllFilters = () => {
    onFiltersChange({
      locationFilter: '',
      interestFilter: [],
      socialFilter: '',
      followingCountFilter: { platform: '', min: 0 },
      sortBy: 'username',
    });
  };

  return (
    <Card className="mb-4">
      <button onClick={onToggle} className="w-full">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Filters</CardTitle>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardHeader>
      </button>
      {isOpen && (
        <CardContent className="pt-0 px-4 pb-4 space-y-3">
          {/* Location Filter */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Location</label>
            <select
              value={filters.locationFilter}
              onChange={(e) => onFiltersChange({ locationFilter: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-md"
            >
              <option value="">All Locations</option>
              {uniqueLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          {/* Interest Filter */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Interests</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {allInterests.map((interestId) => {
                const thing = THINGS.find((t) => t.id === interestId);
                const isSelected = filters.interestFilter.includes(interestId);
                return (
                  <button
                    key={interestId}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        onFiltersChange({
                          interestFilter: filters.interestFilter.filter((i) => i !== interestId),
                        });
                      } else {
                        onFiltersChange({
                          interestFilter: [...filters.interestFilter, interestId],
                        });
                      }
                    }}
                    className={`px-2 py-1 rounded text-xs border ${
                      isSelected
                        ? 'bg-orange-100 text-orange-800 border-orange-300'
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    {thing?.icon} {thing?.name || interestId}
                  </button>
                );
              })}
            </div>
            {filters.interestFilter.length > 0 && (
              <button
                onClick={() => onFiltersChange({ interestFilter: [] })}
                className="text-xs text-orange-600 hover:text-orange-700 mt-1"
              >
                Clear ({filters.interestFilter.length})
              </button>
            )}
          </div>

          {/* Social Filter */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Has Social</label>
            <select
              value={filters.socialFilter}
              onChange={(e) => onFiltersChange({ socialFilter: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-md"
            >
              <option value="">All Creators</option>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>

          {/* Following Count Filter */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Minimum Following Count</label>
            <div className="flex gap-2">
              <select
                value={filters.followingCountFilter.platform}
                onChange={(e) =>
                  onFiltersChange({
                    followingCountFilter: { ...filters.followingCountFilter, platform: e.target.value },
                  })
                }
                className="flex-1 px-3 py-2 text-sm border rounded-md"
              >
                <option value="">Select Platform</option>
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="linkedin">LinkedIn</option>
              </select>
              <Input
                type="number"
                placeholder="Min"
                value={filters.followingCountFilter.min || ''}
                onChange={(e) =>
                  onFiltersChange({
                    followingCountFilter: {
                      ...filters.followingCountFilter,
                      min: e.target.value ? parseInt(e.target.value) : 0,
                    },
                  })
                }
                className="w-24"
                disabled={!filters.followingCountFilter.platform}
              />
            </div>
          </div>

          {/* Sort By */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => onFiltersChange({ sortBy: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-md"
            >
              <option value="username">Username</option>
              <option value="location">Location</option>
              <option value="followingCount">Following Count</option>
              <option value="submissions">Submissions</option>
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearAllFilters} className="w-full text-xs">
              Clear All Filters
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
