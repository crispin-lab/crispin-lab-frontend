import { AppHeader } from "@/components/shell/AppHeader";

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader variant="thin" />
      {children}
    </>
  );
}
