"use client";

import { useRef } from "react";
import Image from "next/image";
import type { Testimonial } from "@/lib/testimonials";
import "@/components/styles/Reviews.css";

type Props = { review: Testimonial; size?: "sm" | "md" };

/**
 * The client's real Instagram story in a phone frame; opens full size in a lightbox (<dialog>:
 * Esc, the close button or a click on the backdrop closes it, focus returns to the thumbnail).
 */
const ReviewStory = ({ review, size = "sm" }: Props) => {
  const dialog = useRef<HTMLDialogElement>(null);
  if (!review.image) return null;
  const alt = `${review.brand}'s review of Devrex Digital, as posted on Instagram`;

  return (
    <>
      <button
        type="button"
        className={`review-phone is-${size}`}
        onClick={() => dialog.current?.showModal()}
        aria-label={`Open ${review.brand}'s Instagram story`}
      >
        <span className="review-phone-screen">
          <Image src={review.image.src} alt="" width={review.image.width} height={review.image.height} sizes={size === "md" ? "240px" : "120px"} loading="lazy" />
        </span>
        <span className="review-phone-hint">View story</span>
      </button>
      <dialog
        ref={dialog}
        className="review-lightbox"
        aria-label={`${review.brand}'s Instagram story`}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <div className="review-lightbox-inner">
          <Image src={review.image.src} alt={alt} width={review.image.width} height={review.image.height} sizes="(max-width: 600px) 92vw, 420px" />
          <button type="button" className="review-lightbox-close" onClick={() => dialog.current?.close()} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </dialog>
    </>
  );
};

export default ReviewStory;
