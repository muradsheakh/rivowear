import type { ReactNode } from "react";
import Footer from "./Footer";
import Header from "./Header";

export default function InfoPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        <header className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 text-base leading-7 text-gray-600">{description}</p>
        </header>
        <div className="mt-10 space-y-8 text-sm leading-7 text-gray-700">{children}</div>
      </main>
      <Footer />
    </>
  );
}
