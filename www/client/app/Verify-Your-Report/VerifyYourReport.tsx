"use client";

import React from "react";
import NavBar from "@/components/user/NavBar";
import FixedBottomIconBar from "@/components/user/FixedBottomIconBar";
import AdditionalReports from "@/components/user/AdditionalReports";
import Footer from "@/components/user/Footer";
import VerifyReport from "@/components/user/VerifyReport";
import LanguageSwitcher from "@/components/user/LanguageSwitcher";
import ParamsVerifyReport from "@/components/user/ParamsVerifyReport";

export default function VerifyYourReport() {
    return (
        <>
            <NavBar />
            {/* spacer to offset the fixed header */}
            <div className="h-[50px] md:h-[80px] lg:h-[130px] xl:h-[89px]" aria-hidden="true" />
            <FixedBottomIconBar />
            <LanguageSwitcher />
            <ParamsVerifyReport />
            <VerifyReport />
            <AdditionalReports />
            <Footer />
        </>
    );
}
