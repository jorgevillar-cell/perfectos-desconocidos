export function PaymentsStatusCard({
  title,
  description,
  tone,
}: {
  title: string;
  description: string;
  tone: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]"
      : tone === "warning"
        ? "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]"
        : tone === "danger"
          ? "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]"
          : "border-[#E5E7EB] bg-white text-[#1A1A1A]";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <p className="text-[14px] font-semibold">{title}</p>
      <p className="mt-1 text-[13px] leading-6 opacity-90">{description}</p>
    </div>
  );
}