import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";

export default function NotFound() {
  return (
    <PageContainer>
      <div className="skim-card-dashed mx-auto max-w-lg px-6 py-16 text-center">
        <p className="skim-eyebrow">404</p>
        <h1 className="mt-3 text-2xl font-bold text-foreground">Page not found</h1>
        <p className="mt-3 text-sm text-muted">
          This route doesn&apos;t exist in Skim. Check the URL or head back to
          today&apos;s digest.
        </p>
        <Link href="/" className="skim-btn-primary mt-6 inline-block">
          Go home
        </Link>
      </div>
    </PageContainer>
  );
}
