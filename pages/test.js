import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Test() {
  return (
    <div className="min-h-screen bg-blue-500 p-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>CSS Test</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-4">If you can see:</p>
            <ul className="list-disc list-inside mb-4">
              <li className="text-green-600 font-bold">Green text = Tailwind working</li>
              <li className="bg-red-100 p-2 rounded">Red background = Custom styles working</li>
              <li className="shadow-lg p-2">Shadow = CSS working</li>
            </ul>
            <Button className="w-full">Test Button</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}