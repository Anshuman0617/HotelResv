import Image from "next/image";
import type { ReactNode } from "react";
import { hotelImage } from "@/lib/images";

/** Split layout for sign-in and registration: a photo beside the form. */
export default function AuthShell({
  title,
  subtitle,
  imageId,
  children,
}: {
  title: string;
  subtitle: string;
  imageId: number;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 items-stretch">
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        <Image src={hotelImage(imageId)} alt="" fill priority sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-sand-950/80 via-sand-950/20 to-transparent" />
        <blockquote className="absolute inset-x-0 bottom-0 p-12 text-white">
          <p className="max-w-md font-display text-3xl leading-snug">
            &ldquo;The best journeys begin with a room you can&rsquo;t wait to return to.&rdquo;
          </p>
          <footer className="mt-4 text-sm uppercase tracking-[0.18em] text-clay-200">HotelResv</footer>
        </blockquote>
      </div>
      <div className="flex w-full items-center justify-center px-4 py-16 lg:w-1/2">
        <section className="w-full max-w-md">
          <h1 className="text-4xl font-medium text-sand-900">{title}</h1>
          <p className="mt-2 text-sand-600">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
