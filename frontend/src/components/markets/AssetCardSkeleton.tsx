/**
 * AssetCardSkeleton Component
 * 
 * Loading skeleton for asset cards with shimmer animation
 */

export function AssetCardSkeleton() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-neutral-800" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-neutral-800 rounded w-16" />
          <div className="h-3 bg-neutral-800 rounded w-24" />
        </div>
      </div>
      <div className="h-6 bg-neutral-800 rounded w-20 mb-2" />
      <div className="h-4 bg-neutral-800 rounded w-16" />
    </div>
  );
}

export function AssetTableRowSkeleton() {
  return (
    <tr className="border-b border-neutral-800/50 animate-pulse">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-neutral-800" />
          <div className="space-y-2">
            <div className="h-4 bg-neutral-800 rounded w-16" />
            <div className="h-3 bg-neutral-800 rounded w-24" />
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="h-5 bg-neutral-800 rounded w-20" />
      </td>
      <td className="py-4 px-4">
        <div className="h-4 bg-neutral-800 rounded w-16" />
      </td>
      <td className="py-4 px-4">
        <div className="h-5 bg-neutral-800 rounded w-24" />
      </td>
      <td className="py-4 px-4">
        <div className="h-5 bg-neutral-800 rounded w-24" />
      </td>
    </tr>
  );
}
