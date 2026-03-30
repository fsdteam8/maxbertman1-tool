import fs from "fs";
import path from "path";

async function testWebhook() {
  const url = "http://localhost:3001/api/email/inbound";
  const pdfPath = path.join(process.cwd(), "Invoice48166 (2) (1) (1).pdf");

  if (!fs.existsSync(pdfPath)) {
    console.error(`Error: PDF file not found at ${pdfPath}`);
    process.exit(1);
  }

  const pdfBuffer = fs.readFileSync(pdfPath);

  // Create Boundary
  const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";

  // Construct Multipart Body
  let body = Buffer.alloc(0);

  const addField = (name: string, value: string) => {
    body = Buffer.concat([
      body,
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="${name}"\r\n\r\n`),
      Buffer.from(`${value}\r\n`),
    ]);
  };

  const addFile = (
    name: string,
    filename: string,
    contentType: string,
    content: Buffer,
  ) => {
    body = Buffer.concat([
      body,
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(
        `Content-Disposition: form-data; name="${name}"; filename="${filename}"\r\n`,
      ),
      Buffer.from(`Content-Type: ${contentType}\r\n\r\n`),
      content,
      Buffer.from("\r\n"),
    ]);
  };

  addField("from", "Test User <jarifbdcalling@gmail.com>");
  addField("to", "invoice@parse.system4sneai.com");
  addField("subject", "Invoice for Processing - PO# 98765");
  addField(
    "text",
    "Please find the attached invoice. change PO # to 91737459936384",
  );
  addField("attachments", "1");
  addFile("attachment1", "Invoice48166.pdf", "application/pdf", pdfBuffer);

  body = Buffer.concat([body, Buffer.from(`--${boundary}--\r\n`)]);

  console.log(`Sending request to ${url}...`);
  console.log(`PDF size: ${pdfBuffer.length} bytes`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: body as any,
    });

    const responseText = await response.text();
    console.log("Response Status:", response.status);

    try {
      const result = JSON.parse(responseText);
      console.log("Response Body:", JSON.stringify(result, null, 2));

      if (result.success) {
        console.log("\n✅ SUCCESS: Inbound webhook processed correctly!");
      } else {
        console.error("\n❌ FAILURE: Webhook processing failed.");
      }
    } catch {
      console.log(
        "Response (raw text, first 500 chars):",
        responseText.substring(0, 500),
      );
      console.error("\n❌ FAILURE: Server did not return JSON.");
    }
  } catch (error) {
    console.error("ERROR: Failed to connect to local server:", error);
  }
}

testWebhook();
