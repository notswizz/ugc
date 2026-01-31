import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UploadProgress {
  [key: string]: {
    progress: number;
    fileName: string;
  };
}

interface FileUploadSectionProps {
  title: string;
  type: 'videos' | 'photos' | 'raw-videos' | 'raw-photos';
  required?: number;
  accept: string;
  uploadedUrls: string[];
  uploadProgress: UploadProgress;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  description?: string;
  isRequired?: boolean;
}

export default function FileUploadSection({
  title,
  type,
  required,
  accept,
  uploadedUrls,
  uploadProgress,
  onFileChange,
  description,
  isRequired = false,
}: FileUploadSectionProps) {
  const progressPrefix = type.replace('-', '_') + '_';
  const activeUploads = Object.entries(uploadProgress).filter(
    ([id]) => id.startsWith(progressPrefix)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}{isRequired ? ' *' : ''}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            {description || `Upload ${type.replace('-', ' ')} files`}
            {required && ` (${required} required)`}
          </label>
          <input
            type="file"
            multiple
            accept={accept}
            onChange={onFileChange}
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Upload Progress */}
        {activeUploads.length > 0 && (
          <div className="space-y-2">
            {activeUploads.map(([id, progress]) => (
              <div key={id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">{progress.fileName}</span>
                  <span className="text-gray-600">{progress.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-[border-color,background-color] duration-200 duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Uploaded Files */}
        {uploadedUrls.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Uploaded ({uploadedUrls.length}{required ? `/${required}` : ''}):
            </p>
            {uploadedUrls.map((_, index) => (
              <div key={index} className="text-xs text-green-600 flex items-center gap-2">
                ✓ {type.includes('video') || type.includes('Video') ? 'Video' : 'Photo'} {index + 1} uploaded
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
