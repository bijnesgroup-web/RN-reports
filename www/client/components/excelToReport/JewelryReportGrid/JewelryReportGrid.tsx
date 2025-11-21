'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    PDFViewer as RPDPDFViewer,
    Document,
    Page,
    StyleSheet,
    View,
    Font,
    Image,
    pdf,
} from "@react-pdf/renderer";
import ReportPDF, { ReportData } from "../ReportPDF";
import JSZip from "jszip";
import QRCode from "qrcode";

type Props = {
    data: ReportData[];
    pageSize?: "A4" | "LETTER" | [number, number];
    viewerWidth?: string | number;
    viewerHeight?: string | number;
    cols?: number;
    rows?: number;
};

function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

// Simple global cache to avoid regenerating same QR many times across component re-mounts
const qrCache = new Map<string, string | null>();

// Generate a QR data URL (PNG by default) for a report number (uses caching)
async function genQrDataUrlForReport(reportNo?: string | number | null) {
    if (!reportNo) return null;
    const key = String(reportNo);
    if (qrCache.has(key)) return qrCache.get(key) ?? null;

    try {
        // prefer configured base; otherwise use current origin (client)
        const base = (process.env.NEXT_PUBLIC_BASE_URL ?? (typeof window !== "undefined" ? window.location.origin : ""));
        const verifyUrl = `${base}/Verify-Your-Report?r=${encodeURIComponent(key)}`;

        // Options: margin 0 and high width to get good resolution
        const opts = { margin: 0, width: 800 };
        const url = await QRCode.toDataURL(verifyUrl, opts);
        qrCache.set(key, url);
        return url;
    } catch (err) {
        console.error("QR generation error:", err);
        qrCache.set(key, null);
        return null;
    }
}

const iBMPlexSansBold = "/fonts/IBMPlexSans-Bold.ttf";
const iTCAvantGardeCondensedNormal = "/fonts/ITC-CE-Book.otf";
const ITCAvantGardeStdBold = "/fonts/ITCAvantGardeStd-Bold.ttf";
const CanvaSansRegular = "/fonts/CanvaSans-Regular.otf";
const ArimoBold = "/fonts/Arimo-Bold.ttf";

Font.register({
    family: "IBMPlexSans",
    fonts: [{ src: iBMPlexSansBold, fontWeight: "bold" }],
});

Font.register({
    family: "ITCAvantGardeCondensed",
    fonts: [
        { src: iTCAvantGardeCondensedNormal, fontWeight: "normal" },
        { src: ITCAvantGardeStdBold, fontWeight: "bold" },
    ],
});

Font.register({
    family: "CanvaSans",
    fonts: [
        { src: CanvaSansRegular, fontWeight: "normal" },
    ],
});
Font.register({
    family: "Arimo",
    fonts: [
        { src: ArimoBold, fontWeight: "bold" },
    ],
});

export default function JewelryReportGrid({
    data,
    pageSize = "A4",
    viewerWidth = "100%",
    viewerHeight = "100vh",
    cols = 3,
    rows = 3,
}: Props) {
    // === IMAGE ORIGINAL SIZE & DPI ===
    // const imgPx = { w: 2484, h: 3512 }; // right-pixels 
    const imgPx = { w: 2480, h: 3508 }; // in psd file-pixels

    const dpi = 300;


    // Before Take as : { width: 595.2, height: 841.8 },
    // Now take as : { width: 595.2, height: 841.9 },

    // convert px -> points (1pt = 1/72 inch)
    const pageWidthPts = (imgPx.w / dpi) * 72; // 595.2
    const pageHeightPts = (imgPx.h / dpi) * 72; // 841.92

    // Use image dimensions as page dimensions so page == image size (1:1)
    const pageDims = { width: pageWidthPts, height: pageHeightPts };

    // grid math
    const itemsPerPage = cols * rows;
    const pages = chunk(data, itemsPerPage);

    // border/stroke
    // If you still see artifacts, try setting BORDER_WIDTH = 1 (integer pt)
    const BORDER_WIDTH = 0.3; // points (hairline). Can try 1 for crisper integer alignment
    const BORDER_COLOR = "black";

    // compute total border thickness that will occupy page space:
    // each column contributes a left border and the grid contributes a final right border:
    // total horizontal border thickness = (cols * leftBorder) + gridRightBorder = (cols + 1) * BORDER_WIDTH
    // similarly for vertical: (rows + 1) * BORDER_WIDTH
    const totalBorderX = (cols + 1) * BORDER_WIDTH;
    const totalBorderY = (rows + 1) * BORDER_WIDTH;

    // now compute cell sizes **after** subtracting border space
    const cellWidth = (pageDims.width - totalBorderX) / cols;
    const cellHeight = (pageDims.height - totalBorderY) / rows;

    // Helper to stabilize floats (reduce tiny rounding errors)
    const r = (v: number, decimals = 3) => parseFloat(v.toFixed(decimals));

    // Precompute line positions (single lines across full page)
    // Vertical lines at x = i * (cellWidth + BORDER_WIDTH) for i = 0..cols
    const verticalXs = Array.from({ length: cols + 1 }, (_, i) =>
        r(i * (cellWidth + BORDER_WIDTH))
    );
    // Horizontal lines at y = i * (cellHeight + BORDER_WIDTH) for i = 0..rows
    const horizontalYs = Array.from({ length: rows + 1 }, (_, i) =>
        r(i * (cellHeight + BORDER_WIDTH))
    );

    const styles = StyleSheet.create({
        page: {
            padding: 0,
            margin: 0,
            position: "relative",
        },
        backgroundImage: {
            position: "absolute",
            top: 0,
            left: 0,
            width: pageDims.width,
            height: pageDims.height,
        },
        grid: {
            position: "absolute",
            top: 0,
            left: 0,
            width: pageDims.width,
            height: pageDims.height,
            flexDirection: "row",
            flexWrap: "wrap",
        },
        cell: {
            width: cellWidth,
            height: cellHeight,
            overflow: "hidden",
        },
        rotateWrapper: {
            width: cellWidth,
            height: cellHeight,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
        },
        rotatedContent: {
            width: cellHeight,
            height: cellWidth,
        },
        // styles for the single-line views (we set them inline with computed coords)
        lineCommon: {
            position: "absolute",
            backgroundColor: BORDER_COLOR,
        },
    });

    // ---------------------------
    // Prepared data with qrDataUrl attached (cloned items)
    // ---------------------------
    const [preparedData, setPreparedData] = useState<ReportData[] | null>(null);
    const isPreparingRef = useRef(false);

    // Concurrency for QR generation. Adjust to taste (2..8)
    const QR_CONCURRENCY = 8;

    // When incoming `data` changes, generate QR data URLs (concurrency-limited)
    useEffect(() => {
        let mounted = true;
        async function prepareAll() {
            if (!data || data.length === 0) {
                if (mounted) setPreparedData([]);
                return;
            }
            // avoid duplicate concurrent runs
            if (isPreparingRef.current) return;
            isPreparingRef.current = true;

            // shallow clones to avoid mutating caller's objects
            const out = data.map((item) => ({ ...(item as any) }));

            // concurrency-limited workers
            let idx = 0;
            const workers = Array.from({ length: QR_CONCURRENCY }, async () => {
                while (true) {
                    const i = idx++;
                    if (i >= out.length) break;
                    const it = out[i] as any;
                    try {
                        // skip if already provided
                        if (it.qrDataUrl) continue;
                        it.qrDataUrl = await genQrDataUrlForReport(it.report_no);
                    } catch (err) {
                        it.qrDataUrl = null;
                    }
                }
            });

            try {
                await Promise.all(workers);
                if (mounted) setPreparedData(out);
            } catch (err) {
                console.error("Error preparing QR data:", err);
                if (mounted) setPreparedData(out); // still set whatever we have
            } finally {
                isPreparingRef.current = false;
            }
        }

        void prepareAll();
        return () => {
            mounted = false;
        };
    }, [data]);

    // ---------------------------
    // Document builders use preparedData if available, otherwise fall back to original data
    // ---------------------------
    const dataSource = preparedData ?? data;
    const pagesUsingPrepared = chunk(dataSource, itemsPerPage);
    // Build the Document once for the viewer (all pages)
    const renderDocument = useCallback(() => {
        return (
            <Document title={`${data?.[0]?.report_no ?? "batch"}`}>
                {pagesUsingPrepared.map((pageItems, pIdx) => (
                    <Page key={pIdx} size={[pageDims.width, pageDims.height]} style={styles.page}>
                        {/* <Image src="/pdfBg.jpg" style={styles.backgroundImage} /> */}

                        {/* overlay grid container (no per-cell borders) */}
                        <View style={styles.grid}>
                            {pageItems.map((item, idx) => (
                                <View key={idx} style={styles.cell}>
                                    <View style={styles.rotateWrapper}>
                                        <View style={styles.rotatedContent}>
                                            {/*
                        ReportPDF receives the swapped dimensions because the content is rotated
                        - contentWidth -> cellHeight
                        - contentHeight -> cellWidth

                        We deliberately do NOT change ReportPDF's internal CSS/styles — this wrapper
                        only provides sizing + rotation.
                      */}
                                            <ReportPDF
                                                data={item}
                                                isSingleGridLayout={false}
                                                contentWidth={cellHeight}
                                                contentHeight={cellWidth}
                                                // valueWidth={cellWidth + 19.7}
                                                valueWidth={cellWidth + 26.3}
                                            />
                                        </View>
                                    </View>
                                </View>
                            ))}

                            {pageItems.length < itemsPerPage &&
                                Array.from({ length: itemsPerPage - pageItems.length }).map((_, i) => (
                                    <View key={`empty-${i}`} style={styles.cell} />
                                ))}
                            {/* Draw vertical lines (single Views) */}
                            {verticalXs.map((x, i) => (
                                <View
                                    key={`v-${i}`}
                                    style={[
                                        styles.lineCommon,
                                        { left: x, top: 0, width: BORDER_WIDTH, height: pageDims.height },
                                    ]}
                                />
                            ))}

                            {/* Draw horizontal lines (single Views) */}
                            {horizontalYs.map((y, i) => (
                                <View
                                    key={`h-${i}`}
                                    style={[
                                        styles.lineCommon,
                                        { left: 0, top: y, width: pageDims.width, height: BORDER_WIDTH },
                                    ]}
                                />
                            ))}
                        </View>
                    </Page>
                ))}
            </Document>
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preparedData, data, cols, rows, pageDims.width, pageDims.height, cellHeight, cellWidth]);

    // Helper: create a Document that contains exactly the provided pageItems as one page.
    const makeDocumentForPage = useCallback(
        (pageItems: ReportData[], pageIndex: number) => {
            return (
                <Document key={pageIndex} title={`Jewelry Report`}>
                    <Page size={[pageDims.width, pageDims.height]} style={styles.page}>
                        {/* <Image src="/pdfBg.jpg" style={styles.backgroundImage} /> */}

                        <View style={styles.grid}>
                            {pageItems.map((item, idx) => (
                                <View key={idx} style={styles.cell}>
                                    <View style={styles.rotateWrapper}>
                                        <View style={styles.rotatedContent}>
                                            <ReportPDF
                                                isSingleGridLayout={false}
                                                data={item}
                                                contentWidth={cellHeight}
                                                contentHeight={cellWidth}
                                                valueWidth={cellWidth + 26.3}
                                            />
                                        </View>
                                    </View>
                                </View>
                            ))}

                            {pageItems.length < itemsPerPage &&
                                Array.from({ length: itemsPerPage - pageItems.length }).map((_, i) => (
                                    <View key={`empty-${i}`} style={styles.cell} />
                                ))}

                            {verticalXs.map((x, i) => (
                                <View
                                    key={`v-${i}`}
                                    style={[
                                        styles.lineCommon,
                                        { left: x, top: 0, width: BORDER_WIDTH, height: pageDims.height },
                                    ]}
                                />
                            ))}

                            {horizontalYs.map((y, i) => (
                                <View
                                    key={`h-${i}`}
                                    style={[
                                        styles.lineCommon,
                                        { left: 0, top: y, width: pageDims.width, height: BORDER_WIDTH },
                                    ]}
                                />
                            ))}
                        </View>
                    </Page>
                </Document>
            );
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [cellHeight, cellWidth, cols, data, horizontalYs, pageDims.height, pageDims.width, styles, verticalXs, rows]
    );

    // File name root
    const fileNameRoot = useMemo(() => {
        const rn = data?.[0]?.report_no ?? "batch";
        return `Jewelry-Report-${rn}-${cols}x${rows}`;
    }, [data, cols, rows]);

    // Generate and download PDF(s)
    const handleDownloadAll = useCallback(async () => {
        try {
            // Ensure we have preparedData; if not ready, wait for generation (will trigger prepare useEffect)
            if (!preparedData) {
                // wait up to a reasonable amount; you can remove or tune timeout logic as needed
                const waitStart = Date.now();
                while (!preparedData && Date.now() - waitStart < 30000) {
                    // small delay
                    // eslint-disable-next-line no-await-in-loop
                    await new Promise((res) => setTimeout(res, 200));
                }
            }

            const source = preparedData ?? data;
            const perPageChunks = chunk(source, itemsPerPage);

            if (perPageChunks.length === 0) return;

            const blobResults: { blob: Blob; idx: number }[] = [];

            // Generate sequentially to reduce memory pressure and allow progress updates
            for (let i = 0; i < perPageChunks.length; i++) {
                const pageItems = perPageChunks[i];
                const doc = makeDocumentForPage(pageItems, i);
                const asPdf = pdf(doc);
                const blob = await asPdf.toBlob();
                blobResults.push({ blob, idx: i });
            }

            if (blobResults.length === 1) {
                const { blob } = blobResults[0];
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${fileNameRoot}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                return;
            }

            const zip = new JSZip();
            blobResults.forEach(({ blob, idx }) => {
                const partName = `${fileNameRoot}-part-${idx + 1}.pdf`;
                zip.file(partName, blob);
            });

            const zipBlob = await zip.generateAsync({ type: "blob" });
            const zipUrl = URL.createObjectURL(zipBlob);
            const a = document.createElement("a");
            a.href = zipUrl;
            a.download = `${fileNameRoot}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(zipUrl);
        } catch (err) {
            console.error("Error generating PDF(s):", err);
        }
    }, [preparedData, data, fileNameRoot, itemsPerPage, makeDocumentForPage]);
    // Render both the viewer and a download button
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: 8 }}>
                <button
                    onClick={handleDownloadAll}
                    style={{
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid #ccc",
                        background: "#fff",
                        cursor: "pointer",
                    }}
                >
                    Download PDF{pagesUsingPrepared.length > 1 ? "s" : ""}
                </button>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
                <RPDPDFViewer style={{ width: viewerWidth, height: viewerHeight }}>
                    {renderDocument()}
                </RPDPDFViewer>
            </div>
        </div>
    );
}
