import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
  className?: string;
};

export function ErrorRetryCard({ message, onRetry, isRetrying, className }: Props) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-start gap-3 py-6">
        <p className="text-sm">{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? "재시도 중..." : "다시 시도"}
        </Button>
      </CardContent>
    </Card>
  );
}
