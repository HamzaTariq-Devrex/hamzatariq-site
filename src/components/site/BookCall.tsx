import Link from "next/link";
import { SITE } from "@/lib/site";

type Props = { label?: string; variant?: "primary" | "ghost"; className?: string };

const BookCall = ({ label = "Book a free call", variant = "primary", className = "" }: Props) => {
  const cls = `page-btn page-btn-${variant} ${className}`.trim();
  if (SITE.bookingUrl) {
    return (
      <a href={SITE.bookingUrl} target="_blank" rel="noreferrer" className={cls}>
        {label}
      </a>
    );
  }
  return (
    <Link href="/contact" className={cls}>
      {label}
    </Link>
  );
};

export default BookCall;
