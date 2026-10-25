import { isProductionSite } from "@/lib/site";

type Props = { what: string; children?: React.ReactNode };

/** Visible TODO(owner) marker on local and preview builds; on production it renders the fallback (or nothing). */
const OwnerTodo = ({ what, children }: Props) => {
  if (isProductionSite) return <>{children}</>;
  return (
    <div className="owner-todo" role="note">
      <strong>TODO(owner)</strong> {what}
      {children && <div className="owner-todo-fallback">{children}</div>}
    </div>
  );
};

export default OwnerTodo;
