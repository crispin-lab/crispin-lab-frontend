import { AppHeader } from "@/components/shell/AppHeader";

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader variant="full" />
      {children}
    </>
  );
}
