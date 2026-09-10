import { OperationsShell } from "@/components/operations-shell";

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  return <OperationsShell>{children}</OperationsShell>;
}
