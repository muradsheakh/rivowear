"use client";

import { usePathname } from "next/navigation";
import { FaWhatsapp } from "react-icons/fa";

import { useSettings } from "../context/useSettings";
import { whatsappLink } from "../whatsapp";

/** Floating chat button shown on every customer page. */
const WhatsAppButton = () => {
  const settings = useSettings();
  const pathname = usePathname();
  if (!settings?.whatsappNumber || pathname.startsWith("/admin") || pathname.startsWith("/invoice")) return null;
  return (
    <a
      href={whatsappLink(settings.whatsappNumber, `Hello ${settings.storeName}, I need some help.`)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed right-5 bottom-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 print:hidden"
    >
      <FaWhatsapp className="h-8 w-8" />
    </a>
  );
};

export default WhatsAppButton;
