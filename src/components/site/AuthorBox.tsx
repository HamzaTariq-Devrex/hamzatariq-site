import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/site";

type Props = { heading?: string; className?: string };

const AuthorBox = ({ heading = "Who you'll work with", className = "" }: Props) => (
  <aside className={`author-box ${className}`.trim()} aria-label="About the author">
    <Image
      src={SITE.photo.src}
      alt={SITE.photo.alt}
      width={160}
      height={160}
      sizes="(max-width: 760px) 96px, 140px"
      className="author-box-photo"
    />
    <div className="author-box-body">
      <span className="page-eyebrow">{heading}</span>
      <p className="author-box-name">{SITE.name}</p>
      <p className="author-box-role">{SITE.jobTitle} · Founder of {SITE.agency.name}</p>
      <p className="author-box-bio">{SITE.bio}</p>
      <div className="author-box-links">
        <Link href="/about">About me</Link>
        <Link href="/hire">Hire me</Link>
        <a href={SITE.social.github} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </div>
    </div>
  </aside>
);

export default AuthorBox;
