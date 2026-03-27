import fs from "fs";
import path from "path";

async function testExtract() {
  const url = "http://localhost:3000/api/invoice/parse";
  const pdfPath = path.join(process.cwd(), "Invoice48289 with sales tax.pdf");
  const pdfBuffer = fs.readFileSync(pdfPath);

  const boundary = "xxBOUNDARYxx";
  let body = Buffer.alloc(0);
  body = Buffer.concat([
    body,
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="Invoice.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
    ),
    pdfBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body: body as any,
  });

  const data = await res.json();
  if (data.invoice) {
    console.log(
      "Service Address Meta:",
      data.invoice.sourceMetadata?.serviceAddress,
    );
    const amounts = data.invoice.lineItems.map(
      (i: any) => i.amountMetadata?.rect?.y,
    );
    console.log("Line Item Ys:", amounts);
  } else {
    console.log("Error:", data);
  }
}

testExtract().catch(console.error);
