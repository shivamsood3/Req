import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="REQ home">
      REQ <span className="live-dot" aria-label="live" />
    </Link>
  );
}
