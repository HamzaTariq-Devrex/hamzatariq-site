"use client";

import { useState, useTransition } from "react";
import { updateLeadStatus, type LeadStatus } from "./actions";

const StatusSelect = ({ id, status }: { id: string; status: LeadStatus }) => {
  const [value, setValue] = useState(status);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const onChange = (next: LeadStatus) => {
    const previous = value;
    setValue(next);
    setError("");
    startTransition(async () => {
      const res = await updateLeadStatus(id, next);
      if (res.error) {
        setValue(previous);
        setError(res.error);
      }
    });
  };

  return (
    <span className="admin-status">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as LeadStatus)}
        disabled={pending}
        aria-label="Lead status"
        className={`is-${value}`}
      >
        <option value="new">New</option>
        <option value="replied">Replied</option>
        <option value="won">Won</option>
        <option value="lost">Lost</option>
      </select>
      {error && <small role="alert">{error}</small>}
    </span>
  );
};

export default StatusSelect;
