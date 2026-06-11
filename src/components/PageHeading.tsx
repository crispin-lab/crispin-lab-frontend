import { cn } from "@/lib/utils";

type Props = React.ComponentProps<"h1">;

export function PageHeading({ className, ...props }: Props) {
  return (
    <h1
      className={cn(
        "bg-gradient-to-r from-(--heading-gradient-start) to-(--heading-gradient-end) bg-clip-text text-3xl font-semibold tracking-tight text-transparent",
        className,
      )}
      {...props}
    />
  );
}
