import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<typeof Input>, "type">;

export function TitleInput({ className, ...props }: Props) {
  return (
    <Input
      type="text"
      className={cn(
        "h-auto border-0 bg-transparent px-0 text-3xl font-semibold tracking-tight shadow-none transition-shadow duration-150 ease-out",
        "focus-visible:shadow-[inset_0_-2px_0_0_var(--color-accent)] focus-visible:ring-0 focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}
