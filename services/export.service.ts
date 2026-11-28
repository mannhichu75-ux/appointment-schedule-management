import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import puppeteer from "puppeteer";

/**
 * medicalRecordPdf.service.js
 *
 * - load/compile Handlebars template from templates/prescriptions.html
 * - register helpers: splitLines, prescriptionsTable, formatDate, formatDateTime, displayName
 * - expose functions:
 *    - renderRecordHtml({ record, lookupMap, options }) => html string
 *    - generateRecordPdf({ record, lookupMap, options }) => Buffer (PDF)
 *
 * options:
 *  - templatePath (optional)
 *  - hospitalLogo, hospitalName, hospitalAddress
 *  - puppeteerArgs (optional)
 */

const DEFAULT_TEMPLATE = path.resolve(process.cwd(), "bucket", "prescriptions.html");

let compiledTemplate = null;
let helpersRegisteredForMapKey = new Set();

function loadTemplate(templatePath = DEFAULT_TEMPLATE) {
    if (compiledTemplate && compiledTemplate.__templatePath === templatePath) return compiledTemplate;
    const src = fs.readFileSync(templatePath, "utf8");
    const tpl = Handlebars.compile(src);
    tpl.__templatePath = templatePath;
    compiledTemplate = tpl;
    return tpl;
}

function escapeHtml(unsafe) {
    if (unsafe == null) return "";
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Register helpers. We register once per process, but displayName uses lookupMap passed at render time.
 * To keep displayName flexible we register a wrapper that reads from a runtime-provided map stored on the template function.
 */
function registerHelpersOnce() {
    if (registerHelpersOnce._done) return;
    registerHelpersOnce._done = true;

    Handlebars.registerHelper("splitLines", (text) => {
        if (!text) return "";
        const lines = String(text).split(/\r\n|\n|\r/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return "";
        const items = lines.map(l => `<li>${escapeHtml(l)}</li>`).join("");
        return new Handlebars.SafeString(`<ul class="plist">${items}</ul>`);
    });

    Handlebars.registerHelper("formatDate", (d) => {
        if (!d) return "-";
        const dt = new Date(d);
        return dt.toLocaleDateString();
    });

    Handlebars.registerHelper("formatDateTime", (d) => {
        const dt = d ? new Date(d) : new Date();
        return dt.toLocaleString();
    });

    // prescriptionsTable: parse lines into rows and render table
    Handlebars.registerHelper("prescriptionsTable", (text) => {
        if (!text) return "";
        const lines = String(text).split(/\r\n|\n|\r/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return "";

        const rows = lines.map((line, idx) => {
            let name = line;
            let detail = "";
            const sepMatch = line.match(/(.*?)\s*(?:\s-\s|\s\|\s|\s:\s)(.*)/);
            if (sepMatch) {
                name = sepMatch[1].trim();
                detail = sepMatch[2].trim();
            }
            const safeName = escapeHtml(name);
            const safeDetail = detail ? escapeHtml(detail) : "";
            return `<tr>
        <td class="rx-no">${idx + 1}</td>
        <td>${safeName}${safeDetail ? ` <div class="small" style="color:#555; margin-top:6px;">${safeDetail}</div>` : ""}</td>
      </tr>`;
        }).join("");

        const tableHtml = `
      <table class="rx-table" role="table" aria-label="Đơn thuốc">
        <thead>
          <tr><th class="rx-no">#</th><th>Thuốc / Liều lượng & Ghi chú</th></tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
        return new Handlebars.SafeString(tableHtml);
    });

    // displayName will be provided at render time via a runtimeMap object injected to template context;
    // the template will call displayName with ID (string) or object. We provide a helper that checks for objects first.
    Handlebars.registerHelper("displayName", (maybeIdOrObj, options) => {
        if (!maybeIdOrObj) return "-";
        if (typeof maybeIdOrObj === "object") {
            return Handlebars.escapeExpression(maybeIdOrObj.fullname || maybeIdOrObj.name || String(maybeIdOrObj._id || maybeIdOrObj.id || "-"));
        }
        // When rendering, the caller should include runtimeLookupMap in template context under "__lookupMap"
        const lookupMap = (options && options.data && options.data.root && options.data.root.__lookupMap) || {};
        const name = lookupMap[String(maybeIdOrObj)];
        return Handlebars.escapeExpression(name || String(maybeIdOrObj));
    });
}

/**
 * Render HTML from record
 * @param {Object} params
 *  - record: object
 *  - lookupMap: { id: fullname }
 *  - options: { templatePath, hospitalName, hospitalLogo, hospitalAddress }
 * @returns html string
 */
export function renderRecordHtml({ record, lookupMap = {}, options = {} } = {}) {
    registerHelpersOnce();
    const tpl = loadTemplate(options.templatePath);
    // Build template context; include lookup map under __lookupMap so helper displayName can access via options.data.root.__lookupMap
    const context = {
        record,
        hospitalLogo: options.hospitalLogo,
        hospitalName: options.hospitalName,
        hospitalAddress: options.hospitalAddress,
        doctorName: options.doctorName,
        now: options.now || new Date(),
        __lookupMap: lookupMap,
    };
    // compile/render
    return tpl(context);
}

/**
 * Generate PDF Buffer via Puppeteer
 * @param {Object} params
 *  - record, lookupMap, options: { templatePath, puppeteerArgs, puppeteerExecutablePath, hospitalName, hospitalLogo, hospitalAddress }
 * @returns Buffer
 */
export async function generateRecordPdf({ record, lookupMap = {}, options = {} } = {}) {
    registerHelpersOnce();
    const tpl = loadTemplate(options.templatePath);
    const context = {
        record,
        hospitalLogo: options.hospitalLogo,
        hospitalName: options.hospitalName,
        hospitalAddress: options.hospitalAddress,
        doctorName: options.doctorName,
        now: options.now || new Date(),
        __lookupMap: lookupMap,
    };
    const html = tpl(context);

    // Launch puppeteer
    const defaultArgs = ["--no-sandbox", "--disable-setuid-sandbox"];
    const puppeteerArgs = options.puppeteerArgs || defaultArgs;
    const launchOpts = {
        args: puppeteerArgs,
    };
    if (options.puppeteerExecutablePath) {
        launchOpts.executablePath = options.puppeteerExecutablePath;
    }

    const browser = await puppeteer.launch(launchOpts);
    try {
        const page = await browser.newPage();

        // set content and wait
        await page.setContent(html, { waitUntil: "networkidle0" });

        // generate PDF
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "18mm", bottom: "18mm", left: "12mm", right: "12mm" },
        });

        return pdfBuffer;
    } finally {
        await browser.close();
    }
}