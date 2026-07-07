const CLASS_BY_STATUS = {
  idle: "badge badge-success",
  processing: "badge badge-warning",
  error: "badge badge-error",
};

const LABEL_BY_STATUS = {
  idle: "Idle",
  processing: "Processing",
  error: "Error",
};

export default function StatusBadge({ status }) {
  return (
    <span className={CLASS_BY_STATUS[status] || "badge badge-success"}>
      {LABEL_BY_STATUS[status] || status}
    </span>
  );
}
