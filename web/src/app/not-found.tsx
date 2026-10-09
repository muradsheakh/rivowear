import Link from "next/link";
import Footer from "@/components/Common/Footer";
import Header from "@/components/Common/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="py-32 text-center">
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-gray-500">The page you are looking for does not exist.</p>
        <Link href="/shop" className="mt-8 inline-flex rounded-md bg-black px-6 py-3 text-sm text-white">Continue shopping</Link>
      </main>
      <Footer />
    </>
  );
}
