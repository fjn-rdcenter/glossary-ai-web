"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useContext } from "react";
import LOGO_RD from "@/public/aiic-logo.png";
import { useTranslations } from 'next-intl';

function Footer() {
  const trml = useTranslations('Footer');
  return (
    <footer className="w-full pt-8 divide-y-2">
      <div className="flex justify-center pb-2">
        <div className="w-3/4">
          <div className="grid grid-cols-[2fr_3fr_2fr] gap-8 lg:grid-cols-[2fr_3fr_2fr] items-start">
            <div className="flex flex-col items-start">
              <Image
                src={LOGO_RD}
                alt={"FUJINET AI Innovation CENTER"}
                className="object-contain w-full max-w-[220px]"
                width={220}
              />
            </div>
            <div className="flex flex-col text-[14px]">
              <p className="font-bold text-[16px]">
                {trml("contact")}
              </p>
              <Link className="" href="https://g.page/FUJINET?share" target="_blank" rel="noopener noreferrer">
                {trml("address")}
              </Link>
              <div className="flex flex-wrap">
                {trml("phone")}
              </div>
              <Link className="w-max" href="mailto:aiic-support@fujinet.net">
                {trml("email")}
              </Link>
            </div>
            <div className="flex flex-col text-[14px]">
              <p className="font-bold text-[16px]">
                {trml("mainPages")}
              </p>
              <Link className="w-max" href="https://www.fujinet.net/" target="_blank" rel="noopener noreferrer">
                FUJINET SYSTEMS
              </Link>
              <Link href="https://aiinnovationcenter.fujinet.net/" target="_blank" rel="noopener noreferrer">
                FUJINET AI INNOVATION CENTER
              </Link>
              <Link
                className="w-max"
                href="https://docs-aiservice.fujinet.net/"
                target="_blank"
                rel="noopener noreferrer"
              >
                AI SERVICE SOLUTIONS
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto flex flex-col justify-center items-center py-2 text-[14px]">
        <p>&copy; FUJINET SYSTEMS JOINT STOCK COMPANY (FUJINET SYSTEMS JSC)</p>
        <p>All rights reserved.</p>
      </div>
    </footer>
  );
}

export { Footer };
