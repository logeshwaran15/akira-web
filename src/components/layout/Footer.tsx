export function Footer() {
  return (
    <footer className="fixed bottom-1.5 right-3 z-10 rounded-md border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground shadow-sm">
      © {new Date().getFullYear()} Akira School ERP. All Rights Reserved.
    </footer>
  );
}
