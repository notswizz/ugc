import { Input } from '@/components/ui/input';
import type { GigFormData, FollowerRange } from '@/lib/gigs/create-gig-schema';

interface PayoutStepProps {
  gigData: GigFormData;
  updateGigData: (updates: Partial<GigFormData>) => void;
  availableCreatorsCount: number | null;
  loadingCreatorCount: boolean;
}

export default function PayoutStep({
  gigData,
  updateGigData,
  availableCreatorsCount,
  loadingCreatorCount,
}: PayoutStepProps) {
  const addFollowerRange = () => {
    const ranges = gigData.followerRanges || [];
    const lastRange = ranges[ranges.length - 1];
    const newMin = lastRange?.max !== null && lastRange?.max !== undefined ? lastRange.max : 0;
    updateGigData({
      followerRanges: [...ranges, { min: newMin, max: null, payout: 0 }]
    });
  };

  const updateFollowerRange = (index: number, updates: Partial<FollowerRange>) => {
    const ranges = gigData.followerRanges || [];
    const updatedRanges = ranges.map((range, i) => {
      if (i === index) {
        return { ...range, ...updates };
      }
      if (i === index + 1 && updates.max !== undefined) {
        return { ...range, min: updates.max as number };
      }
      return range;
    });
    updateGigData({ followerRanges: updatedRanges });
  };

  const removeFollowerRange = (index: number) => {
    const ranges = gigData.followerRanges.filter((_, i) => i !== index);
    const updatedRanges = ranges.map((range, i) => {
      if (i === 0) return range;
      const prevRange = ranges[i - 1];
      return {
        ...range,
        min: prevRange?.max !== null && prevRange?.max !== undefined ? prevRange.max : range.min
      };
    });
    updateGigData({ followerRanges: updatedRanges });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold mb-3 text-gray-900">Payout Type *</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => updateGigData({ payoutType: 'fixed' })}
            className={`flex-1 px-6 py-3 rounded-lg border-2 text-sm font-medium transition-[border-color,background-color,color,box-shadow] duration-200 ${
              gigData.payoutType === 'fixed'
                ? 'bg-orange-50 border-orange-500 text-orange-900 shadow-sm'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            💵 Fixed Payout
          </button>
          <button
            type="button"
            onClick={() => updateGigData({ payoutType: 'dynamic' })}
            className={`flex-1 px-6 py-3 rounded-lg border-2 text-sm font-medium transition-[border-color,background-color,color,box-shadow] duration-200 ${
              gigData.payoutType === 'dynamic'
                ? 'bg-orange-50 border-orange-500 text-orange-900 shadow-sm'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            📊 Dynamic by Followers
          </button>
        </div>

        {gigData.payoutType === 'fixed' ? (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Base Payout ($) *</label>
            <Input
              type="number"
              placeholder="150"
              value={gigData.basePayout}
              onChange={(e) => updateGigData({ basePayout: e.target.value })}
              required
              min="1"
              className="h-12 text-lg"
            />
          </div>
        ) : (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-3">Follower Count Ranges & Payouts *</label>

            <div className="space-y-3">
              {gigData.followerRanges.map((range, index) => {
                const isLastRange = index === gigData.followerRanges.length - 1;
                const prevRange = index > 0 ? gigData.followerRanges[index - 1] : null;

                return (
                  <div key={index} className="p-3 border-2 rounded-lg bg-white hover:border-gray-300 transition-[border-color,background-color,color,box-shadow] duration-200">
                    <div className="flex items-end gap-2 mb-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Min</label>
                        <Input
                          type="number"
                          placeholder={String(prevRange?.max || 0)}
                          value={range.min || ''}
                          onChange={(e) => {
                            const newMin = parseInt(e.target.value) || 0;
                            updateFollowerRange(index, { min: newMin });
                          }}
                          min={prevRange?.max || 0}
                          className="text-sm"
                          disabled={prevRange !== null}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Max</label>
                        <Input
                          type="number"
                          placeholder={isLastRange ? "∞" : "1000"}
                          value={range.max || ''}
                          onChange={(e) => {
                            const newMax = e.target.value ? parseInt(e.target.value) : null;
                            updateFollowerRange(index, { max: newMax });
                          }}
                          min={range.min || 0}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Payout ($)</label>
                        <Input
                          type="number"
                          placeholder="25"
                          value={range.payout || ''}
                          onChange={(e) => updateFollowerRange(index, { payout: parseFloat(e.target.value) || 0 })}
                          min="0"
                          step="0.01"
                          className="text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFollowerRange(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
                        disabled={gigData.followerRanges.length === 1}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded">
                      {range.min} - {range.max === null ? '∞' : range.max} followers = ${range.payout || 0}
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addFollowerRange}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-[border-color,background-color,color,box-shadow] duration-200"
              >
                + Add Range
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Bonus Pool ($)</label>
        <Input
          type="number"
          placeholder="100"
          value={gigData.bonusPool}
          onChange={(e) => updateGigData({ bonusPool: e.target.value })}
          min="0"
          className="h-12 text-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Accepted Submissions Limit *</label>
        <Input
          type="number"
          placeholder="1"
          value={gigData.acceptedSubmissionsLimit || 1}
          onChange={(e) => updateGigData({ acceptedSubmissionsLimit: parseInt(e.target.value) || 1 })}
          required
          min="1"
          max="100"
          className="h-12 text-lg"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium">Trust Score Minimum</label>
          <div className="text-right">
            <span className="text-2xl font-bold text-brand-600">{gigData.trustScoreMin || 0}</span>
            <span className="text-sm text-gray-500 ml-1">/ 100</span>
          </div>
        </div>

        {/* Slider */}
        <div className="relative pt-1">
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={gigData.trustScoreMin || 0}
            onChange={(e) => updateGigData({ trustScoreMin: e.target.value })}
            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
            style={{
              background: `linear-gradient(to right, #f97316 0%, #f97316 ${gigData.trustScoreMin || 0}%, #e5e7eb ${gigData.trustScoreMin || 0}%, #e5e7eb 100%)`
            }}
          />
        </div>
      </div>

      {/* Minimum Followers - Only show if platform is selected AND payout is NOT dynamic */}
      {gigData.platform && gigData.payoutType !== 'dynamic' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">
              Minimum {gigData.platform} Followers
            </label>
            <div className="text-right">
              <span className="text-2xl font-bold text-brand-600">
                {gigData.minFollowers ? parseInt(gigData.minFollowers).toLocaleString() : 0}
              </span>
              <span className="text-sm text-gray-500 ml-1">followers</span>
            </div>
          </div>

          {/* Slider */}
          <div className="relative pt-1">
            <input
              type="range"
              min="0"
              max="100000"
              step="1000"
              value={gigData.minFollowers || 0}
              onChange={(e) => updateGigData({ minFollowers: e.target.value })}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right, #f97316 0%, #f97316 ${(parseInt(gigData.minFollowers) || 0) / 1000}%, #e5e7eb ${(parseInt(gigData.minFollowers) || 0) / 1000}%, #e5e7eb 100%)`
              }}
            />
          </div>
        </div>
      )}

      {/* Available Creators Count */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-brand-50 to-accent-50 rounded-lg border-2 border-brand-200">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👥</span>
          <span className="text-sm font-medium text-gray-700">Available Creators</span>
        </div>
        <div className="text-right">
          {loadingCreatorCount ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : availableCreatorsCount !== null ? (
            <div>
              <div className="text-2xl font-bold text-brand-600">{availableCreatorsCount}</div>
              <div className="text-xs text-gray-500">
                {availableCreatorsCount === 0 ? 'None available' :
                 availableCreatorsCount === 1 ? 'creator' : 'creators'}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">Set filters</div>
          )}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-[border-color,background-color,color,box-shadow] duration-200">
          <input
            type="checkbox"
            checked={gigData.productInVideoRequired}
            onChange={(e) => updateGigData({ productInVideoRequired: e.target.checked })}
            className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
          />
          <span className="text-sm font-medium">📦 Product must appear in content</span>
        </label>
        {gigData.productInVideoRequired && (
          <div className="mt-3 space-y-3 p-4 border-2 border-orange-200 bg-orange-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium mb-2">Reimbursement Mode</label>
              <select
                className="w-full p-3 border-2 rounded-lg bg-white text-base focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                value={gigData.reimbursementMode}
                onChange={(e) => updateGigData({ reimbursementMode: e.target.value as 'reimbursement' | 'shipping' })}
              >
                <option value="reimbursement">💳 Reimbursement (creator buys)</option>
                <option value="shipping">📦 Shipping (we ship to creator)</option>
              </select>
            </div>
            {gigData.reimbursementMode === 'reimbursement' && (
              <div>
                <label className="block text-sm font-medium mb-2">Reimbursement Cap ($)</label>
                <Input
                  type="number"
                  placeholder="50"
                  value={gigData.reimbursementCap}
                  onChange={(e) => updateGigData({ reimbursementCap: e.target.value })}
                  className="h-12 text-lg"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Deadline</label>
        <select
          className="w-full p-3 border-2 rounded-lg bg-white text-base focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          value={gigData.deadlineHours}
          onChange={(e) => updateGigData({ deadlineHours: Number(e.target.value) })}
        >
          <option value={24}>⏰ 24 hours</option>
          <option value={48}>⏰ 48 hours</option>
          <option value={72}>⏰ 3 days</option>
          <option value={168}>⏰ 1 week</option>
        </select>
      </div>
    </div>
  );
}
