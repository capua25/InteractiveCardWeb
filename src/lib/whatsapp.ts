const WHATSAPP_BASE_URL = "https://wa.me/";

export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) {
    throw new Error(`Número de WhatsApp inválido: "${phone}"`);
  }
  return `${WHATSAPP_BASE_URL}${digits}?text=${encodeURIComponent(message)}`;
}
