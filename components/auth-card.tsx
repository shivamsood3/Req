import { Brand } from "./brand";

export function AuthCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Brand />
        <div className="auth-heading">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
        </div>
        {children}
      </section>
    </main>
  );
}
