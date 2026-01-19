"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useContext } from "react";
import LOGO_RD from "@/public/rd-center-logo.png";
import { translate } from "@/components/system/language";
import { LanguageContext } from "@/components/system/languageWrapper";

function Footer() {
  const { language } = useContext(LanguageContext);
  return (
    <footer className="w-full pt-8 divide-y-2">
      <div className="flex justify-center pb-2">
        <div className="w-1/2">
          <div className="flex gap-4 lg:flex-row flex-col">
            <div className="col-span-1">
              <Image
                src={LOGO_RD}
                alt={"FUJINET R&D CENTER"}
                className="object-contain"
                width={60}
              />
              <span className="w-max flex gap-1">
                <span className="text-indigo-900 font-bold text-lg">
                  {"FUJINET R&D "}
                </span>
                <span className="text-orange-500 font-bold text-lg">
                  CENTER
                </span>
              </span>
            </div>
            <div className="col-span-2 flex flex-col text-[14px]">
              <p className="font-bold text-[16px]">
                {translate("Contact", language)}
              </p>
              <Link href="https://g.page/FUJINET?share">
                {translate("Address", language)}
              </Link>
              <div className="flex flex-wrap">
                <Link href="tel:+842838477000" className="mr-8">
                  {translate("PhoneVN", language)}
                </Link>
                <Link href="tel:+81355799961">
                  {translate("PhoneJP", language)}
                </Link>
              </div>
              <Link href="mailto:info@fujinet.net">
                {translate("Email", language)}
              </Link>
            </div>
            <div className="col-span-1 flex flex-col text-[14px]">
              <p className="font-bold text-[16px] w-max">
                {translate("MainPages", language)}
              </p>
              <Link className="w-max" href="https://www.fujinet.net/">
                FUJINET SYSTEMS
              </Link>
              <Link className="w-max" href="https://www.fujinet.net/rdcenter/">
                FUJINET R&D CENTER
              </Link>
              <Link
                className="w-max"
                href="https://docs-aiservice.fujinet.net/"
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
