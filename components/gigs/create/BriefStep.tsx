import type { GigFormData, GigBrief } from '@/lib/gigs/create-gig-schema';

interface BriefStepProps {
  gigData: GigFormData;
  updateBrief: (updates: Partial<GigBrief>) => void;
}

export default function BriefStep({ gigData, updateBrief }: BriefStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Creative Brief (Optional)</label>
        <p className="text-sm text-muted-foreground mb-4">
          Help creators understand your vision and brand guidelines
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Opening Hooks</label>
          <textarea
            className="w-full p-3 border rounded-md min-h-[80px]"
            placeholder="Suggest ways creators can start their content..."
            value={gigData.brief.hooks.join('\n')}
            onChange={(e) => updateBrief({
              hooks: e.target.value.split('\n').filter(line => line.trim())
            })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Story Angles</label>
          <textarea
            className="w-full p-3 border rounded-md min-h-[80px]"
            placeholder="Different ways to approach the content..."
            value={gigData.brief.angles.join('\n')}
            onChange={(e) => updateBrief({
              angles: e.target.value.split('\n').filter(line => line.trim())
            })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Key Talking Points</label>
          <textarea
            className="w-full p-3 border rounded-md min-h-[80px]"
            placeholder="What should creators mention or highlight..."
            value={gigData.brief.talkingPoints.join('\n')}
            onChange={(e) => updateBrief({
              talkingPoints: e.target.value.split('\n').filter(line => line.trim())
            })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Do's ✅</label>
            <textarea
              className="w-full p-3 border rounded-md min-h-[80px]"
              placeholder="What creators should do..."
              value={gigData.brief.do.join('\n')}
              onChange={(e) => updateBrief({
                do: e.target.value.split('\n').filter(line => line.trim())
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Don'ts ❌</label>
            <textarea
              className="w-full p-3 border rounded-md min-h-[80px]"
              placeholder="What creators should avoid..."
              value={gigData.brief.dont.join('\n')}
              onChange={(e) => updateBrief({
                dont: e.target.value.split('\n').filter(line => line.trim())
              })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
