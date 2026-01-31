"use client";

interface TwoSidePriceBarProps {
  yes: number;
  no: number;
  labelYes?: string;
  labelNo?: string;
  showRatio?: boolean;
}

/** 计算比率 */
function calcRatio(yes: number, no: number): string {
  if (yes === 0) return "∞";
  const ratio = no / yes;
  if (ratio >= 100) return ratio.toFixed(0);
  if (ratio >= 10) return ratio.toFixed(1);
  return ratio.toFixed(2);
}

/**
 * 双向价格柱状图
 * No 从左向右填充，Yes 从右向左填充
 */
export function TwoSidePriceBar({
  yes,
  no,
  labelYes = "Yes",
  labelNo = "No",
  showRatio = false,
}: TwoSidePriceBarProps) {
  // clamp 到 0..1
  const clampedYes = Math.max(0, Math.min(1, yes));
  const clampedNo = Math.max(0, Math.min(1, no));

  return (
    <div className="flex flex-col gap-1">
      {/* 文本标签 */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-red-400">
          {labelNo} <span className="text-white/70">${clampedNo.toFixed(2)}</span>
        </span>
        <span className="text-green-400">
          {labelYes} <span className="text-white/70">${clampedYes.toFixed(2)}</span>
        </span>
      </div>

      {/* 双向柱状图 */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
        {/* No: 从左向右 (红色) */}
        <div
          className="absolute left-0 top-0 h-full rounded-l-full bg-red-500/70 transition-all duration-300"
          style={{ width: `${clampedNo * 100}%` }}
        />
        {/* Yes: 从右向左 (绿色) */}
        <div
          className="absolute right-0 top-0 h-full rounded-r-full bg-green-500/70 transition-all duration-300"
          style={{ width: `${clampedYes * 100}%` }}
        />
      </div>

      {/* 可选的比率显示 */}
      {showRatio && (
        <div className="text-center text-xs text-white/50">
          {labelNo}/{labelYes} {calcRatio(clampedYes, clampedNo)}x
        </div>
      )}
    </div>
  );
}
