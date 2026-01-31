import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Video,
  Package,
  BookOpen,
  MessageSquare,
  Star,
  TrendingUp,
  Users,
  Sparkles
} from 'lucide-react';

export interface GigTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  defaultValues: {
    title?: string;
    contentType: string;
    platform: string;
    deliverables: {
      videos: number;
      photos: number;
    };
    payoutType: 'fixed' | 'dynamic';
    basePayout?: number;
    brief?: {
      hooks?: string[];
      angles?: string[];
      talkingPoints?: string[];
      dosList?: string[];
      dontsList?: string[];
    };
    visibility?: 'open' | 'squad' | 'invite';
    trustScoreMin?: number;
    category?: string;
  };
}

export const GIG_TEMPLATES: GigTemplate[] = [
  {
    id: 'product-review',
    name: 'Product Review',
    description: 'Honest review showcasing product features and benefits',
    icon: Star,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    defaultValues: {
      title: 'Product Review',
      contentType: 'ugc_video',
      platform: 'tiktok',
      deliverables: { videos: 1, photos: 0 },
      payoutType: 'dynamic',
      basePayout: 75,
      category: 'product_review',
      brief: {
        hooks: [
          'I\'ve been using [Product] for [time period] and...',
          'Here\'s my honest review of [Product]',
          'Is [Product] worth it? Let me tell you...'
        ],
        angles: [
          'Show product in real-life use',
          'Highlight key features',
          'Compare to alternatives',
          'Show before/after results'
        ],
        talkingPoints: [
          'What problem the product solves',
          'Key features you love',
          'Who it\'s best for',
          'Honest pros and cons'
        ],
        dosList: [
          'Be authentic and honest',
          'Show the product clearly',
          'Demonstrate actual use',
          'Include specific details'
        ],
        dontsList: [
          'Don\'t make false claims',
          'Don\'t hide the product',
          'Don\'t be overly scripted',
          'Don\'t use competitor products'
        ]
      },
      visibility: 'open',
      trustScoreMin: 50
    }
  },
  {
    id: 'unboxing',
    name: 'Unboxing',
    description: 'First impressions and excitement of opening the product',
    icon: Package,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    defaultValues: {
      title: 'Unboxing Video',
      contentType: 'ugc_video',
      platform: 'tiktok',
      deliverables: { videos: 1, photos: 0 },
      payoutType: 'dynamic',
      basePayout: 65,
      category: 'unboxing',
      brief: {
        hooks: [
          'I just got the [Product] and I\'m so excited!',
          'Unboxing the [Product] - let\'s see what\'s inside',
          'Is this the best [product type]? Let\'s find out...'
        ],
        angles: [
          'Show packaging and presentation',
          'React to first impressions',
          'Explore all included items',
          'Initial thoughts on quality'
        ],
        talkingPoints: [
          'Packaging quality',
          'What\'s included',
          'First impressions',
          'Anticipated use cases'
        ],
        dosList: [
          'Show genuine excitement',
          'Film the actual unboxing',
          'Show all package contents',
          'Keep energy high'
        ],
        dontsList: [
          'Don\'t pre-open the package',
          'Don\'t rush through it',
          'Don\'t fake reactions',
          'Don\'t skip important details'
        ]
      },
      visibility: 'open',
      trustScoreMin: 40
    }
  },
  {
    id: 'tutorial',
    name: 'Tutorial / How-To',
    description: 'Educational content showing how to use the product',
    icon: BookOpen,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    defaultValues: {
      title: 'Product Tutorial',
      contentType: 'ugc_video',
      platform: 'tiktok',
      deliverables: { videos: 1, photos: 0 },
      payoutType: 'dynamic',
      basePayout: 85,
      category: 'tutorial',
      brief: {
        hooks: [
          'Here\'s how to get the most out of [Product]',
          'Let me show you a cool trick with [Product]',
          '3 ways to use [Product] that you didn\'t know'
        ],
        angles: [
          'Step-by-step demonstration',
          'Pro tips and tricks',
          'Common mistakes to avoid',
          'Creative use cases'
        ],
        talkingPoints: [
          'Clear step-by-step process',
          'Why each step matters',
          'Common troubleshooting',
          'Expected results'
        ],
        dosList: [
          'Break down complex steps',
          'Show the process clearly',
          'Explain the "why" behind steps',
          'Include helpful tips'
        ],
        dontsList: [
          'Don\'t skip important steps',
          'Don\'t assume prior knowledge',
          'Don\'t rush through',
          'Don\'t make it too complicated'
        ]
      },
      visibility: 'open',
      trustScoreMin: 60
    }
  },
  {
    id: 'testimonial',
    name: 'Testimonial',
    description: 'Personal story about how the product helped you',
    icon: MessageSquare,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    defaultValues: {
      title: 'Customer Testimonial',
      contentType: 'ugc_video',
      platform: 'tiktok',
      deliverables: { videos: 1, photos: 0 },
      payoutType: 'dynamic',
      basePayout: 80,
      category: 'testimonial',
      brief: {
        hooks: [
          '[Product] changed my [daily routine/life/etc]',
          'I was skeptical about [Product] until...',
          'Here\'s why I can\'t live without [Product]'
        ],
        angles: [
          'Personal transformation story',
          'Problem before using product',
          'How product solved the problem',
          'Life after using product'
        ],
        talkingPoints: [
          'Your specific problem/challenge',
          'Why you chose this product',
          'The difference it made',
          'Who else would benefit'
        ],
        dosList: [
          'Be authentic and personal',
          'Share specific results',
          'Show genuine emotion',
          'Keep it relatable'
        ],
        dontsList: [
          'Don\'t be overly salesy',
          'Don\'t exaggerate results',
          'Don\'t compare to competitors',
          'Don\'t make medical claims'
        ]
      },
      visibility: 'open',
      trustScoreMin: 55
    }
  },
  {
    id: 'comparison',
    name: 'Product Comparison',
    description: 'Compare this product with alternatives in the market',
    icon: TrendingUp,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    defaultValues: {
      title: 'Product Comparison',
      contentType: 'ugc_video',
      platform: 'tiktok',
      deliverables: { videos: 1, photos: 0 },
      payoutType: 'dynamic',
      basePayout: 90,
      category: 'comparison',
      brief: {
        hooks: [
          '[Product] vs [Alternative] - which is better?',
          'I tested [Product] against 3 alternatives',
          'Here\'s why [Product] wins over [Alternative]'
        ],
        angles: [
          'Side-by-side feature comparison',
          'Price vs value analysis',
          'Real-world performance test',
          'Best for different use cases'
        ],
        talkingPoints: [
          'Key differentiating features',
          'Price and value proposition',
          'Pros and cons of each',
          'Final recommendation'
        ],
        dosList: [
          'Be fair and balanced',
          'Use objective criteria',
          'Show actual comparisons',
          'Explain your reasoning'
        ],
        dontsList: [
          'Don\'t bash competitors',
          'Don\'t be biased',
          'Don\'t make unfair comparisons',
          'Don\'t violate competitor trademarks'
        ]
      },
      visibility: 'open',
      trustScoreMin: 70
    }
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle Integration',
    description: 'Show product naturally integrated into daily life',
    icon: Users,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    defaultValues: {
      title: 'Lifestyle Content',
      contentType: 'ugc_video',
      platform: 'instagram',
      deliverables: { videos: 1, photos: 3 },
      payoutType: 'dynamic',
      basePayout: 95,
      category: 'lifestyle',
      brief: {
        hooks: [
          'A day in my life with [Product]',
          'How [Product] fits into my routine',
          'My [morning/evening/daily] routine featuring [Product]'
        ],
        angles: [
          'Natural product integration',
          'Real-life scenarios',
          'Authentic lifestyle moments',
          'Product as part of daily routine'
        ],
        talkingPoints: [
          'When and how you use it',
          'Why it fits your lifestyle',
          'How it makes life easier',
          'Who would love this product'
        ],
        dosList: [
          'Keep it natural and authentic',
          'Show real daily moments',
          'Feature product subtly',
          'Create aspirational content'
        ],
        dontsList: [
          'Don\'t force the product in',
          'Don\'t be overly staged',
          'Don\'t ignore the context',
          'Don\'t make it an obvious ad'
        ]
      },
      visibility: 'open',
      trustScoreMin: 60
    }
  },
  {
    id: 'custom',
    name: 'Start from Scratch',
    description: 'Create a fully custom gig with your own specifications',
    icon: Sparkles,
    color: 'text-zinc-600',
    bgColor: 'bg-zinc-50',
    defaultValues: {
      contentType: 'ugc_video',
      platform: 'tiktok',
      deliverables: { videos: 1, photos: 0 },
      payoutType: 'fixed',
      visibility: 'open'
    }
  }
];

interface GigTemplatesProps {
  onSelectTemplate: (template: GigTemplate) => void;
}

export default function GigTemplates({ onSelectTemplate }: GigTemplatesProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-zinc-900 mb-2">Choose a Template</h3>
        <p className="text-sm text-zinc-600">
          Start with a proven template or create from scratch
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {GIG_TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              className="w-full group text-left"
            >
              <Card className="border-zinc-200 hover:border-brand-300 hover:shadow-md transition-[border-color,box-shadow] duration-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${template.bgColor} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                      <Icon className={`w-6 h-6 ${template.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-zinc-900 mb-1 group-hover:text-brand-600 transition-colors">
                        {template.name}
                      </h4>
                      <p className="text-xs text-zinc-600 line-clamp-2">
                        {template.description}
                      </p>
                      {template.defaultValues.basePayout && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-zinc-500">Suggested payout:</span>
                          <span className="text-xs font-semibold text-emerald-600">
                            ${template.defaultValues.basePayout}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
