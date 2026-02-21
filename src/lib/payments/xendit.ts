const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY!;
const XENDIT_BASE_URL = "https://api.xendit.co";

interface CreateInvoiceParams {
  externalId: string;
  amount: number;
  payerEmail: string;
  description: string;
  successRedirectUrl: string;
  failureRedirectUrl: string;
  customerName: string;
  customerPhone?: string;
}

interface XenditInvoice {
  id: string;
  external_id: string;
  invoice_url: string;
  status: string;
  amount: number;
  expiry_date: string;
}

/**
 * Create a Xendit invoice for payment.
 */
export async function createXenditInvoice(
  params: CreateInvoiceParams
): Promise<XenditInvoice> {
  const response = await fetch(`${XENDIT_BASE_URL}/v2/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(XENDIT_SECRET_KEY + ":").toString("base64")}`,
    },
    body: JSON.stringify({
      external_id: params.externalId,
      amount: params.amount,
      payer_email: params.payerEmail,
      description: params.description,
      success_redirect_url: params.successRedirectUrl,
      failure_redirect_url: params.failureRedirectUrl,
      currency: "IDR",
      customer: {
        given_names: params.customerName,
        email: params.payerEmail,
        mobile_number: params.customerPhone,
      },
      payment_methods: ["QRIS", "CREDIT_CARD", "BCA", "BNI", "BRI", "MANDIRI", "PERMATA"],
      invoice_duration: 86400, // 24 hours
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Xendit invoice creation failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Verify Xendit webhook callback token.
 */
export function verifyWebhookToken(token: string): boolean {
  return token === process.env.XENDIT_WEBHOOK_TOKEN;
}

/**
 * Map Xendit payment channel to our payment method enum.
 */
export function mapXenditPaymentMethod(
  channel: string
): "qris" | "credit_card" | "bank_transfer" {
  if (channel === "QRIS" || channel === "QR_CODE") return "qris";
  if (channel === "CREDIT_CARD") return "credit_card";
  return "bank_transfer";
}
