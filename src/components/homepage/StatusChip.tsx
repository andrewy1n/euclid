interface StatusChipProps {
  status: "in progress" | "completed";
}

export default function StatusChip({ status }: StatusChipProps) {
  const isCompleted = status === "completed";

  const baseClasses =
    "text-xs font-medium px-2 py-1 rounded-full inline-block";

  const chipClasses = isCompleted
    ? "bg-green-100 text-green-700"
    : "bg-yellow-100 text-yellow-700";

  return (
    <span className={`${baseClasses} ${chipClasses}`}>
      {isCompleted ? "Completed" : "In Progress"}
    </span>
  );
}
