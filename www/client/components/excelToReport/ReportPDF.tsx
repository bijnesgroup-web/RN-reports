import React, { useEffect, useState } from "react"
import { View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer"
import QRCode from "qrcode";
import { BOTTOM_DATE, DEFAULT_COMMENT, DEFAULT_COMMENT_ELECTRONIC_COPY_ONE, DEFAULT_COMMENT_ELECTRONIC_COPY_TWO, IMPORTANT_NOTICE, IMPORTANT_NOTICE_BOLD } from "@/lib/env";

// add near top of file / inside component before creating styles
const LABEL_WIDTH = 53.4; // LABEL_WIDTH — the horizontal space (in PDF points) reserved for the label text (e.g. "Comments:"). Think of it as the left  column width.
const LABEL_GAP = 0  // a little extra padding between the label and value of the start of the first line of the value.


Font.registerHyphenationCallback(word => [word]);

export type ReportData = {
    style_number: string
    report_no: string
    description: string
    shape_and_cut: string
    tot_est_weight: string
    color: string
    clarity: string
    comment: string | null;
    image_url?: string
    important_notice?: string
    report_date?: string
    bottom_data?: string
    important_notice_bold?: string
    isecopy?: boolean
    notice_image?: boolean
    image_filename?: string
    company_logo?: string
}

type Props = {
    data: ReportData
    /** width/height for the *inner content box* (numbers = points, or percent strings like "80%") */
    contentWidth?: number | string
    contentHeight?: number | string
    isSingleGridLayout: boolean
    valueWidth: number

}

export default function ReportPDF({
    data,
    isSingleGridLayout,
    contentWidth,
    contentHeight,
    valueWidth
}: Props) {
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const isECopy = Boolean(data.isecopy);

    const FIXED_FONTS = {
        title: 6,
        jewelryTitle: isSingleGridLayout && isECopy ? 4.5 : 6.3,
        label: isSingleGridLayout ? isECopy ? 4.8 : 5.5 : 6,
        value: isSingleGridLayout ? isECopy ? 4.8 : 5 : 6,
        footer: 2.9,
        bottomDate: 3,
    };

    useEffect(() => {
        let mounted = true;
        // Only generate QR when not in single grid layout
        const generate = async () => {
            try {
                if (isSingleGridLayout) {
                    // Clear any existing QR when single-grid layout is active
                    if (mounted) setQrDataUrl(null);
                    return;
                }

                // If there's no report number, clear qr and exit
                const reportNo = String(data?.report_no ?? "");
                if (!reportNo) {
                    if (mounted) setQrDataUrl(null);
                    return;
                }

                // prefer a configured base URL (useful in prod); otherwise use current origin (client-side)
                const base = (process.env.NEXT_PUBLIC_BASE_URL && String(process.env.NEXT_PUBLIC_BASE_URL))

                // build the full verify URL and encode the report number
                const verifyUrl = `${base}/?r=${encodeURIComponent(reportNo)}`;

                // margin:0 avoids extra quiet zone; width:800 keeps high resolution
                const opts = { margin: 0, width: 800 };
                const url = await QRCode.toDataURL(verifyUrl, opts);

                if (mounted) setQrDataUrl(url);
            } catch (err) {
                console.error("QR generation error:", err);
                if (mounted) setQrDataUrl(null);
            }
        };

        generate();
        return () => {
            mounted = false;
        };
    }, [data?.report_no, isSingleGridLayout]);

    const styles = StyleSheet.create({
        // global container
        container: {
            fontFamily: "Helvetica",
            fontSize: 11,
            // backgroundColor: "#FFFFFF",
            flexDirection: "column",
        },
        headerRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            position: "absolute",
            top: isSingleGridLayout ? 0 : 7.5,
            left: isSingleGridLayout ? isECopy ? 44 : 38 : 36,
            right: isSingleGridLayout ? 11 : 19.3,
            // zIndex: 9999,
        },
        logoRow: {
            // marginTop: 1.6,
        },
        // fonts
        ITCFont: {
            fontFamily: "ITCAvantGardeCondensed",
        },
        CanvaFont: {
            fontFamily: "CanvaSans",
        },
        ArimoFont: {
            fontFamily: "Arimo",
        },
        IBmFont: {
            fontFamily: "IBMPlexSans",
        },
        title: {
            color: 'black',
            fontSize: FIXED_FONTS.title,
        },
        jewelryTitle: {
            marginTop: isSingleGridLayout ? isECopy ? 2.7 : 0 : 2.7,
            fontWeight: "normal",
            marginRight: isSingleGridLayout ? isECopy ? 2 : 0 : 3.4,
            letterSpacing: 0.1,
            fontSize: FIXED_FONTS.jewelryTitle,
        },
        ecopy: { fontSize: 5.6, color: "red", fontWeight: "bold" },
        rightImageContainer: {
            width: 52,
            height: 46,
        },
        twoCol: {
            flexDirection: "row",
            marginLeft: isSingleGridLayout ? 2.1 : 0,
            marginTop: isSingleGridLayout ? isECopy ? 44.5 : 42 : 43.5,
            position: "relative"
        },
        leftCol: { flex: 1 },
        labelRow: {
            flexDirection: "row",
            marginBottom: -0.6,
            alignItems: "flex-start",
            position: "relative",
        },
        label: {
            width: isSingleGridLayout && isECopy ? 57 : LABEL_WIDTH,
            fontSize: FIXED_FONTS.label,
            position: "absolute",
            left: 0,
            top: 0,
            paddingRight: 4,
            ...(isSingleGridLayout && isECopy && {
                position: 'static',
                textTransform: 'uppercase',
            }),
            // letterSpacing: 0.4,
            fontFamily: "ITCAvantGardeCondensed",
        },
        // value should take full width and use a textIndent so the first line starts after the label
        value: {
            fontSize: FIXED_FONTS.value,
            width: isSingleGridLayout && isECopy ? valueWidth - 50 : valueWidth,
            // backgroundColor: 'pink',
            // first line is indented to sit after the label; wrapped lines start at left margin (same as label)
            textIndent: LABEL_WIDTH + LABEL_GAP,
            // ensure there's no left margin that would push wrapped lines further
            paddingLeft: 0,
            marginTop: isSingleGridLayout ? isECopy ? -2 : -1.5 : -1.3,
            // letterSpacing: 0.3,
            // vertical spacing between lines: increase to add more space between the 1st and 2nd line
            // lineHeight: 1.4,
            lineHeight: isSingleGridLayout ? isECopy ? 1.6 : 1.8 : 1.6,
            fontFamily: "IBMPlexSans",
            ...(isSingleGridLayout && isECopy && {
                textIndent: -5
            }),
        },
        colon: {
            marginLeft: -10,
            fontSize: Math.max(FIXED_FONTS.value - 1, 6),
            fontFamily: "IBMPlexSans",
        },
        mainComment: {
            fontSize: FIXED_FONTS.value,
            letterSpacing: -0.2,
        },
        bigBold: { fontWeight: "bold", fontSize: 12 },
        commentsBox: { marginTop: 10 },
        footer: {
            marginTop: isSingleGridLayout ? 15 : 17.5,
            marginLeft: -3.4,
            letterSpacing: isSingleGridLayout && isECopy ? 0.1 : -0.1,
            position: "absolute",
            bottom: isSingleGridLayout ? isECopy ? 1 : 3 : 30.3,
            left: isSingleGridLayout ? 11 : 26.5,
            fontSize: FIXED_FONTS.footer,
        },
        bottomDate: {
            position: "absolute",
            bottom: isSingleGridLayout ? '2.7%' : "16%",
            right: isSingleGridLayout ? '5%' : "11.60%",
            fontSize: FIXED_FONTS.bottomDate,
        },
        qrWatermark: {
            position: "absolute",
            top: "15%",
            left: "41%",
            width: 26.3,
            height: 27,
        },
        rightImageAbsolute: {
            position: "absolute",
            top: isSingleGridLayout ? isECopy ? "45%" : "40%" : "44.5%",
            right: isSingleGridLayout ? isECopy ? 6 : 6 : 25,
            // width: 47, // orignal img size
            // height: 44.5, // orignal img size
            width: isSingleGridLayout ? isECopy ? 52 : 44 : 46,
            height: isSingleGridLayout ? isECopy ? 41.9 : 44 : 46,
            overflow: "hidden",
            // border: "0.3pt solid red", // optional
        },
        IgiImageAbsolute: {
            position: "absolute",
            top: "1%",
            left: 11,
            width: isSingleGridLayout && isECopy ? 29 : 31,
            height: isSingleGridLayout && isECopy ? 29 : 31,
            overflow: "hidden",
            // border: "0.3pt solid red", // optional
        },
        noticeBgImageAbsolute: {
            position: "absolute",
            bottom: "13%",
            left: 11,
            width: "95%",
            height: 15,
            overflow: "hidden",
        },

        electronicCopyImageAbsolute: {
            position: "absolute",
            top: isSingleGridLayout && isECopy ? '3%' : "8%",
            right: isSingleGridLayout && isECopy ? 59 : 18,
            width: isSingleGridLayout && isECopy ? 29 : 31,
            height: isSingleGridLayout && isECopy ? 29 : 31,
            overflow: "hidden",
            // border: "0.3pt solid red", // optional
        },
        eCopyAbsolute: {
            position: "absolute",
            top: isSingleGridLayout && isECopy ? '24.9%' : "0",
            left: isSingleGridLayout && isECopy ? '62.4%' : '40.3%',
            marginTop: -1,
            overflow: "hidden",
        },

    })

    // Apply width/height/padding only to this inner container.
    // const containerStyle: any = [styles.container, { width: contentWidth ?? "100%", height: contentHeight ?? undefined, padding }, style]
    const containerStyle: any = [
        styles.container,
        {
            width: contentWidth ?? "100%",
            height: contentHeight ?? undefined,
        },
    ];

    // wrapper that rotates the entire page/content 180° clockwise 
    const rotatedWrapperStyle: any = {
        width: contentWidth ?? "100%",
        height: contentHeight ?? undefined,
        transform: isSingleGridLayout ? "rotate(0deg)" : "rotate(270deg)",
    };

    return (
        <View style={[rotatedWrapperStyle]}>
            <View style={[containerStyle,
                { paddingHorizontal: isSingleGridLayout ? isECopy ? 4 : 6 : 26.3, paddingVertical: isSingleGridLayout ? 0 : 25.3, }
            ]}>
                {isSingleGridLayout && <View style={styles.eCopyAbsolute}>
                    <Text style={{
                        color: 'red',
                        ...(isSingleGridLayout && isECopy && {
                            letterSpacing: 1,
                        }),
                        fontSize: isSingleGridLayout && isECopy ? 5.2 : 6, fontFamily: isSingleGridLayout && isECopy ? "IBMPlexSans" : "CanvaSans", fontWeight: 100
                    }}>{isSingleGridLayout && isECopy ? 'ELECTRONIC COPY' : 'E-COPY'}</Text>
                </View>}

                {isSingleGridLayout && data.company_logo && <View style={styles.electronicCopyImageAbsolute}>
                    <Image
                        src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/uploads/logo/${data.company_logo}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                </View>}

                {isSingleGridLayout && <View style={styles.IgiImageAbsolute}>
                    <Image
                        src="/img/logo.jpg"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />

                </View>}

                {!isSingleGridLayout && data.notice_image && <View style={styles.noticeBgImageAbsolute}>
                    <Image
                        src="/img/notice_bg.png"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />

                </View>}
                <View style={styles.rightImageAbsolute}>
                    <Image
                        src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/uploads/${data.image_filename}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                </View>
                {qrDataUrl && (
                    <View style={styles.qrWatermark} wrap={false}>
                        <Image src={qrDataUrl} style={{ width: "100%", height: "100%" }} />
                    </View>
                )}
                {/* Header */}
                <View>
                    <View style={styles.headerRow} wrap={false}>
                        <View style={styles.logoRow}>
                            <View style={{ flexDirection: "column", marginTop: isSingleGridLayout ? 5 : 0 }}>
                                <Text style={[styles.ArimoFont, styles.title, { letterSpacing: -0.3 }]}>
                                    INTERNATIONAL
                                </Text>

                                <Text
                                    style={[
                                        styles.ArimoFont,
                                        {
                                            fontSize: FIXED_FONTS.title,
                                            fontWeight: "bold",
                                            marginTop: 1,
                                            color: 'black',
                                        },
                                    ]}
                                >
                                    GEMOLOGICAL
                                </Text>
                                <Text
                                    style={[
                                        styles.ArimoFont,
                                        { fontSize: FIXED_FONTS.title, color: 'black', marginTop: 1.2, letterSpacing: -0.3 },
                                    ]}
                                >
                                    INSTITUTE{"\u00A0"}
                                    <Text
                                        style={[
                                            styles.ITCFont,
                                            { fontWeight: "normal", fontSize: 6, marginLeft: 6, letterSpacing: 0.3 },
                                        ]}
                                    >
                                        INDIA
                                    </Text>
                                </Text>
                            </View>
                        </View>

                        <View >
                            <Text style={[styles.CanvaFont, styles.jewelryTitle]}>
                                JEWELRY REPORT
                            </Text>
                        </View>
                    </View>

                    {/* Main content */}
                    <View style={styles.twoCol}>
                        <View style={styles.leftCol}>
                            <View style={styles.labelRow}>
                                <Text style={styles.label}>{isSingleGridLayout && isECopy ? 'summary no' : 'Report No'}</Text>
                                <Text style={styles.value}>
                                    {"\u00A0"}
                                    <Text style={styles.colon}>: </Text>
                                    <Text>{data.report_no}</Text>
                                </Text>
                            </View>

                            <View style={[styles.labelRow, { top: isSingleGridLayout ? isECopy ? 1.2 : 0.7 : 0.6 }]}>
                                <Text style={styles.label}>Description</Text>
                                <Text
                                    style={[
                                        styles.value,
                                        { fontFamily: "ITCAvantGardeCondensed" },
                                    ]}
                                >
                                    {"\u00A0"}
                                    <Text style={styles.colon}>: </Text>
                                    <Text>{data.description}</Text>
                                </Text>
                            </View>

                            <View style={[styles.labelRow, { top: isSingleGridLayout ? isECopy ? 1 : 5.5 : 3.5 }]}>
                                <Text style={styles.label}>Shape and Cut</Text>
                                <Text
                                    style={[
                                        styles.value,
                                        { fontFamily: "ITCAvantGardeCondensed" },
                                    ]}
                                >
                                    {"\u00A0"}
                                    <Text style={styles.colon}>: </Text>
                                    <Text>
                                        {data.shape_and_cut}
                                    </Text>
                                </Text>
                            </View>

                            <View style={[styles.labelRow, { top: isSingleGridLayout ? isECopy ? 2.4 : 7 : 4.5 }]}>
                                <Text style={styles.label}>Tot. Est.Weight</Text>
                                <Text style={[styles.value, { fontWeight: "bold" }]}>
                                    {"\u00A0"}
                                    <Text style={[styles.colon]}>: </Text>
                                    <Text>{data.tot_est_weight} Carat</Text>
                                </Text>
                            </View>

                            <View style={[styles.labelRow, { top: isSingleGridLayout ? isECopy ? 4 : 7 : 3.8 }]}>
                                <Text style={styles.label}>Color</Text>
                                <Text style={[styles.value,
                                { fontFamily: "Arimo" }]}>
                                    {"\u00A0"}
                                    <Text style={styles.colon}>: </Text>
                                    <Text>{data.color}</Text>
                                </Text>
                            </View>

                            <View style={[styles.labelRow, { top: isSingleGridLayout ? isECopy ? 5.3 : 7.5 : 3.4 }]}>
                                <Text style={styles.label}>Clarity</Text>
                                <Text style={[styles.value,
                                { fontFamily: "Arimo" }
                                    //  { fontWeight: "bold" }
                                ]}>
                                    {"\u00A0"}
                                    <Text style={styles.colon}>: </Text>
                                    <Text>{data.clarity}</Text>
                                </Text>
                            </View>

                            {/* Comments row */}
                            <View style={[styles.labelRow, { top: isSingleGridLayout ? isECopy ? 6.4 : 8.5 : 10.5 }]}>
                                <Text style={styles.label}>Comments</Text>
                                {/* keep a container the same width as your value column */}
                                {isSingleGridLayout && isECopy ? <View style={{ width: isECopy ? valueWidth - 50 : valueWidth }}>

                                    {/* first line: uses the existing styles.value so textIndent (first-line indent) + colon work */}
                                    <Text style={[styles.value, { fontFamily: "ITCAvantGardeCondensed" }]}>
                                        {"\u00A0"}
                                        <Text style={styles.colon}>: </Text>
                                        <Text>
                                            {DEFAULT_COMMENT_ELECTRONIC_COPY_ONE}

                                        </Text>
                                    </Text>

                                    {/* second line: only render when ; textIndent and shift it right so it starts where the value does */}
                                    {(
                                        <Text
                                            style={[
                                                styles.value,
                                                {
                                                    textIndent: 0, // no first-line indent for these explicit lines
                                                    fontFamily: "ITCAvantGardeCondensed",
                                                    marginTop: 0.1
                                                },
                                            ]}
                                        >
                                            {DEFAULT_COMMENT_ELECTRONIC_COPY_TWO}
                                        </Text>
                                    )}

                                    {/* third line: data.style, also aligned under value */}
                                    {<Text
                                        style={[
                                            styles.value,
                                            {
                                                textIndent: 0,
                                                fontFamily: "ITCAvantGardeCondensed",
                                                marginTop: -2

                                            },
                                        ]}
                                    >
                                        <Text style={styles.mainComment}>Style #{data.style_number ?? ""}</Text>
                                    </Text>}
                                </View> : <Text style={[styles.value, { fontFamily: "ITCAvantGardeCondensed" }]}>
                                    {"\u00A0"}
                                    <Text style={styles.colon}>: </Text>
                                    <Text>
                                        {/* {`${data.comment}${data.style}`} */}
                                        {DEFAULT_COMMENT}
                                        {/* {DEFAULT_COMMENT_ELECTRONIC_COPY} */}
                                        <Text style={styles.mainComment}>Style #{data.style_number ?? ""}</Text>
                                    </Text>
                                </Text>}
                            </View>
                        </View>
                        <View>
                        </View>
                    </View>
                </View>

                {/* Footer (placed at bottom because container uses space-between) */}
                <View style={styles.footer}>
                    <Text>
                        <Text
                            style={{
                                fontWeight: "bold",
                                fontFamily: "ITCAvantGardeCondensed",
                            }}
                        >Important notice:{" "}</Text>
                        <Text style={{ letterSpacing: 0.10 }}>{IMPORTANT_NOTICE}</Text>
                    </Text>
                    <Text
                        style={{
                            fontWeight: "bold",
                            marginTop: 1,
                            fontFamily: "ITCAvantGardeCondensed",
                        }}
                    >
                        {IMPORTANT_NOTICE_BOLD}
                    </Text>
                </View>

                {!isSingleGridLayout  && <View style={styles.bottomDate}>
                    <Text style={{ fontSize: FIXED_FONTS.bottomDate }}>
                        {BOTTOM_DATE}
                    </Text>
                </View>}
            </View >
        </View>
    )
}
