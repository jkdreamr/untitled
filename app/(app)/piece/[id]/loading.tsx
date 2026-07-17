import { CardSkeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <CardSkeleton />
    </div>
  );
}
