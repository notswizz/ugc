import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface ProductPurchaseData {
  receiptUrl: string;
  productPhotoUrl: string;
  amount: string;
  purchaseDate: string;
}

interface UploadProgress {
  [key: string]: {
    progress: number;
    fileName: string;
  };
}

interface ProductPurchaseSectionProps {
  reimbursementCap: number;
  productPurchase: ProductPurchaseData;
  onPurchaseChange: (updates: Partial<ProductPurchaseData>) => void;
  onReceiptUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProductPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadProgress: UploadProgress;
}

export default function ProductPurchaseSection({
  reimbursementCap,
  productPurchase,
  onPurchaseChange,
  onReceiptUpload,
  onProductPhotoUpload,
  uploadProgress,
}: ProductPurchaseSectionProps) {
  const receiptUploads = Object.entries(uploadProgress).filter(
    ([id]) => id.startsWith('receipts_')
  );
  const productPhotoUploads = Object.entries(uploadProgress).filter(
    ([id]) => id.startsWith('product-photos_')
  );

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle>Product Purchase Reimbursement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Purchase Amount ($) *
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            max={reimbursementCap || 9999}
            placeholder="0.00"
            value={productPurchase.amount}
            onChange={(e) => onPurchaseChange({ amount: e.target.value })}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Maximum reimbursement: ${reimbursementCap || 0}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Purchase Date *
          </label>
          <Input
            type="date"
            value={productPurchase.purchaseDate}
            onChange={(e) => onPurchaseChange({ purchaseDate: e.target.value })}
            className="w-full"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Receipt Photo *
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={onReceiptUpload}
            className="w-full p-2 border rounded"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Upload a clear photo of your purchase receipt
          </p>
          {/* Upload Progress */}
          {receiptUploads.length > 0 && (
            <div className="mt-2 space-y-1">
              {receiptUploads.map(([id, progress]) => (
                <div key={id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">{progress.fileName}</span>
                    <span className="text-gray-600">{progress.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          {productPurchase.receiptUrl && (
            <div className="mt-2 text-xs text-green-600">
              ✓ Receipt uploaded
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Product Photo (Optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={onProductPhotoUpload}
            className="w-full p-2 border rounded"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Optional: Upload a photo of the product you purchased
          </p>
          {/* Upload Progress */}
          {productPhotoUploads.length > 0 && (
            <div className="mt-2 space-y-1">
              {productPhotoUploads.map(([id, progress]) => (
                <div key={id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">{progress.fileName}</span>
                    <span className="text-gray-600">{progress.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          {productPurchase.productPhotoUrl && (
            <div className="mt-2 text-xs text-green-600">
              ✓ Product photo uploaded
            </div>
          )}
        </div>

        <div className="p-3 bg-blue-50 rounded border border-blue-200">
          <p className="text-xs text-blue-800">
            Reimbursement will be paid with your payout after approval. The reimbursement amount is separate from your base payout and is not subject to platform fees.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
