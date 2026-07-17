import { ListSkeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="shimmer h-12 w-full rounded-full" />
      <ListSkeleton />
    </div>
  );
}
