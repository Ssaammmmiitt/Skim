import { ArchiveView } from "@/components/archive/ArchiveView";
import { PageContainer } from "@/components/layout/PageContainer";
import { fetchDigest, fetchDigestDates, todayUtc } from "@/lib/digests";
import { createClient } from "@/lib/supabase/server";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type ArchivePageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  const params = await searchParams;
  const today = todayUtc();
  const initialDate =
    params.date && DATE_RE.test(params.date) && params.date <= today
      ? params.date
      : today;

  const supabase = await createClient();
  const [digest, availableDates] = await Promise.all([
    fetchDigest(supabase, initialDate),
    fetchDigestDates(supabase),
  ]);

  return (
    <PageContainer>
      <ArchiveView
        initialDate={initialDate}
        initialDigest={digest}
        availableDates={availableDates}
      />
    </PageContainer>
  );
}
